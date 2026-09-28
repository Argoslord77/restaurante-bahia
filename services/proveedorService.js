// services/proveedorService.js
// V13 (C1): catálogo de proveedores — alta, edición y activación.
// Los proveedores nunca se borran: las compras (lotes) los referencian
// como historial. Desactivar solo los oculta de las entradas nuevas.
const db = require('../config/db');

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpiarTexto(valor, maximo) {
    const t = String(valor || '').trim();
    return t ? t.slice(0, maximo) : null;
}

function mapear(f) {
    return {
        id: f.id,
        codigo: f.codigo,
        nombre: f.nombre_comercial,
        razonSocial: f.razon_social,
        identificacion: f.identificacion_fiscal,
        telefono: f.telefono,
        email: f.email,
        direccion: f.direccion,
        contacto: f.persona_contacto,
        condicionesPago: f.condiciones_pago,
        diasCredito: Number(f.dias_credito || 0),
        limiteCredito: Number(f.limite_credito || 0),
        observaciones: f.observaciones,
        activo: Number(f.activo) === 1,
        totalCompras: Number(f.total_compras || 0),
        montoComprado: Number(f.monto_comprado || 0),
        ultimaCompra: f.ultima_compra || null
    };
}

const proveedorService = {

    listar: async ({ soloActivos = false } = {}) => {
        const [filas] = await db.query(`
            SELECT p.*,
                   COUNT(l.id) AS total_compras,
                   COALESCE(SUM(l.cantidad_inicial * l.costo_unitario), 0) AS monto_comprado,
                   MAX(l.fecha_ingreso) AS ultima_compra
            FROM proveedores p
            LEFT JOIN lotes l ON l.proveedor_id = p.id
            ${soloActivos ? 'WHERE p.activo = 1' : ''}
            GROUP BY p.id
            ORDER BY p.activo DESC, p.nombre_comercial ASC
        `);
        return filas.map(mapear);
    },

    obtener: async (id) => {
        const [filas] = await db.query('SELECT * FROM proveedores WHERE id = ? LIMIT 1', [id]);
        return filas.length ? mapear(filas[0]) : null;
    },

    crear: async (datos = {}) => {
        const nombre = limpiarTexto(datos.nombre, 150);
        if (!nombre) throw new Error('El nombre comercial es obligatorio.');
        const email = limpiarTexto(datos.email, 150);
        if (email && !EMAIL_OK.test(email)) throw new Error('El correo no es válido.');
        const diasCredito = Number(datos.diasCredito || 0);
        if (!Number.isInteger(diasCredito) || diasCredito < 0) {
            throw new Error('Los días de crédito no son válidos.');
        }
        const limiteCredito = Number(datos.limiteCredito || 0);
        if (!Number.isFinite(limiteCredito) || limiteCredito < 0) {
            throw new Error('El límite de crédito no es válido.');
        }

        let codigo = limpiarTexto(datos.codigo, 50);
        if (!codigo) {
            const [max] = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS siguiente FROM proveedores');
            codigo = `PROV-${String(max[0].siguiente).padStart(4, '0')}`;
        } else {
            const [dup] = await db.query('SELECT id FROM proveedores WHERE codigo = ? LIMIT 1', [codigo]);
            if (dup.length) throw new Error(`El código ${codigo} ya existe.`);
        }

        const [r] = await db.query(`
            INSERT INTO proveedores
            (codigo, nombre_comercial, razon_social, identificacion_fiscal, telefono,
             email, direccion, persona_contacto, condiciones_pago, dias_credito,
             limite_credito, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [codigo, nombre, limpiarTexto(datos.razonSocial, 200),
            limpiarTexto(datos.identificacion, 50), limpiarTexto(datos.telefono, 50),
            email, limpiarTexto(datos.direccion, 500), limpiarTexto(datos.contacto, 150),
            limpiarTexto(datos.condicionesPago, 255), diasCredito,
            limiteCredito.toFixed(2), limpiarTexto(datos.observaciones, 500)]);
        return { id: r.insertId, codigo, nombre };
    },

    actualizar: async (id, datos = {}) => {
        const actual = await proveedorService.obtener(id);
        if (!actual) throw new Error('El proveedor no existe.');
        const nombre = limpiarTexto(datos.nombre, 150);
        if (!nombre) throw new Error('El nombre comercial es obligatorio.');
        const email = limpiarTexto(datos.email, 150);
        if (email && !EMAIL_OK.test(email)) throw new Error('El correo no es válido.');
        const diasCredito = Number(datos.diasCredito || 0);
        if (!Number.isInteger(diasCredito) || diasCredito < 0) {
            throw new Error('Los días de crédito no son válidos.');
        }
        const limiteCredito = Number(datos.limiteCredito || 0);
        if (!Number.isFinite(limiteCredito) || limiteCredito < 0) {
            throw new Error('El límite de crédito no es válido.');
        }
        const codigo = limpiarTexto(datos.codigo, 50) || actual.codigo;
        if (codigo !== actual.codigo) {
            const [dup] = await db.query(
                'SELECT id FROM proveedores WHERE codigo = ? AND id != ? LIMIT 1', [codigo, id]);
            if (dup.length) throw new Error(`El código ${codigo} ya existe.`);
        }
        await db.query(`
            UPDATE proveedores SET codigo = ?, nombre_comercial = ?, razon_social = ?,
                identificacion_fiscal = ?, telefono = ?, email = ?, direccion = ?,
                persona_contacto = ?, condiciones_pago = ?, dias_credito = ?,
                limite_credito = ?, observaciones = ?
            WHERE id = ?
        `, [codigo, nombre, limpiarTexto(datos.razonSocial, 200),
            limpiarTexto(datos.identificacion, 50), limpiarTexto(datos.telefono, 50),
            email, limpiarTexto(datos.direccion, 500), limpiarTexto(datos.contacto, 150),
            limpiarTexto(datos.condicionesPago, 255), diasCredito,
            limiteCredito.toFixed(2), limpiarTexto(datos.observaciones, 500), id]);
        return { id: Number(id), codigo, nombre };
    },

    cambiarActivo: async (id, activo) => {
        const [r] = await db.query('UPDATE proveedores SET activo = ? WHERE id = ?',
            [activo ? 1 : 0, id]);
        if (r.affectedRows === 0) throw new Error('El proveedor no existe.');
        return { id: Number(id), activo: !!activo };
    }
};

module.exports = proveedorService;
