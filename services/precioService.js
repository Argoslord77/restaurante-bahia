// services/precioService.js
// Regla única para resolver el precio y la moneda de una carta por mesa.
'use strict';

const db = require('../config/db');

const REGLAS_CARTA = Object.freeze({
    CUP: { campo: 'precio', descripcion: 'Carta CUP' },
    COMISION: { campo: 'precio_alt', descripcion: 'Carta Comisión' },
    ZELLE: { campo: 'precio_usd', descripcion: 'Carta Zelle' }
});

function normalizarCarta(carta) {
    const valor = String(carta || 'CUP').trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(REGLAS_CARTA, valor) ? valor : 'CUP';
}

function numeroPrecio(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function seleccionarPrecio(platillo, carta = 'CUP') {
    const regla = REGLAS_CARTA[normalizarCarta(carta)];
    return numeroPrecio(platillo && platillo[regla.campo]);
}

function validarPrecioConfigurado(platillo, carta = 'CUP') {
    const cartaNormalizada = normalizarCarta(carta);
    const precio = seleccionarPrecio(platillo, cartaNormalizada);
    if (precio === null) {
        const regla = REGLAS_CARTA[cartaNormalizada];
        throw new Error(
            `El platillo "${platillo && platillo.nombre ? platillo.nombre : 'seleccionado'}" ` +
            `no tiene configurado un valor válido en el campo ${regla.campo} para la ${regla.descripcion}.`
        );
    }
    return precio;
}

function aplicarPrecio(platillo, contexto) {
    const precioCobro = seleccionarPrecio(platillo, contexto.carta);
    const disponibleOriginal = !(
        platillo &&
        (platillo.disponible === 0 || platillo.disponible === false || platillo.disponible === '0')
    );

    return {
        ...platillo,
        precio_base: platillo ? platillo.precio : null,
        precio_comision: platillo ? platillo.precio_alt : null,
        precio_zelle: platillo ? platillo.precio_usd : null,
        // Las vistas existentes utilizan `precio`; aquí representa el precio
        // de la carta activa, nunca el precio enviado por el navegador.
        precio: precioCobro === null ? 0 : precioCobro,
        precio_cobro: precioCobro,
        precio_configurado: precioCobro !== null,
        precio_no_configurado: precioCobro === null,
        disponible: disponibleOriginal && precioCobro !== null,
        moneda_codigo: contexto.moneda_codigo,
        codigo_moneda: contexto.moneda_codigo,
        simbolo_moneda: contexto.simbolo_moneda,
        moneda_id: contexto.moneda_id || null,
        factor_cambio: contexto.factor_cambio
    };
}

function aplicarPrecios(platillos, contexto) {
    return (Array.isArray(platillos) ? platillos : []).map(p => aplicarPrecio(p, contexto));
}

async function obtenerMonedaBase(turnoId, connection = db) {
    let rows = [];
    if (turnoId) {
        [rows] = await connection.query(`
            SELECT m.id AS moneda_id, m.codigo, m.nombre, m.simbolo,
                   COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
            FROM monedas m
            LEFT JOIN monedas_turno mt
              ON mt.moneda_id = m.id AND mt.turno_servicio_id = ?
            WHERE m.activo = 1 AND m.es_moneda_base = 1
            ORDER BY (mt.id IS NOT NULL) DESC
            LIMIT 1
        `, [turnoId]);
    }
    if (!rows.length) {
        [rows] = await connection.query(`
            SELECT id AS moneda_id, codigo, nombre, simbolo, factor_cambio
            FROM monedas
            WHERE activo = 1 AND es_moneda_base = 1
            ORDER BY id ASC
            LIMIT 1
        `);
    }
    return rows[0] || {
        moneda_id: null, codigo: 'CUP', nombre: 'Moneda base', simbolo: '$', factor_cambio: 1
    };
}

async function obtenerMonedaZelle(turnoId, connection = db) {
    const [rows] = await connection.query(`
        SELECT m.id AS moneda_id, m.codigo, m.nombre, m.simbolo,
               COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
        FROM monedas m
        LEFT JOIN monedas_turno mt
          ON mt.moneda_id = m.id AND mt.turno_servicio_id = ?
        WHERE m.activo = 1 AND UPPER(m.codigo) IN ('ZELLE', 'USD')
        ORDER BY CASE WHEN UPPER(m.codigo) = 'ZELLE' THEN 0 ELSE 1 END,
                 (mt.id IS NOT NULL) DESC, m.id ASC
        LIMIT 1
    `, [turnoId || null]);
    return rows[0] || {
        moneda_id: null, codigo: 'ZELLE', nombre: 'Zelle (Dólar estadounidense)', simbolo: '$', factor_cambio: 1
    };
}

async function obtenerContextoCobro({ idMesa = null, turnoId = null, connection = db } = {}) {
    let carta = 'CUP';
    if (idMesa !== null && idMesa !== undefined && idMesa !== '') {
        const [mesas] = await connection.query(
            'SELECT id, carta FROM mesas WHERE id = ? LIMIT 1', [idMesa]
        );
        if (!mesas.length) throw new Error('La mesa indicada no existe.');
        carta = normalizarCarta(mesas[0].carta);
    }

    const monedaBase = await obtenerMonedaBase(turnoId, connection);
    const monedaZelle = await obtenerMonedaZelle(turnoId, connection);
    const esZelle = carta === 'ZELLE';
    const moneda = esZelle ? monedaZelle : monedaBase;

    return {
        carta,
        es_zelle: esZelle,
        campo_precio: REGLAS_CARTA[carta].campo,
        moneda_id: moneda.moneda_id || null,
        // ZELLE se muestra y se reporta como tal, aun cuando la instalación
        // antigua sólo tenga registrada la moneda USD.
        moneda_codigo: esZelle ? 'ZELLE' : (moneda.codigo || 'CUP'),
        moneda_catalogo_codigo: moneda.codigo || (esZelle ? 'ZELLE' : 'CUP'),
        moneda_nombre: esZelle ? 'Zelle (Dólar estadounidense)' : (moneda.nombre || 'Moneda base'),
        simbolo_moneda: moneda.simbolo || '$',
        factor_cambio: Number(moneda.factor_cambio) || 1,
        moneda_base_id: monedaBase.moneda_id || null,
        moneda_base_codigo: monedaBase.codigo || 'CUP',
        moneda_base_nombre: monedaBase.nombre || 'Moneda base',
        simbolo_moneda_base: monedaBase.simbolo || '$',
        factor_cambio_base: Number(monedaBase.factor_cambio) || 1,
        turno_id: turnoId || null,
        id_mesa: idMesa || null
    };
}

async function obtenerContextoPedido(pedidoId, connection = db) {
    const [rows] = await connection.query(`
        SELECT p.id_mesa, p.turno_servicio_id
        FROM pedidos p
        WHERE p.id = ?
        LIMIT 1
    `, [pedidoId]);
    if (!rows.length) throw new Error('El pedido no existe.');
    return obtenerContextoCobro({
        idMesa: rows[0].id_mesa,
        turnoId: rows[0].turno_servicio_id,
        connection
    });
}

module.exports = {
    REGLAS_CARTA,
    normalizarCarta,
    seleccionarPrecio,
    validarPrecioConfigurado,
    aplicarPrecio,
    aplicarPrecios,
    obtenerMonedaBase,
    obtenerMonedaZelle,
    obtenerContextoCobro,
    obtenerContextoPedido
};
