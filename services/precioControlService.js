// services/precioControlService.js
//
// Control de precios de cartas (Configuración → Opciones generales): con el
// control activo, SOLO el usuario designado (uno solo, administrador) puede
// crear/editar precios de platillos del menú y del día. Sin control activo,
// cualquiera con acceso al menú puede hacerlo (comportamiento anterior).
//
// Reglas fail-closed:
// - Activar exige un usuario designado válido (existe, activo y administrador).
// - No se puede retirar al designado mientras el control está activo.
// - Si el designado se desactiva o pierde el rol, nadie puede guardar precios
//   hasta que un administrador corrija la configuración (cambio auditado).
'use strict';

const pool = require('../config/db');
const SettingService = require('./settingService');

const CLAVE_ACTIVO = 'precio_control_activo';
const CLAVE_USUARIO = 'precio_control_usuario_id';
const ROLES_DESIGNABLES = ['superadministrador', 'administrador'];

const DESCRIPCION_ACTIVO = 'Control de precios de cartas: solo el usuario designado puede modificar precios';
const DESCRIPCION_USUARIO = 'Usuario designado para modificar precios de cartas (control de precios)';

function errorValidacion(mensaje) {
    const error = new Error(mensaje);
    error.httpStatus = 400;
    return error;
}

function errorInterno(mensaje) {
    const error = new Error(mensaje);
    error.httpStatus = 500;
    return error;
}

function nombreCompleto(u) {
    if (!u) return '';
    const completo = `${u.nombre || ''} ${u.apellidos || ''}`.trim();
    return completo || u.usuario || `Usuario #${u.id}`;
}

function esActivo(valor) {
    return valor === true || valor === 1 || valor === '1' || valor === 'true';
}

// null = retirar; entero > 0 = designar; otra cosa = error de validación.
function parsearIdDesignado(valor) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    if (texto === '' || texto === '0') return null;
    const n = parseInt(texto, 10);
    if (!Number.isInteger(n) || n <= 0) {
        throw errorValidacion('El usuario designado no es válido.');
    }
    return n;
}

async function controlActivo() {
    try {
        return esActivo(await SettingService.get(CLAVE_ACTIVO, false));
    } catch (error) {
        console.error('Error al leer control de precios:', error);
        return false;
    }
}

async function leerUsuarioIdGuardado() {
    try {
        const crudo = await SettingService.get(CLAVE_USUARIO, '');
        if (crudo === null || crudo === undefined) return null;
        const n = parseInt(crudo, 10);
        return Number.isInteger(n) && n > 0 ? n : null;
    } catch (error) {
        console.error('Error al leer usuario designado de precios:', error);
        return null;
    }
}

async function buscarDesignable(id) {
    if (!pool || !id) return null;
    const [filas] = await pool.query(
        'SELECT id, usuario, nombre, apellidos, rol, activo FROM usuarios WHERE id = ? LIMIT 1',
        [id]
    );
    const u = filas && filas[0];
    if (!u) return null;
    return {
        id: u.id,
        usuario: u.usuario,
        nombre: nombreCompleto(u),
        rol: u.rol,
        activo: Number(u.activo) === 1
    };
}

// { activo, usuarioId (guardado), usuario (validado o null) }. Nunca lanza.
async function obtenerConfiguracion() {
    const activo = await controlActivo();
    const usuarioId = await leerUsuarioIdGuardado();
    let usuario = null;
    if (usuarioId) {
        try {
            const candidato = await buscarDesignable(usuarioId);
            if (candidato && candidato.activo && ROLES_DESIGNABLES.includes(String(candidato.rol))) {
                usuario = { id: candidato.id, usuario: candidato.usuario, nombre: candidato.nombre, rol: candidato.rol };
            }
        } catch (error) {
            console.error('Error al resolver usuario designado de precios:', error);
        }
    }
    return { activo, usuarioId, usuario };
}

