// movil/www/js/unidades.js — Catálogo de unidades y conversiones (Fase 2 restaurante).
// Dimensiones con unidad base: conteo→U, masa→g, volumen→ml.
// 'pza' se acepta como alias histórico de 'U' (datos y respaldos viejos siguen
// operando; la migración 1 normaliza lo almacenado).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFUnidades = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const TABLA = [
        { codigo: 'U',  nombre: 'Unidad',    dim: 'conteo',  factor: 1 },
        { codigo: 'g',  nombre: 'Gramo',     dim: 'masa',    factor: 1 },
        { codigo: 'kg', nombre: 'Kilogramo', dim: 'masa',    factor: 1000 },
        { codigo: 'ml', nombre: 'Mililitro', dim: 'volumen', factor: 1 },
        { codigo: 'L',  nombre: 'Litro',     dim: 'volumen', factor: 1000 }
    ];
    const ALIAS = { pza: 'U' };
    const norm = c => ALIAS[c] || c;

    const r4 = n => Math.round((Number(n) || 0) * 10000) / 10000;

    function buscar(codigo) {
        return TABLA.find(u => u.codigo === norm(codigo)) || null;
    }

    function listar() { return TABLA.map(u => ({ ...u })); }
    function existe(codigo) { return !!buscar(codigo); }
    function dimension(codigo) { const u = buscar(codigo); return u ? u.dim : null; }
    function factor(codigo) { const u = buscar(codigo); return u ? u.factor : null; }

    // Cantidades de venta/stock se capturan enteras en unidades, decimales en lo demás.
    function entera(codigo) { return norm(codigo) === 'U'; }

    function convertir(cantidad, de, a) {
        const u1 = buscar(de), u2 = buscar(a);
        if (!u1 || !u2) throw new Error('Unidad no válida.');
        if (u1.dim !== u2.dim) throw new Error(`No se puede convertir ${de} a ${a}.`);
        return r4(Number(cantidad) * u1.factor / u2.factor);
    }

    function aBase(cantidad, codigo) {
        const u = buscar(codigo);
        if (!u) throw new Error('Unidad no válida.');
        return r4(Number(cantidad) * u.factor);
    }

    function deBase(cantidadBase, codigo) {
        const u = buscar(codigo);
        if (!u) throw new Error('Unidad no válida.');
        return r4(Number(cantidadBase) / u.factor);
    }

    // Unidades aceptadas al capturar un movimiento de un producto:
    // su unidad base + su empaque de compra (si tiene) + las de su dimensión.
    function aceptadas(producto) {
        const base = norm((producto && producto.unidad) || 'U');
        const lista = [base];
        if (producto && producto.compra_unidad && Number(producto.compra_factor) > 0) {
            lista.push(producto.compra_unidad);
        }
        const dim = dimension(base);
        for (const u of TABLA) {
            if (u.dim === dim && !lista.includes(u.codigo)) lista.push(u.codigo);
        }
        return lista;
    }

    // Traduce cantidad+unidad a la unidad base del producto (número, redondeado).
    function resolver(producto, cantidad, unidad) {
        const base = norm((producto && producto.unidad) || 'U');
        const uni = norm(unidad);
        const cant = Number(cantidad);
        if (!Number.isFinite(cant)) throw new Error('Cantidad no válida.');
        if (!uni || uni === base) return r4(cant);
        if (producto && uni === norm(producto.compra_unidad) && Number(producto.compra_factor) > 0) {
            return r4(cant * Number(producto.compra_factor));
        }
        return convertir(cant, uni, base);
    }

    // "2.5 kg" · "3 U" · "0.08 kg" (recorta ceros sobrantes).
    function fmtCant(cantidad) {
        const n = Math.round((Number(cantidad) || 0) * 1000) / 1000;
        return String(n);
    }

    function formatear(cantidad, unidad) {
        const c = fmtCant(cantidad);
        return unidad ? `${c} ${norm(unidad)}` : c;
    }

    return { listar, existe, dimension, factor, entera, convertir, aBase, deBase,
             aceptadas, resolver, fmtCant, formatear };
});
