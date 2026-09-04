// services/ventasService.test.js
// Registro de Pedidos/Ventas: filtros por rango de fechas, desglose por moneda,
// tiempos de entrega por ítem y exportación a CSV.
const ventasService = require('./ventasService');
const itemTiempos = require('./itemTiemposService');
const db = require('../config/db');

jest.mock('../config/db', () => ({ query: jest.fn() }));

// ---------------------------------------------------------------------------
// Fixtures con la forma real de las filas de MySQL (DECIMAL llega como string)
// ---------------------------------------------------------------------------
const PEDIDO = {
    id: 22,
    cliente_nombre: null,
    comensales: 4,
    estado_pedido: 'entregado',
    estado_pago: 'pagado',
    subtotal: '350.00',
    descuento: '0.00',
    impuesto: '0.00',
    total: '350.00',
    propina: '35.00',
    creado_en: new Date(2026, 7, 29, 12, 9, 27),
    fecha_precuenta: new Date(2026, 7, 29, 12, 10, 0),
    impresiones_precuenta: 1,
    fecha_cierre: new Date(2026, 7, 29, 12, 10, 17),
    duracion_seg: 50,
    mesa_id: 28,
    mesa_numero: 'Nro 8',
    mesa_ubicacion: 'Terraza',
    mesero_id: 4,
    mesero_nombre: 'Maria',
    mesero_apellidos: 'Gonzalez Diaz',
    mesero_rol: 'dependiente',
    cajero_id: 4,
    cajero_nombre: 'Maria',
    cajero_apellidos: 'Gonzalez Diaz',
    turno_id: 4,
    turno_apertura: new Date(2026, 7, 28, 18, 43, 14),
    turno_cierre: null,
    turno_estado: 'abierto'
};

const ITEM_ENTREGADO = {
    detalle_id: 52,
    id_pedido: 22,
    id_platillo: 12,
    es_platillo_dia: 0,
    cantidad: 1,
    precio_unitario: '350.00',
    estado_item: 'entregado',
    notas_especiales: 'Para compartir',
    nombre: 'Cerveza Nacional',
    tipo: 'BEBIDAS',
    categoria: 'Bebidas',
    creado_en: new Date(2026, 7, 29, 12, 9, 30),
    enviado_en: new Date(2026, 7, 29, 12, 9, 31),
    area_preparacion: 'bar',
    listo_en: new Date(2026, 7, 29, 12, 9, 50),
    entregado_en: new Date(2026, 7, 29, 12, 10, 1),
    cancelado_en: null,
    cocinero: 'Felipe Jose Franco Holland',
    entregado_por: 'Maria Gonzalez Diaz'
};

const ITEM_CANCELADO = {
    ...ITEM_ENTREGADO,
    detalle_id: 53,
    nombre: 'Cóctel Bahía',
    estado_item: 'cancelado',
    notas_especiales: 'CANCELADO: se va',
    entregado_en: null,
    listo_en: null,
    cancelado_en: new Date(2026, 7, 29, 12, 10, 5),
    cocinero: null,
    entregado_por: null
};

const PAGO = {
    pedido_id: 22,
    metodo_pago: 'efectivo',
    monto_moneda_origen: '350.00',
    monto_equivalente_local: '350.00',
    factor_cambio_aplicado: '1.0000',
    referencia_transaccion: null,
    creado_en: new Date(2026, 7, 29, 12, 10, 17),
    moneda_codigo: 'CUP',
    moneda_simbolo: '$',
    moneda_nombre: 'Peso Cubano (Moneda Local)'
};

const MODIFICADOR = { detalle_pedido_id: 52, nombre: 'Sin gluten', tipo: 'EXTRA', precio_cobrado: '0.00' };

const TOTALES = [{
    pedidos: 1, importe: '350.00', subtotal: '350.00', descuentos: '0.00', propinas: '35.00',
    abiertas: 0, cobradas: 1, otras: 0, anuladas: 0, duracion_media_seg: '50.0000'
}];

const MONEDAS_TOTALES = [{ codigo: 'CUP', simbolo: '$', nombre: 'Peso Cubano', monto_origen: '350.00', monto_local: '350.00', pagos: 1 }];

