// controllers/pedidoController.test.js
// La vista de Ventas / Pedidos pasó de un listado de mesas abiertas a un
// reporte por rango de fechas. Estas pruebas fijan el contrato entre el
// controlador y el servicio de reportes: mismos filtros en pantalla y en el
// CSV, mesas reales en el modal (número, no ID) y las cuentas en curso
// disponibles para las acciones de siempre.
jest.mock('../config/db');
jest.mock('../services/pedidoService');
jest.mock('../services/inventarioService');
jest.mock('../services/tableService', () => ({
    getAllTables: jest.fn()
}));
jest.mock('../services/reportesService', () => ({
    normalizarRangoDelDia: jest.fn(),
    leerFiltrosPedidos: jest.fn(),
    pedidosVentas: jest.fn(),
    pedidosVentasACSV: jest.fn()
}));

const controlador = require('./pedidoController');
const ReportesService = require('../services/reportesService');
const TableService = require('../services/tableService');

const CUENTA = (over = {}) => Object.assign({
    id: 31, mesa_numero: '12', en_curso: false, total: 1400,
    items: [], conteo: { lineas: 1, unidades: 1, entregados: 1, cancelados: 0, pendientes: 0 }
}, over);

const REPORTE = (pedidos) => ({
    desde: '2026-09-04', hasta: '2026-09-04', trazabilidad: true, pedidos,
    filtros: {}, opciones: { turnos: [], meseros: [], areas: [] },
    totales: { cuentas: pedidos.length, en_curso: pedidos.filter(p => p.en_curso).length, venta: 1400 }
});

function crearRes() {
    return {
        statusCode: null, locals: null, html: null, redirected: null, headers: {},
        status(c) { this.statusCode = c; return this; },
        render(vista, locals) { this.vista = vista; this.locals = locals; return this; },
        send(html) { this.html = html; return this; },
        setHeader(k, v) { this.headers[k] = v; return this; },
        redirect(url) { this.redirected = url; return this; }
    };
}

describe('pedidoController.listarPedidos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ReportesService.normalizarRangoDelDia.mockReturnValue({ desde: '2026-09-04', hasta: '2026-09-04' });
        ReportesService.leerFiltrosPedidos.mockReturnValue({ turnoId: 4, soloEnCurso: false });
        TableService.getAllTables.mockResolvedValue([
            { id: 12, numero: '12', capacidad: 4, estado: 'libre', ubicacion: 'Salón', pedido_id: null },
            { id: 13, numero: '13', capacidad: 6, estado: 'ocupada', ubicacion: 'Terraza', pedido_id: 32 },
            { id: 14, numero: '14', capacidad: 2, estado: 'mantenimiento', ubicacion: 'Salón', pedido_id: null }
        ]);
    });

    test('renderiza el reporte con rango, filtros y las mesas aptas para abrir orden', async () => {
        ReportesService.pedidosVentas.mockResolvedValue(REPORTE([
            CUENTA(), CUENTA({ id: 32, en_curso: true })
        ]));

        const req = { query: { turno: '4' }, user: { id: 1, rol: 'administrador' }, flash: () => [] };
        const res = crearRes();
        await controlador.listarPedidos(req, res);

        expect(ReportesService.pedidosVentas).toHaveBeenCalledWith({
            rango: { desde: '2026-09-04', hasta: '2026-09-04' },
            filtros: { turnoId: 4, soloEnCurso: false }
        });
        expect(res.vista).toBe('pedido/pedido');
        expect(res.locals.rango).toEqual({ desde: '2026-09-04', hasta: '2026-09-04' });
        expect(res.locals.reporte.totales.cuentas).toBe(2);
        // `lista` se conserva: las acciones de siempre solo aplican a lo abierto
        expect(res.locals.lista.map(p => p.id)).toEqual([32]);
        // Mantenimiento fuera; la mesa con orden activa se marca deshabilitada
        expect(res.locals.mesas.map(m => m.numero)).toEqual(['12', '13']);
        expect(res.locals.mesas[1].pedido_activo).toBe(32);
    });

    test('si el catálogo de mesas falla, la vista sigue abriendo con el reporte', async () => {
        ReportesService.pedidosVentas.mockResolvedValue(REPORTE([CUENTA()]));
        TableService.getAllTables.mockRejectedValue(new Error('sin tabla de áreas'));

        const res = crearRes();
        await controlador.listarPedidos({ query: {}, user: { rol: 'cajero' }, flash: () => [] }, res);

        expect(res.locals.mesas).toEqual([]);
        expect(res.locals.reporte.pedidos).toHaveLength(1);
    });

    test('un fallo del reporte devuelve 500 en lugar de media página', async () => {
        ReportesService.pedidosVentas.mockRejectedValue(new Error('boom'));

        const res = crearRes();
        await controlador.listarPedidos({ query: {}, user: { rol: 'administrador' }, flash: () => [] }, res);

        expect(res.statusCode).toBe(500);
    });
});

describe('pedidoController.exportarPedidos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ReportesService.normalizarRangoDelDia.mockReturnValue({ desde: '2026-09-01', hasta: '2026-09-04' });
        ReportesService.leerFiltrosPedidos.mockReturnValue({});
    });

    test('exporta exactamente lo que se ve: mismo rango, cabeceras de CSV', async () => {
        // El CSV se nombra con el rango que devolvió el reporte (lo consultado)
        ReportesService.pedidosVentas.mockResolvedValue(Object.assign(
            REPORTE([CUENTA(), CUENTA({ id: 32 })]),
            { desde: '2026-09-01', hasta: '2026-09-04' }
        ));
        ReportesService.pedidosVentasACSV.mockReturnValue('\uFEFFPedido;Mesa\r\n31;12\r\n');

        const res = crearRes();
        await controlador.exportarPedidos({ query: {}, user: { rol: 'economico' }, flash: () => [] }, res);

        expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
        expect(res.headers['Content-Disposition']).toContain('pedidos_ventas_2026-09-01_2026-09-04');
        expect(res.headers['X-Reporte-Filas']).toBe('2');
        expect(res.html).toContain('Pedido;Mesa');
    });

    test('si el reporte falla, se vuelve a la vista en vez de descargar un archivo roto', async () => {
        ReportesService.pedidosVentas.mockRejectedValue(new Error('boom'));

        const res = crearRes();
        await controlador.exportarPedidos({ query: {}, user: { rol: 'cajero' }, flash: () => [] }, res);

        expect(res.redirected).toBe('/admin/pedidos');
    });
});
