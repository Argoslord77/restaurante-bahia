// models/pedidoModel.ventas.test.js
// Pruebas del reporte profesional de Pedidos / Ventas y de las marcas de
// tiempo de los ítems (hora_enviado / hora_listo / hora_entregado / cocinado_por).
const db = require('../config/db');
const Pedido = require('./pedidoModel');

jest.mock('../config/db');

describe('Pedido · reporte de Pedidos / Ventas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('construirFiltrosVentas', () => {
    it('aplica el rango de fechas sobre p.creado_en', () => {
      const { clause, params } = Pedido.construirFiltrosVentas({ desde: '2026-09-01', hasta: '2026-09-04' });
      expect(clause).toContain('p.creado_en >= ?');
      expect(clause).toContain('p.creado_en <= ?');
      expect(params).toContain('2026-09-01 00:00:00');
      expect(params).toContain('2026-09-04 23:59:59');
    });

    it('ignora fechas con formato inválido', () => {
      const { clause } = Pedido.construirFiltrosVentas({ desde: '09/01/2026', hasta: "'; DROP TABLE" });
      expect(clause).toBe('');
    });

    it('traduce cada estado del filtro a su condición SQL', () => {
      const curso = Pedido.construirFiltrosVentas({ estado: 'curso' });
      expect(curso.clause).toContain('p.fecha_cierre IS NULL');

      const cobrados = Pedido.construirFiltrosVentas({ estado: 'cobrados' });
      expect(cobrados.clause).toContain("p.estado_pago NOT IN ('cancelado','cortesia')");

      const cortesia = Pedido.construirFiltrosVentas({ estado: 'cortesia' });
      expect(cortesia.clause).toContain("p.estado_pago = 'cortesia'");

      const anulados = Pedido.construirFiltrosVentas({ estado: 'anulados' });
      expect(anulados.clause).toContain("p.estado_pago = 'cancelado'");

      // Estado desconocido → no agrega condición de estado
      expect(Pedido.construirFiltrosVentas({ estado: 'cualquier-cosa' }).clause).toBe('');
    });

    it('valida turno, dependiente y mesa', () => {
      const { clause, params } = Pedido.construirFiltrosVentas({
        turnoId: '7', meseroId: '3', mesa: ' 12 '
      });
      expect(clause).toContain('p.turno_servicio_id = ?');
      expect(clause).toContain('p.id_usuario_mesero = ?');
      expect(clause).toContain('m.numero = ?');
      expect(params).toEqual([7, 3, '12']);
    });

    it('la búsqueda numérica busca por id exacto o nombre del cliente', () => {
      const { clause, params } = Pedido.construirFiltrosVentas({ buscar: '45' });
      expect(clause).toContain('(p.id = ? OR p.cliente_nombre LIKE ?)');
      expect(params).toEqual([45, '%45%']);
    });

    it('la búsqueda textual solo mira el nombre del cliente', () => {
      const { clause, params } = Pedido.construirFiltrosVentas({ buscar: 'Juan' });
      expect(clause).toContain('p.cliente_nombre LIKE ?');
      expect(params).toEqual(['%Juan%']);
    });
  });

  describe('getVentasFiltradas', () => {
    it('consulta el total y la página con los joins del reporte', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 2 }]])   // COUNT
        .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]); // página

      const resultado = await Pedido.getVentasFiltradas({ desde: '2026-09-04' });

      expect(resultado).toMatchObject({ total: 2, pagina: 1, porPagina: 50, totalPaginas: 1 });
      expect(resultado.rows).toHaveLength(2);

      const [countSql] = db.query.mock.calls[0];
      const [listSql] = db.query.mock.calls[1];
      for (const sql of [countSql, listSql]) {
        expect(sql).toContain('INNER JOIN mesas m ON p.id_mesa = m.id');
        expect(sql).toContain('LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id');
        expect(sql).toContain('INNER JOIN turnos_servicio ts ON p.turno_servicio_id = ts.id');
      }
      expect(countSql).toContain('SELECT COUNT(*) AS total');
      // La duración del servicio (apertura → cierre) viaja con cada fila
      expect(listSql).toContain('TIMESTAMPDIFF(SECOND, p.creado_en, COALESCE(p.fecha_cierre, NOW())) AS duracion_seg');
      expect(listSql).toContain('ORDER BY p.creado_en DESC, p.id DESC');
      expect(listSql).toContain('LIMIT ? OFFSET ?');
    });

    it('respeta el whitelist de columnas de orden y normaliza la paginación', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]]);

      await Pedido.getVentasFiltradas({ orden: 'total', dir: 'ASC', pagina: '-4', porPagina: '999' });

      const [listSql, listParams] = db.query.mock.calls[1];
      expect(listSql).toContain('ORDER BY p.total ASC, p.id DESC');
      // página negativa → 1; porPagina fuera de whitelist → 50
      expect(listParams.slice(-2)).toEqual([50, 0]);
    });

    it('rechaza columnas de orden desconocidas y cae a la fecha', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]]);

      await Pedido.getVentasFiltradas({ orden: 'password' });

      const [listSql] = db.query.mock.calls[1];
      expect(listSql).toContain('ORDER BY p.creado_en DESC');
      expect(listSql).not.toContain('ORDER BY password');
    });
  });

  describe('getResumenVentas', () => {
    it('totaliza cuentas, en curso, cobrado y propinas del conjunto filtrado', async () => {
      const resumen = { total_pedidos: 10, en_curso: 3, cobrados: 6, importe_cobrado: 4500, propinas: 120 };
      db.query.mockResolvedValueOnce([[resumen]]);

      const resultado = await Pedido.getResumenVentas({ desde: '2026-09-04' });

      expect(resultado).toEqual(resumen);
      const [sql] = db.query.mock.calls[0];
      expect(sql).toContain('AS total_pedidos');
      expect(sql).toContain('AS importe_cobrado');
      expect(sql).toContain('AS propinas');
    });
  });

  describe('getItemsPorPedidos / getPagosPorPedidos', () => {
    it('no consulta cuando no hay pedidos', async () => {
      expect(await Pedido.getItemsPorPedidos([])).toEqual([]);
      expect(await Pedido.getPagosPorPedidos(null)).toEqual([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('trae el desglose de ítems con cocinero y marcas de tiempo', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1, id_pedido: 9, nombre_platillo: 'Pasta' }]]);

      const rows = await Pedido.getItemsPorPedidos([9]);

      expect(rows[0].nombre_platillo).toBe('Pasta');
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('dp.hora_enviado, dp.hora_listo, dp.hora_entregado');
      expect(sql).toContain('LEFT JOIN usuarios cu ON dp.cocinado_por = cu.id');
      expect(sql).toContain('WHERE dp.id_pedido IN (?)');
      expect(params).toEqual([[9]]);
    });

    it('trae los pagos con la moneda de cada abono', async () => {
      db.query.mockResolvedValueOnce([[{ pedido_id: 9, moneda_codigo: 'USD' }]]);

      await Pedido.getPagosPorPedidos([9]);

      const [sql] = db.query.mock.calls[0];
      expect(sql).toContain('FROM pagos_pedido pp');
      expect(sql).toContain('LEFT JOIN monedas mo ON pp.moneda_id = mo.id');
    });
  });

  describe('getParaExportarVentas', () => {
    it('limita la exportación a un tope razonable', async () => {
      db.query.mockResolvedValueOnce([[]]);

      await Pedido.getParaExportarVentas({}, 999999);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('ORDER BY p.creado_en DESC, p.id DESC');
      expect(params.slice(-1)).toEqual([50000]);
    });
  });
});

