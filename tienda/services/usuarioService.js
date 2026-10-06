// tienda/services/usuarioService.js — Usuarios propios de la tienda.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ROLES = ['administrador', 'cajero', 'vendedor'];

const UsuarioService = {
    ROLES,

    async listar() {
        const [filas] = await pool.query(`
            SELECT id, nombre, usuario, rol, activo, creado_en
            FROM usuarios ORDER BY nombre ASC
        `);
        return filas;
    },

    async obtener(id) {
        const [filas] = await pool.query(`
            SELECT id, nombre, usuario, rol, activo, creado_en
            FROM usuarios WHERE id = ? LIMIT 1
        `, [id]);
        return filas.length ? filas[0] : null;
    },

    // Valida credenciales para el login. Devuelve el usuario de sesión o
    // lanza Error genérico (sin revelar si existe o no).
    async validarCredenciales(usuario, clave) {
        const u = String(usuario || '').trim();
        if (!u || !clave) throw new Error('Credenciales inválidas.');
        const [filas] = await pool.query('SELECT * FROM usuarios WHERE usuario = ? LIMIT 1', [u]);
        const reg = filas[0];
        const hash = reg ? reg.password_hash : '';
        let ok = false;
        try { ok = await bcrypt.compare(String(clave), hash || ''); } catch (_) { ok = false; }
        if (!ok || !reg || !reg.activo) throw new Error('Credenciales inválidas.');
        return { id: reg.id, nombre: reg.nombre, usuario: reg.usuario, rol: reg.rol };
    },

    async crear({ nombre, usuario, clave, rol }) {
        const nom = String(nombre || '').trim();
        const usu = String(usuario || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        if (!usu) throw new Error('El usuario es obligatorio.');
        if (!clave || String(clave).length < 6) throw new Error('La clave debe tener al menos 6 caracteres.');
        if (!ROLES.includes(rol)) throw new Error('Rol no válido.');
        const hash = await bcrypt.hash(String(clave), 10);
        try {
            const [r] = await pool.query(`
                INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)
            `, [nom, usu, hash, rol]);
            return r.insertId;
        } catch (err) {
            if (err && err.code === 'ER_DUP_ENTRY') throw new Error('Ese usuario ya existe.');
            throw err;
        }
    },

    async cambiarClave(id, clave) {
        if (!clave || String(clave).length < 6) throw new Error('La clave debe tener al menos 6 caracteres.');
        const hash = await bcrypt.hash(String(clave), 10);
        await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
    },

    async cambiarRol(id, rol) {
        if (!ROLES.includes(rol)) throw new Error('Rol no válido.');
        await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    },

    async cambiarActivo(id, activo) {
        await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
    }
};

module.exports = UsuarioService;