async function guardarActivo(activoDeseado) {
    const nuevo = esActivo(activoDeseado);
    const cfg = await obtenerConfiguracion();
    if (nuevo === cfg.activo) {
        return { anterior: cfg.activo, nuevo, sinCambios: true };
    }
    if (nuevo && !cfg.usuario) {
        throw errorValidacion('Para activar el control de precios primero designe al usuario autorizado (debe ser un administrador activo).');
    }
    const ok = await SettingService.set(CLAVE_ACTIVO, nuevo ? '1' : '0', DESCRIPCION_ACTIVO, 'general', 'boolean');
    if (!ok) {
        throw errorInterno('No se pudo guardar el control de precios. Inténtelo de nuevo.');
    }
    return { anterior: cfg.activo, nuevo, sinCambios: false };
}

async function guardarUsuarioDesignado(usuarioIdDeseado) {
    const nuevo = parsearIdDesignado(usuarioIdDeseado);
    const cfg = await obtenerConfiguracion();
    if (nuevo === cfg.usuarioId) {
        return { anterior: cfg.usuarioId, nuevo, sinCambios: true, usuario: cfg.usuario };
    }
    if (nuevo === null && cfg.activo) {
        throw errorValidacion('No puede retirar al usuario designado mientras el control está activo: desactívelo primero.');
    }
    let usuario = null;
    if (nuevo !== null) {
        let candidato = null;
        try {
            candidato = await buscarDesignable(nuevo);
        } catch (error) {
            console.error('Error al validar usuario designado de precios:', error);
            throw errorInterno('No se pudo verificar al usuario indicado. Inténtelo de nuevo.');
        }
        if (!candidato) {
            throw errorValidacion('El usuario indicado no existe.');
        }
        if (!candidato.activo) {
            throw errorValidacion(`"${candidato.nombre}" no está activo: solo un usuario activo puede designarse.`);
        }
        if (!ROLES_DESIGNABLES.includes(String(candidato.rol))) {
            throw errorValidacion(`"${candidato.nombre}" tiene rol ${candidato.rol}: solo un superadministrador o administrador puede designarse (son los únicos que editan el menú).`);
        }
        usuario = { id: candidato.id, usuario: candidato.usuario, nombre: candidato.nombre, rol: candidato.rol };
    }
    const ok = await SettingService.set(CLAVE_USUARIO, nuevo === null ? '' : String(nuevo), DESCRIPCION_USUARIO, 'general', 'number');
    if (!ok) {
        throw errorInterno('No se pudo guardar al usuario designado. Inténtelo de nuevo.');
    }
    return { anterior: cfg.usuarioId, nuevo, sinCambios: false, usuario };
}

// ¿Puede este usuario guardar precios de cartas ahora mismo?
async function puedeModificarPrecios(usuarioId) {
    const cfg = await obtenerConfiguracion();
    if (!cfg.activo) {
        return { permitido: true, controlActivo: false, usuarioControl: null, mensaje: null };
    }
    if (!cfg.usuario) {
        return {
            permitido: false,
            controlActivo: true,
            usuarioControl: null,
            mensaje: 'El control de precios está activo pero no hay un usuario designado válido. Revise Configuración → Opciones generales.'
        };
    }
    if (usuarioId !== null && usuarioId !== undefined && Number(usuarioId) === Number(cfg.usuario.id)) {
        return { permitido: true, controlActivo: true, usuarioControl: cfg.usuario, mensaje: null };
    }
    return {
        permitido: false,
        controlActivo: true,
        usuarioControl: cfg.usuario,
        mensaje: `Solo ${cfg.usuario.nombre} está autorizado a modificar los precios de las cartas (control de precios activo).`
    };
}

module.exports = {
    CLAVE_ACTIVO,
    CLAVE_USUARIO,
    ROLES_DESIGNABLES,
    controlActivo,
    obtenerConfiguracion,
    guardarActivo,
    guardarUsuarioDesignado,
    puedeModificarPrecios
};
