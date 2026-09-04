// controllers/pedidoController.test.js
// Registro de Pedidos/Ventas: el controlador consulta el período, arma el
// desglose y PINTA la vista real (views/pedido/pedido.ejs), de modo que un
// error de plantilla o una variable ausente se detectan aquí y no en producción.
const path = require('path');
const ejs = require('ejs');

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/tableModel', () => ({ getAll: jest.fn() }));
jest.mock('../services/pedidoService', () => ({
    obtenerTodosActivos: jest.fn(),
    obtenerPorId: jest.fn()
}));
jest.mock('../services/inventarioService', () => ({ descontarPorReceta: jest.fn() }));

const db = require('../config/db');
const TableModel = require('../models/tableModel');
const itemTiempos = require('../services/itemTiemposService');
const pedidoController = require('./pedidoController');

const PEDIDO_ABIERTO = {
    id: 31, cliente_nombre: 'Familia Pérez', comensales: 2,
    estado_pedido: 'preparando', estado_pago: 'pendiente',
    subtotal: '1200.00', descuento: '0.00', impuesto: '0.00', total: '1200.00', propina: '0.00',
    creado_en: new Date(2026, 8, 4, 13, 5, 0), fecha_precuenta: null, impresiones_precuenta: 0,
    fecha_cierre: null, duracion_seg: 900,
    mesa_id: 25, mesa_numero: 'Nro 5', mesa_ubicacion: 'Terraza',
    mesero_id: 11, mesero_nombre: 'Joaquin Urtaquio', mesero_apellidos: 'Valladares Lopez', mesero_rol: 'dependiente',
    cajero_id: null, cajero_nombre: null, cajero_apellidos: null,
    turno_id: 4, turno_apertura: new Date(2026, 7, 28, 18, 43, 14), turno_cierre: null, turno_estado: 'abierto'
};

const ITEM_EN_COCINA = {
    detalle_id: 77, id_pedido: 31, id_platillo: 4, es_platillo_dia: 1,
    cantidad: 2, precio_unitario: '600.00', estado_item: 'en_cocina', notas_especiales: 'Sin picante',
    nombre: 'Arroz con pollo del día', tipo: 'COMESTIBLES', categoria: 'Platos fuertes',
    creado_en: new Date(2026, 8, 4, 13, 6, 0), enviado_en: new Date(2026, 8, 4, 13, 6, 2),
    area_preparacion: 'cocina', listo_en: null, entregado_en: null, cancelado_en: null,
    cocinero: null, entregado_por: null
};

const PAGO_ZELLE = {
    pedido_id: 31, metodo_pago: 'transferencia', monto_moneda_origen: '5.00',
    monto_equivalente_local: '3300.00', factor_cambio_aplicado: '660.0000',
    referencia_transaccion: 'ZL-998877', creado_en: new Date(2026, 8, 4, 13, 20, 0),
    moneda_codigo: 'ZELLE', moneda_simbolo: '$', moneda_nombre: 'Zelle (Dólar estadounidense)'
};

function enrutar(sql) {
    const s = String(sql).replace(/\s+/g, ' ');
    if (/FROM turnos_servicio t/.test(s)) return [[{ id: 4, fecha_apertura: new Date(2026, 7, 28, 18, 43, 14), fecha_cierre: null, estado: 'abierto' }]];
    if (/FROM usuarios u/.test(s)) return [[{ id: 11, nombre: 'Joaquin Urtaquio', apellidos: 'Valladares Lopez', rol: 'dependiente' }]];
    if (/FROM mesas m/.test(s) && !/pedidos p/.test(s)) return [[{ id: 25, numero: 'Nro 5', ubicacion: 'Terraza' }]];
    if (/SELECT COUNT\(\*\) AS pedidos/.test(s)) {
        return [[{ pedidos: 1, importe: '1200.00', subtotal: '1200.00', descuentos: '0.00', propinas: '0.00', abiertas: 1, cobradas: 0, otras: 0, anuladas: 0, duracion_media_seg: null }]];
    }
    if (/FROM pagos_pedido pp/.test(s) && /GROUP BY/.test(s)) {
        return [[{ codigo: 'ZELLE', simbolo: '$', nombre: 'Zelle', monto_origen: '5.00', monto_local: '3300.00', pagos: 1 }]];
    }
    if (/FROM detalles_pedido dp/.test(s) && /COUNT\(\*\) AS total/.test(s)) return [[{ total: 1, entregados: 0, cancelados: 0 }]];
    if (/SELECT COUNT\(\*\) AS total FROM pedidos p/.test(s)) return [[{ total: 1 }]];
    if (/LIMIT \? OFFSET \?/.test(s)) return [[PEDIDO_ABIERTO]];
    if (/FROM detalles_pedido dp/.test(s) && /dp.id_pedido IN/.test(s)) return [[ITEM_EN_COCINA]];
    if (/FROM pagos_pedido pp/.test(s)) return [[PAGO_ZELLE]];
    if (/FROM detalles_pedido_modificadores/.test(s)) return [[]];
    throw new Error(`Consulta no prevista en el mock: ${s.slice(0, 120)}`);
}