describe('Pedido · marcas de tiempo de los ítems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marca hora_enviado al entrar a producción', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await Pedido.updateEstadoItem(5, 'en_cocina');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('hora_enviado = COALESCE(hora_enviado, NOW())');
    expect(sql).not.toContain('hora_listo');
    expect(params).toEqual(['en_cocina', 5]);
  });

  it('marca hora_listo y al cocinero al pasar a listo', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await Pedido.updateEstadoItem(5, 'listo', db, 42);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('hora_listo = COALESCE(hora_listo, NOW())');
    expect(sql).toContain('cocinado_por = COALESCE(cocinado_por, ?)');
    expect(params).toEqual(['listo', 42, 5]);
  });

  it('en listo sin usuario deja cocinado_por en NULL (COALESCE)', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await Pedido.updateEstadoItem(5, 'listo');

    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual(['listo', null, 5]);
  });

  it('marca hora_entregado al entregar', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await Pedido.updateEstadoItem(5, 'entregado');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('hora_entregado = COALESCE(hora_entregado, NOW())');
    expect(params).toEqual(['entregado', 5]);
  });

  it('un estado neutro solo actualiza estado_item', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await Pedido.updateEstadoItem(5, 'cancelado');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toBe('UPDATE detalles_pedido SET estado_item = ? WHERE id = ?');
    expect(params).toEqual(['cancelado', 5]);
  });
});
