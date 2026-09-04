// controllers/pedidoController.ventas.test.js
// Pruebas de la lectura de filtros del reporte de Pedidos / Ventas (hoy por
// defecto; rango presente pero vacío = todo el histórico) y de la cabecera
// de la exportación a CSV.
const pedidoController = require('./pedidoController');

describe('pedidoController · filtros del reporte de Pedidos / Ventas', () => {
  const hoy = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  it('sin parámetros el período por defecto es HOY', () => {
    const f = pedidoController._leerFiltrosVentas({});
    expect(f.desde).toBe(hoy);
    expect(f.hasta).toBe(hoy);
    expect(f.estado).toBe('todos');
    expect(f.orden).toBe('fecha');
    expect(f.dir).toBe('desc');
  });

  it('parámetro presente pero vacío significa TODO el histórico', () => {
    const f = pedidoController._leerFiltrosVentas({ desde: '', hasta: '' });
    expect(f.desde).toBe('');
    expect(f.hasta).toBe('');
  });

  it('solo uno de los extremos presente y vacío respeta el otro', () => {
    const f = pedidoController._leerFiltrosVentas({ desde: '2026-09-01', hasta: '' });
    expect(f.desde).toBe('2026-09-01');
    expect(f.hasta).toBe('');
  });

  it('rechaza fechas mal formadas y vuelve al día de hoy', () => {
    const f = pedidoController._leerFiltrosVentas({ desde: '04-09-2026' });
    expect(f.desde).toBe(hoy);
  });

  it('normaliza estado, orden, dirección y búsqueda', () => {
    const f = pedidoController._leerFiltrosVentas({
      estado: 'curso', orden: 'total', dir: 'ASC', buscar: '  Juan  ', mesa: '5'
    });
    expect(f).toMatchObject({ estado: 'curso', orden: 'total', dir: 'asc', buscar: 'Juan', mesa: '5' });

    const invalido = pedidoController._leerFiltrosVentas({ estado: 'x', orden: 'y', dir: 'zz' });
    expect(invalido).toMatchObject({ estado: 'todos', orden: 'fecha', dir: 'desc' });
  });
});

describe('pedidoController · exportarPedidosCSV', () => {
  it('responde con las cabeceras de descarga CSV', async () => {
    const pedidoService = require('../services/pedidoService');
    const original = pedidoService.exportarVentasCSV;
    pedidoService.exportarVentasCSV = jest.fn().mockResolvedValue({ csv: '\uFEFFa;b', filas: 3 });

    const res = {
      setHeader: jest.fn(),
      send: jest.fn()
    };

    await pedidoController.exportarPedidosCSV({ query: {} }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    const llamadaNombre = res.setHeader.mock.calls.find(c => c[0] === 'Content-Disposition');
    expect(llamadaNombre[1]).toMatch(/^attachment; filename="pedidos_ventas_[\d-]+\.csv"$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Exportacion-Filas', '3');
    expect(res.send).toHaveBeenCalledWith('\uFEFFa;b');

    pedidoService.exportarVentasCSV = original;
  });
});
