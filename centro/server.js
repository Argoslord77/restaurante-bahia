// centro/server.js — Web service ligero del Centro de Productos y Precios.
// Almacena negocios y catálogos en UN solo JSON (centro/datos.json).
// Sin base de datos, sin cuentas de usuario: cada negocio se autentica con su
// api_key (cabecera X-API-Key) para publicar su catálogo. La consulta es pública.
//
// Uso:
//   node centro/server.js [puerto]        (puerto por defecto 3101)
// Pruebas:
//   const { crearApp } = require('./server');
//   const { app } = crearApp({ rutaDatos: '/tmp/datos-prueba.json' });
//   const srv = app.listen(0);
'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP = 'centro-productos';
const V = 1;
const LIMITE_DEF = 50;
const LIMITE_MAX = 200;

function datosDefecto() {
    return { app: APP, v: V, version: 0, secuencia: 0, negocios: [], productos: [] };
}

function normalizarTexto(s) {
    return String(s == null ? '' : s).trim();
}

// Carga o crea el JSON. Tolerante: archivo ausente o corrupto → base vacía
// (si está corrupto lo respalda como .corrupto-<fecha> en vez de perderlo).
function cargar(ruta) {
    try {
        const crudo = fs.readFileSync(ruta, 'utf8');
        const db = JSON.parse(crudo);
        if (!db || !Array.isArray(db.negocios) || !Array.isArray(db.productos)) throw new Error('forma');
        db.version = Number(db.version) || 0;
        db.secuencia = Number(db.secuencia) || db.negocios.length;
        return db;
    } catch (e) {
        if (e.code !== 'ENOENT') {
            try {
                fs.copyFileSync(ruta, ruta + '.corrupto-' + Date.now());
            } catch (_) { /* respaldo best-effort */ }
        }
        return datosDefecto();
    }
}

// Escritura atómica: tmp + rename (un corte de luz no deja medio archivo).
function guardar(ruta, db) {
    db.version += 1;
    const tmp = ruta + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, ruta);
    return db.version;
}

function negocioPublico(n, productos) {
    const mios = productos.filter(p => p.negocio_id === n.id);
    return {
        id: n.id,
        nombre: n.nombre,
        contacto: n.contacto || null,
        n_productos: mios.length,
        actualizado_en: mios.reduce((m, p) => (p.actualizado_en > m ? p.actualizado_en : m), null),
    };
}

function conNegocio(db, p) {
    const n = db.negocios.find(x => x.id === p.negocio_id);
    return { ...p, negocio: n ? n.nombre : null };
}

