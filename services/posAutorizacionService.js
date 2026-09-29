// services/posAutorizacionService.js
// Reglas de autorización del circuito de servicio (POS), gobernadas por las
// "Opciones generales" de Configuración:
//   1. Quién puede TOMAR órdenes (agregar productos / abrir mesas con orden):
//      - 'todos' (por defecto): capitanes y dependientes.
//      - 'solo_capitanes': únicamente los capitanes (los dependientes solo
//        entregan y consultan la pre-cuenta; el cobro también es exclusivo
//        de los capitanes en este modo).
//      Los administradores siempre pueden operar el POS.
//   2. CORTESÍAS (cobro al 100% gratis): requieren autorización de un
//      supervisor (roles configurables, por defecto administradores y
//      capitán) más un motivo obligatorio que queda registrado en el pedido.
'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const SettingService = require('./settingService');

const MODO_TOMA_TODOS = 'todos';
const MODO_TOMA_SOLO_CAPITANES = 'solo_capitanes';

const ROLES_ADMIN = ['superadministrador', 'administrador'];
const ROLES_AUTORIZAN_CORTESIA_POR_DEFECTO = ['superadministrador', 'administrador', 'capitan'];

function normalizarRol(rol) {
    return String(rol || '').trim().toLowerCase();
}

function normalizarModoToma(valor) {
    return String(valor || '').trim().toLowerCase() === MODO_TOMA_SOLO_CAPITANES
        ? MODO_TOMA_SOLO_CAPITANES
        : MODO_TOMA_TODOS;
}

function parsearListaRoles(valor, porDefecto) {
    if (Array.isArray(valor)) {
        const lista = valor.map(normalizarRol).filter(Boolean);
        return lista.length ? lista : [...porDefecto];
    }
    if (typeof valor === 'string' && valor.trim()) {
        const lista = valor.split(',').map(normalizarRol).filter(Boolean);
        return lista.length ? lista : [...porDefecto];
    }
    return [...porDefecto];
}

