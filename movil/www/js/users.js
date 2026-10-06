// movil/www/js/users.js — Usuarios con PIN (4-6 dígitos, más práctico que claves
// en un celular). Mismos roles que la versión web: administrador/cajero/vendedor.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFUsers = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ROLES = ['administrador', 'cajero', 'vendedor'];
    const COL = 'usuarios';

    function pinValido(pin) { return /^[0-9]{4,6}$/.test(String(pin || '')); }

    function sal() {
        const ab = new Uint8Array(16);
        const c = (typeof globalThis !== 'undefined' && globalThis.crypto) ||
                  (typeof require !== 'undefined' && require('crypto').webcrypto);
        if (c && c.getRandomValues) {
            c.getRandomValues(ab);
            return Array.from(ab).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return 'sal-' + Date.now().toString(16) + Math.floor(Math.random() * 1e12).toString(16);
    }

    async function crear(store, { nombre, pin, rol }) {
        if (!nombre || !String(nombre).trim()) throw new Error('El nombre es obligatorio.');
        if (!pinValido(pin)) throw new Error('El PIN debe ser de 4 a 6 dígitos.');
        if (!ROLES.includes(rol)) throw new Error('Rol no válido.');
        const s = sal();
        const fila = await store.insertar(COL, {
            nombre: String(nombre).trim(),
            pin_salt: s,
            pin_hash: await store._sha256hex(s + ':' + String(pin)),
            rol,
            activo: true,
            creado_en: new Date().toISOString()
        });
        return { id: fila.id, nombre: fila.nombre, rol: fila.rol };
    }

    async function verificar(store, id, pin) {
        const u = await store.obtener(COL, Number(id));
        if (!u || !u.activo) return null;
        const hash = await store._sha256hex(u.pin_salt + ':' + String(pin));
        if (hash !== u.pin_hash) return null;
        return { id: u.id, nombre: u.nombre, rol: u.rol };
    }

    async function listar(store) {
        return (await store.todos(COL)).map(u => ({
            id: u.id, nombre: u.nombre, rol: u.rol, activo: u.activo
        }));
    }

    async function cambiarPin(store, id, pinNuevo) {
        if (!pinValido(pinNuevo)) throw new Error('El PIN debe ser de 4 a 6 dígitos.');
        const s = sal();
        const ok = await store.actualizar(COL, Number(id), {
            pin_salt: s, pin_hash: await store._sha256hex(s + ':' + String(pinNuevo))
        });
        if (!ok) throw new Error('El usuario no existe.');
        return true;
    }

    return { crear, verificar, listar, cambiarPin, pinValido, ROLES, COL };
});