/** Enruta la consulta al fixture que corresponde, como haría MySQL. */
function enrutar(sql, { sinColumnasDeTiempos = false } = {}) {
    const s = String(sql).replace(/\s+/g, ' ');

    if (/FROM turnos_servicio t/.test(s)) return [[]];
    if (/FROM usuarios u/.test(s)) return [[]];
    if (/FROM mesas m/.test(s) && /ubicacion_mesa/.test(s) && !/pedidos p/.test(s)) return [[]];
    if (/SELECT COUNT\(\*\) AS pedidos/.test(s)) return [TOTALES];
    if (/FROM pagos_pedido pp/.test(s) && /GROUP BY/.test(s)) return [MONEDAS_TOTALES];
    if (/FROM detalles_pedido dp/.test(s) && /COUNT\(\*\) AS total/.test(s)) {
        return [[{ total: 2, entregados: 1, cancelados: 1 }]];
    }
    if (/SELECT COUNT\(\*\) AS total FROM pedidos p/.test(s)) return [[{ total: 1 }]];
    if (/FROM pedidos p/.test(s) && /LIMIT \? OFFSET \?/.test(s)) return [[PEDIDO]];
    if (/FROM detalles_pedido dp/.test(s) && /dp.id_pedido IN/.test(s)) {
        if (sinColumnasDeTiempos) {
            if (/dp.enviado_en/.test(s)) {
                const err = new Error("Unknown column 'dp.enviado_en' in 'field list'");
                err.code = 'ER_BAD_FIELD_ERROR';
                err.errno = 1054;
                throw err;
            }
            const sinTiempos = ({ creado_en, enviado_en, area_preparacion, listo_en, entregado_en, cancelado_en, cocinero, entregado_por, ...resto }) => resto;
            return [[ITEM_ENTREGADO, ITEM_CANCELADO].map(sinTiempos)];
        }
        return [[ITEM_ENTREGADO, ITEM_CANCELADO]];
    }
    if (/FROM pagos_pedido pp/.test(s)) return [[PAGO]];
    if (/FROM detalles_pedido_modificadores/.test(s)) return [[MODIFICADOR]];

    throw new Error(`Consulta no prevista en el mock: ${s.slice(0, 120)}`);
}

function mockearDb(opciones = {}) {
    db.query.mockImplementation(async (sql) => [enrutar(sql, opciones)[0]]);
}