const PosAutorizacionService = {

    MODO_TOMA_TODOS,
    MODO_TOMA_SOLO_CAPITANES,

    /**
     * Modo vigente de toma de órdenes ('todos' | 'solo_capitanes').
     * Cualquier valor desconocido (o base no disponible) cae a 'todos'.
     */
    async modoTomaOrdenes() {
        try {
            const valor = await SettingService.get('pos_quien_toma_ordenes', MODO_TOMA_TODOS);
            return normalizarModoToma(valor);
        } catch (_) {
            return MODO_TOMA_TODOS;
        }
    },

    /**
     * ¿El rol indicado puede TOMAR órdenes (abrir mesas con orden y agregar
     * productos) según la configuración general?
     */
    async puedeTomarOrdenes(rol) {
        const rolNormalizado = normalizarRol(rol);
        if (ROLES_ADMIN.includes(rolNormalizado)) return true;
        const modo = await this.modoTomaOrdenes();
        if (modo === MODO_TOMA_SOLO_CAPITANES) {
            return rolNormalizado === 'capitan';
        }
        return rolNormalizado === 'capitan'
            || rolNormalizado === 'dependiente'
            || rolNormalizado === 'dependiente-pos';
    },

    /**
     * ¿El rol indicado puede COBRAR órdenes? En modo 'solo_capitanes' el
     * cobro también queda reservado a los capitanes (los dependientes solo
     * entregan y consultan la pre-cuenta). Los administradores y el cajero
     * siempre pueden cobrar.
     */
    async puedeCobrar(rol) {
        const rolNormalizado = normalizarRol(rol);
        if (ROLES_ADMIN.includes(rolNormalizado)) return true;
        if (rolNormalizado === 'cajero') return true;
        const modo = await this.modoTomaOrdenes();
        if (modo === MODO_TOMA_SOLO_CAPITANES) {
            return rolNormalizado === 'capitan';
        }
        return rolNormalizado === 'capitan'
            || rolNormalizado === 'dependiente'
            || rolNormalizado === 'dependiente-pos';
    },

    /**
     * ¿Las cortesías exigen autorización de un supervisor? (por defecto SÍ).
     */
    async cortesiaRequiereAutorizacion() {
        try {
            const valor = await SettingService.get('cortesia_requiere_autorizacion', true);
            if (typeof valor === 'boolean') return valor;
            if (typeof valor === 'number') return valor === 1;
            return String(valor).trim().toLowerCase() === '1'
                || String(valor).trim().toLowerCase() === 'true';
        } catch (_) {
            return true;
        }
    },

    /**
     * Roles que pueden autorizar cortesías (configurable en BD).
     */
    async rolesAutorizanCortesia() {
        try {
            const valor = await SettingService.get(
                'cortesia_roles_autorizan',
                ROLES_AUTORIZAN_CORTESIA_POR_DEFECTO.join(',')
            );
            return parsearListaRoles(valor, ROLES_AUTORIZAN_CORTESIA_POR_DEFECTO);
        } catch (_) {
            return [...ROLES_AUTORIZAN_CORTESIA_POR_DEFECTO];
        }
    },

    /**
     * ¿El rol indicado puede autorizar cortesías por sí mismo?
     */
    async puedeAutorizarCortesia(rol) {
        const roles = await this.rolesAutorizanCortesia();
        return roles.includes(normalizarRol(rol));
    },

    /**
     * Valida las credenciales de un supervisor para autorizar una cortesía.
     * Devuelve { ok: true, supervisor } o { ok: false, error }.
     * Nunca expone la contraseña ni si el usuario existe o no con detalle.
     */
    async verificarSupervisor(usuario, password) {
        const usuarioLimpio = String(usuario || '').trim();
        if (!usuarioLimpio || !password) {
            return { ok: false, error: 'Indica el usuario y la contraseña del supervisor que autoriza.' };
        }
        if (!pool) {
            return { ok: false, error: 'Base de datos no disponible para validar la autorización.' };
        }
        try {
            const [rows] = await pool.query(
                'SELECT id, nombre, apellidos, usuario, rol, password, activo FROM usuarios WHERE usuario = ? LIMIT 1',
                [usuarioLimpio]
            );
            const supervisor = rows && rows[0];
            if (!supervisor) {
                return { ok: false, error: 'Credenciales de supervisor inválidas.' };
            }
            let coincide = false;
            try {
                coincide = await bcrypt.compare(String(password), supervisor.password || '');
            } catch (_) {
                coincide = false;
            }
            if (!coincide) {
                return { ok: false, error: 'Credenciales de supervisor inválidas.' };
            }
            if (supervisor.activo === 0 || supervisor.activo === false) {
                return { ok: false, error: 'La cuenta del supervisor no está activa.' };
            }
            const puedeAutorizar = await this.puedeAutorizarCortesia(supervisor.rol);
            if (!puedeAutorizar) {
                return { ok: false, error: `El usuario "${supervisor.usuario}" no tiene nivel para autorizar cortesías.` };
            }
            return {
                ok: true,
                supervisor: {
                    id: supervisor.id,
                    usuario: supervisor.usuario,
                    nombre: [supervisor.nombre, supervisor.apellidos].filter(Boolean).join(' ').trim() || supervisor.usuario,
                    rol: supervisor.rol
                }
            };
        } catch (err) {
            console.error('Error al verificar supervisor de cortesía:', err.message);
            return { ok: false, error: 'No se pudo validar la autorización. Inténtalo de nuevo.' };
        }
    },

    /**
     * Crea (si faltan) las columnas donde queda registrada la autorización
     * de cada cortesía en `pedidos`. Idempotente y tolerante a fallos:
     * devuelve true solo si las tres columnas quedaron disponibles.
     * (El script scripts/migracion_cortesia_autorizacion.sql hace lo mismo
     * para aplicarlo manualmente en el servidor.)
     */
    async asegurarColumnasCortesia() {
        if (!pool) return false;
        const columnas = [
            { nombre: 'cortesia_autorizada_por', ddl: 'ADD COLUMN cortesia_autorizada_por INT NULL' },
            { nombre: 'cortesia_motivo', ddl: 'ADD COLUMN cortesia_motivo VARCHAR(255) NULL' },
            { nombre: 'cortesia_autorizada_en', ddl: 'ADD COLUMN cortesia_autorizada_en DATETIME NULL' }
        ];
        try {
            const [actuales] = await pool.query('SHOW COLUMNS FROM pedidos');
            const existentes = new Set((actuales || []).map(c => String(c.Field || c.field || '').toLowerCase()));
            for (const columna of columnas) {
                if (!existentes.has(columna.nombre)) {
                    await pool.query(`ALTER TABLE pedidos ${columna.ddl}`);
                    existentes.add(columna.nombre);
                }
            }
            try {
                await pool.query(
                    'ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_cortesia_autoriza ' +
                    'FOREIGN KEY (cortesia_autorizada_por) REFERENCES usuarios (id) ON DELETE SET NULL'
                );
            } catch (_) { /* la FK ya existe o el motor no la admite: no es vital */ }
            return true;
        } catch (err) {
            console.error('No se pudieron asegurar las columnas de cortesía:', err.message);
            return false;
        }
    }
};

module.exports = PosAutorizacionService;