function crearReqRes(query = {}, usuario = { id: 3, rol: 'administrador', nombre: 'Willian', foto: null }) {
    const req = { query, user: usuario };
    const res = {
        locals: { user: usuario },
        html: null,
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        render: jest.fn((vista, datos) => {
            // El controlador no espera el render (como Express): la prueba sí.
            res.renderPromise = ejs
                .renderFile(path.join(__dirname, '..', 'views', `${vista}.ejs`), datos)
                .then((html) => { res.html = html; return html; }, (err) => { res.renderError = err; throw err; });
            return res.renderPromise;
        })
    };
    return { req, res };
}

describe('pedidoController · Pedidos/Ventas', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        itemTiempos.marcarConTiempos();
        db.query.mockImplementation(async (sql) => [enrutar(sql)[0]]);
        TableModel.getAll.mockResolvedValue([
            { id: 25, numero: 'Nro 5', ubicacion: 'Terraza', capacidad: 8, estado: 'libre' },
            { id: 26, numero: 'Nro 6', ubicacion: 'Balcón', capacidad: 2, estado: 'ocupada' }
        ]);
    });

    it('pinta la vista real con el rango, la mesa y los tiempos del período', async () => {
        const { req, res } = crearReqRes({ desde: '2026-09-04', hasta: '2026-09-04' });

        await pedidoController.listarPedidos(req, res);
        if (res.renderPromise) await res.renderPromise;

        expect(res.render).toHaveBeenCalledTimes(1);
        expect(res.html).toContain('Pedidos y Ventas');
        expect(res.html).toContain('2026-09-04');            // rango aplicado
        expect(res.html).toContain('Nro 5');                 // número real de la mesa
        expect(res.html).toContain('Terraza');
        expect(res.html).toContain('Joaquin Urtaquio Valladares Lopez');
        expect(res.html).toContain('En consumo (abiertas)');
        expect(res.html).toContain('Arroz con pollo del día');
        expect(res.html).toContain('13:06:02');              // hora de envío a cocina
        expect(res.html).toContain('5,00 ZELLE');            // desglose por moneda
        expect(res.html).toContain('ZL-998877');             // referencia del pago
        expect(res.html).not.toContain('Sin tiempos por ítem');
    });

    it('avisa en la vista cuando falta la migración de tiempos', async () => {
        itemTiempos.marcarSinTiempos();
        const { req, res } = crearReqRes({});

        await pedidoController.listarPedidos(req, res);
        if (res.renderPromise) await res.renderPromise;

        expect(res.html).toContain('Sin tiempos por ítem');
        expect(res.html).toContain('migracion_tiempos_detalles_pedido.sql');
    });

    it('por defecto consulta el día de hoy y marca el enlace activo del menú', async () => {
        const { req, res } = crearReqRes({});

        await pedidoController.listarPedidos(req, res);
        if (res.renderPromise) await res.renderPromise;

        const datos = res.render.mock.calls[0][1];
        expect(datos.view).toBe('orders');
        expect(datos.filtros.desde).toBe(datos.filtros.hasta);
        expect(datos.mesasLibres.map(m => m.id)).toEqual([25]);   // solo las libres
    });

    it('rechaza un tamaño de página fuera del catálogo', async () => {
        const { req, res } = crearReqRes({ por_pagina: '9999' });

        await pedidoController.listarPedidos(req, res);
        if (res.renderPromise) await res.renderPromise;

        expect(res.render.mock.calls[0][1].resultado.porPagina).toBe(25);
    });

    it('devuelve 500 sin romper el proceso si la base falla', async () => {
        db.query.mockRejectedValue(new Error('Conexión perdida'));
        const { req, res } = crearReqRes({});

        await pedidoController.listarPedidos(req, res);
        if (res.renderPromise) await res.renderPromise;

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).not.toHaveBeenCalled();
    });

    it('exporta el rango a CSV con las cabeceras de descarga', async () => {
        const { req, res } = crearReqRes({ desde: '2026-09-04', hasta: '2026-09-04', detalle: '1' });

        await pedidoController.exportarVentas(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
        const disposition = res.setHeader.mock.calls.find(c => c[0] === 'Content-Disposition')[1];
        expect(disposition).toContain('pedidos_2026-09-04_2026-09-04_detalle_');
        expect(res.send.mock.calls[0][0]).toContain('Arroz con pollo del día');
    });
});