function crearApp(opts) {
    const rutaDatos = (opts && opts.rutaDatos) || path.join(__dirname, 'datos.json');
    let db = cargar(rutaDatos);
    const app = express();
    app.use(express.json({ limit: '512kb' }));

    const error = (res, codigo, mensaje) => res.status(codigo).json({ ok: false, error: mensaje });

    // ── Salud ─────────────────────────────────────────────────────────────
    app.get('/salud', (req, res) => {
        res.json({ ok: true, app: APP, v: V, version: db.version,
                   negocios: db.negocios.length, productos: db.productos.length });
    });

    // ── Negocios ──────────────────────────────────────────────────────────
    // Registrar negocio. La api_key se muestra UNA sola vez: guárdela en la app.
    app.post('/api/v1/negocios', (req, res) => {
        const nombre = normalizarTexto(req.body && req.body.nombre);
        if (!nombre) return error(res, 400, 'El nombre del negocio es obligatorio.');
        if (nombre.length > 120) return error(res, 400, 'El nombre es muy largo (120).');
        const contacto = normalizarTexto(req.body && req.body.contacto).slice(0, 160);
        db.secuencia += 1;
        const n = {
            id: 'n' + db.secuencia,
            nombre,
            contacto: contacto || null,
            api_key: crypto.randomBytes(24).toString('hex'),
            creado_en: new Date().toISOString(),
        };
        db.negocios.push(n);
        const version = guardar(rutaDatos, db);
        res.status(201).json({ ok: true, version,
            negocio: { id: n.id, nombre: n.nombre, contacto: n.contacto, api_key: n.api_key } });
    });

    // Directorio público (sin api_keys).
    app.get('/api/v1/negocios', (req, res) => {
        res.json({ ok: true, version: db.version,
            negocios: db.negocios.map(n => negocioPublico(n, db.productos)) });
    });

    // Solo el dueño (su X-API-Key) escribe en su negocio.
    function soloDueno(req, res, next) {
        const n = db.negocios.find(x => x.id === req.params.id);
        if (!n) return error(res, 404, 'Negocio no encontrado.');
        const key = normalizarTexto(req.get('X-API-Key'));
        if (!key || key !== n.api_key) return error(res, 403, 'API key no válida para este negocio.');
        req.negocio = n;
        next();
    }

    // ── Publicar catálogo (reemplaza el catálogo del negocio) ─────────────
    app.put('/api/v1/negocios/:id/productos', soloDueno, (req, res) => {
        const lista = req.body && req.body.productos;
        if (!Array.isArray(lista)) return error(res, 400, 'Envíe { productos: [...] }.');
        if (lista.length > 2000) return error(res, 400, 'Máximo 2000 productos por envío.');
        const ahora = new Date().toISOString();
        const vistos = new Set();
        const nuevos = [];
        for (const it of lista) {
            const codigo = normalizarTexto(it && it.codigo);
            const nombre = normalizarTexto(it && it.nombre);
            const precio = Number(it && it.precio);
            if (!codigo || codigo.length > 40) return error(res, 400, 'Cada producto necesita un código (máx 40).');
            if (!nombre || nombre.length > 160) return error(res, 400, `Nombre no válido para ${codigo}.`);
            if (!Number.isFinite(precio) || precio < 0) return error(res, 400, `Precio no válido para ${codigo}.`);
            if (vistos.has(codigo)) return error(res, 400, `Código duplicado en el envío: ${codigo}.`);
            vistos.add(codigo);
            nuevos.push({
                negocio_id: req.negocio.id,
                codigo,
                nombre,
                precio: Math.round(precio * 100) / 100,
                moneda: normalizarTexto(it.moneda).slice(0, 8) || 'CUP',
                actualizado_en: ahora,
            });
        }
        db.productos = db.productos.filter(p => p.negocio_id !== req.negocio.id).concat(nuevos);
        const version = guardar(rutaDatos, db);
        res.json({ ok: true, version, negocio_id: req.negocio.id, guardados: nuevos.length });
    });

    // ── Buscar en todos los negocios ──────────────────────────────────────
    app.get('/api/v1/productos', (req, res) => {
        const q = normalizarTexto(req.query.q).toLowerCase();
        const neg = normalizarTexto(req.query.negocio);
        let limite = parseInt(req.query.limite, 10) || LIMITE_DEF;
        limite = Math.min(Math.max(limite, 1), LIMITE_MAX);
        let lista = db.productos;
        if (neg) lista = lista.filter(p => p.negocio_id === neg);
        if (q) {
            lista = lista.filter(p => p.codigo.toLowerCase().includes(q) ||
                                      p.nombre.toLowerCase().includes(q));
        }
        res.json({ ok: true, version: db.version, total: lista.length,
            productos: lista.slice(0, limite).map(p => conNegocio(db, p)) });
    });

    // ── Comparar precios de un código en todos los negocios ───────────────
    app.get('/api/v1/precios/:codigo', (req, res) => {
        const codigo = normalizarTexto(req.params.codigo).toLowerCase();
        if (!codigo) return error(res, 400, 'Indique el código.');
        const ofertas = db.productos
            .filter(p => p.codigo.toLowerCase() === codigo)
            .map(p => conNegocio(db, p))
            .sort((a, b) => a.precio - b.precio);
        res.json({ ok: true, version: db.version, codigo: req.params.codigo,
            nombre: ofertas.length ? ofertas[0].nombre : null, ofertas });
    });

    // ── Snapshot completo para el móvil (se guarda local en JSON) ────────
    app.get('/api/v1/snapshot', (req, res) => {
        res.json({ ok: true, version: db.version, exportado_en: new Date().toISOString(),
            negocios: db.negocios.map(n => negocioPublico(n, db.productos)),
            productos: db.productos.map(p => conNegocio(db, p)) });
    });

    // 404 JSON (no HTML).
    app.use((req, res) => error(res, 404, 'Ruta no encontrada.'));

    return { app, rutaDatos, leer: () => db };
}

if (require.main === module) {
    const puerto = parseInt(process.argv[2], 10) || 3101;
    const { app, rutaDatos } = crearApp({});
    app.listen(puerto, () => {
        console.log(`[Centro] escuchando en http://localhost:${puerto} — datos: ${rutaDatos}`);
    });
}

module.exports = { crearApp, APP, V };