describe('ventasService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        itemTiempos.marcarConTiempos();
    });

    describe('normalizarFiltros', () => {
        it('por defecto consulta el día de hoy', () => {
            const filtros = ventasService.normalizarFiltros({});
            const hoy = ventasService.fechaLocalISO(new Date());
            expect(filtros.desde).toBe(hoy);
            expect(filtros.hasta).toBe(hoy);
            expect(filtros.estado).toBe('todas');
        });

        it('ordena el rango si llega invertido y valida el estado', () => {
            const filtros = ventasService.normalizarFiltros({
                desde: '2026-08-29', hasta: '2026-08-01', estado: 'inventario', q: '  nro 8 '
            });
            expect(filtros.desde).toBe('2026-08-01');
            expect(filtros.hasta).toBe('2026-08-29');
            expect(filtros.estado).toBe('todas');
            expect(filtros.q).toBe('nro 8');
        });

        it('admite solo los estados del catálogo', () => {
            expect(ventasService.normalizarFiltros({ estado: 'pendiente_pago' }).estado).toBe('pendiente_pago');
            expect(ventasService.normalizarFiltros({ estado: 'abiertas' }).estado).toBe('abiertas');
            expect(ventasService.normalizarFiltros({ estado: 'DROP TABLE' }).estado).toBe('todas');
        });

        it('descarta identificadores no numéricos', () => {
            const filtros = ventasService.normalizarFiltros({ turno_id: '4', mesero_id: 'abc', mesa_id: '-3' });
            expect(filtros.turno_id).toBe(4);
            expect(filtros.mesero_id).toBeNull();
            expect(filtros.mesa_id).toBeNull();
        });

        it('limita el rango a un año para no tumbar la consulta', () => {
            const filtros = ventasService.normalizarFiltros({ desde: '2020-01-01', hasta: '2026-08-29' });
            const dias = (new Date(filtros.hasta) - new Date(filtros.desde)) / 86400000;
            expect(dias).toBeLessThanOrEqual(366);
        });
    });

    describe('formatearDuracion', () => {
        it('devuelve h:m:s', () => {
            expect(ventasService.formatearDuracion(0)).toBe('0:00:00');
            expect(ventasService.formatearDuracion(50)).toBe('0:00:50');
            expect(ventasService.formatearDuracion(3661)).toBe('1:01:01');
            expect(ventasService.formatearDuracion(1830)).toBe('0:30:30');
        });

        it('devuelve null sin datos o con valores inválidos', () => {
            expect(ventasService.formatearDuracion(null)).toBeNull();
            expect(ventasService.formatearDuracion(-5)).toBeNull();
            expect(ventasService.formatearDuracion('abc')).toBeNull();
        });
    });

    describe('construirWhere', () => {
        it('acota por el rango completo del día', () => {
            const { sql, params } = ventasService.construirWhere(
                ventasService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-29' })
            );
            expect(sql).toContain('p.creado_en BETWEEN ? AND ?');
            expect(params).toEqual(['2026-08-29 00:00:00', '2026-08-29 23:59:59']);
        });

        it('traduce el filtro de estado a su condición', () => {
            expect(ventasService.construirWhere({ ...ventasService.normalizarFiltros({}), estado: 'abiertas' }).sql)
                .toContain('p.fecha_cierre IS NULL');
            expect(ventasService.construirWhere({ ...ventasService.normalizarFiltros({}), estado: 'pagado' }).params)
                .toContain('pagado');
        });

        it('busca por número de pedido, mesa o cliente', () => {
            const { sql, params } = ventasService.construirWhere(
                ventasService.normalizarFiltros({ q: '22' })
            );
            expect(sql).toContain('m.numero LIKE ?');
            expect(params).toContain('%22%');
            expect(params).toContain(22);
        });
    });

    describe('tiempoEntregaItem', () => {
        it('mide desde el envío a producción hasta la entrega', () => {
            expect(ventasService.tiempoEntregaItem(ITEM_ENTREGADO)).toBe(30);
        });

        it('usa el alta del ítem y el "listo" cuando faltan sellos', () => {
            expect(ventasService.tiempoEntregaItem({
                creado_en: new Date(2026, 7, 29, 12, 0, 0),
                listo_en: new Date(2026, 7, 29, 12, 4, 5)
            })).toBe(245);
        });

        it('devuelve null sin fechas o con secuencias imposibles', () => {
            expect(ventasService.tiempoEntregaItem({})).toBeNull();
            expect(ventasService.tiempoEntregaItem({
                enviado_en: new Date(2026, 7, 29, 12, 5, 0),
                entregado_en: new Date(2026, 7, 29, 12, 1, 0)
            })).toBeNull();
        });
    });

    describe('resumenMonedas', () => {
        it('agrupa varios pagos de la misma moneda', () => {
            const resumen = ventasService.resumenMonedas([
                { moneda_codigo: 'CUP', moneda_simbolo: '$', monto_moneda_origen: 500, monto_equivalente_local: 500 },
                { moneda_codigo: 'CUP', moneda_simbolo: '$', monto_moneda_origen: 250, monto_equivalente_local: 250 },
                { moneda_codigo: 'USD', moneda_simbolo: '$', monto_moneda_origen: 5, monto_equivalente_local: 3300 }
            ]);
            expect(resumen).toHaveLength(2);
            expect(resumen.find(m => m.codigo === 'CUP').monto_origen).toBe(750);
            expect(resumen.find(m => m.codigo === 'USD').monto_local).toBe(3300);
        });
    });

    describe('listarVentas', () => {
        it('ensambla el pedido con sus ítems, tiempos, pagos y estado', async () => {
            mockearDb();
            const filtros = ventasService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-29' });
            const resultado = await ventasService.listarVentas(filtros, { pagina: 1, porPagina: 25 });

            expect(resultado.filas).toHaveLength(1);
            const pedido = resultado.filas[0];

            // Cabecera
            expect(pedido.mesa_numero).toBe('Nro 8');           // número real, no el id de BD
            expect(pedido.mesa_ubicacion).toBe('Terraza');
            expect(pedido.mesero).toBe('Maria Gonzalez Diaz');
            expect(pedido.apertura_hora).toBe('12:09:27');
            expect(pedido.cierre_hora).toBe('12:10:17');
            expect(pedido.duracion).toBe('0:00:50');
            expect(pedido.estado_clave).toBe('pagado');
            expect(pedido.estado_etiqueta).toBe('Cobradas');
            expect(pedido.turno_etiqueta).toContain('Turno #4');
            expect(pedido.propina).toBe(35);

            // Ítems y tiempos
            expect(pedido.items).toHaveLength(2);
            expect(pedido.items_entregados).toBe(1);
            expect(pedido.items_cancelados).toBe(1);
            expect(pedido.items_pendientes).toBe(0);
            const item = pedido.items.find(i => i.detalle_id === 52);
            expect(item.tiempo_entrega).toBe('0:00:30');
            expect(item.cocinero).toBe('Felipe Jose Franco Holland');
            expect(item.entregado_por).toBe('Maria Gonzalez Diaz');
            expect(item.area_preparacion).toBe('bar');
            expect(item.modificadores.map(m => m.nombre)).toEqual(['Sin gluten']);
            expect(pedido.tiempo_medio).toBe('0:00:30');

            // Pagos
            expect(pedido.monedas).toEqual([{ codigo: 'CUP', simbolo: '$', monto_origen: 350, monto_local: 350 }]);
            expect(pedido.pagos[0].metodo_etiqueta).toBe('Efectivo');

            // Totales del período
            expect(resultado.totales.pedidos).toBe(1);
            expect(resultado.totales.propinas).toBe(35);
            expect(resultado.totales.duracion_media).toBe('0:00:50');
            expect(resultado.tiemposDisponibles).toBe(true);
        });

        it('sigue funcionando (sin tiempos) si la migración no está aplicada', async () => {
            mockearDb({ sinColumnasDeTiempos: true });
            const filtros = ventasService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-29' });
            const resultado = await ventasService.listarVentas(filtros, { pagina: 1, porPagina: 25 });

            expect(resultado.filas).toHaveLength(1);
            expect(resultado.tiemposDisponibles).toBe(false);
            expect(resultado.filas[0].items[0].tiempo_entrega).toBeNull();
            expect(resultado.filas[0].items[0].nombre).toBe('Cerveza Nacional');
        });
    });

    describe('ventasACSV', () => {
        const resultadoBase = {
            filtros: { desde: '2026-08-29', hasta: '2026-08-29', q: '', estado: 'todas' },
            totales: { pedidos: 1, importe: 350, propinas: 35, subtotal: 350, descuentos: 0, abiertas: 0, items_entregados: 1, items_cancelados: 1, duracion_media: '0:00:50', por_moneda: MONEDAS_TOTALES.map(m => ({ ...m, monto_origen: 350, monto_local: 350 })) },
            filas: []
        };

        it('exporta el resumen con BOM y separador punto y coma', async () => {
            mockearDb();
            const resultado = await ventasService.listarVentas(
                ventasService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-29' })
            );
            const { csv, filas } = ventasService.ventasACSV(resultado);

            expect(csv.startsWith('\uFEFF')).toBe(true);
            expect(csv).toContain('Pedido;Apertura;Cierre;Duración servicio');
            expect(csv).toContain('22;2026-08-29 12:09:27;2026-08-29 12:10:17;0:00:50');
            expect(csv).toContain('Nro 8');
            expect(csv).toContain('TOTALES;1 pedidos');
            expect(filas).toBe(1);
        });

        it('exporta una fila por ítem con el tiempo de entrega', async () => {
            mockearDb();
            const resultado = await ventasService.listarVentas(
                ventasService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-29' })
            );
            const { csv, filas } = ventasService.ventasACSV(resultado, { detalle: true });

            expect(csv).toContain('Tiempo entrega (h:m:s);Cocinero;Entregó');
            expect(csv).toContain('Cerveza Nacional');
            expect(csv).toContain('0:00:30');
            expect(csv).toContain('Felipe Jose Franco Holland');
            expect(filas).toBe(2);
        });

        it('no rompe con un período vacío', () => {
            const { csv, filas } = ventasService.ventasACSV({ ...resultadoBase, filas: [] }, { detalle: true });
            expect(csv).toContain('Ítems exportados;0');
            expect(filas).toBe(0);
        });
    });
});
