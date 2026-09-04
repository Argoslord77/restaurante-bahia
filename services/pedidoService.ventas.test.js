// services/pedidoService.ventas.test.js
// Pruebas del armado del reporte (agrupación de ítems/pagos por pedido) y de
// la exportación a CSV de Pedidos / Ventas.
const pedidoService = require('./pedidoService');
const PedidoModel = require('../models/pedidoModel');

jest.mock('../models/pedidoModel');
jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

describe('pedidoService · reporte de Pedidos / Ventas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarVentas', () => {
    it('adjunta a cada pedido sus ítems y sus pagos por moneda', async () => {
      PedidoModel.getVentasFiltradas.mockResolvedValue({
        rows: [
          { id: 10, total: 100 },
          { id: 11, total: 200 }
        ],
        total: 2, pagina: 1, porPagina: 50, totalPaginas: 1
      });
      PedidoModel.getItemsPorPedidos.mockResolvedValue([
        { id: 1, id_pedido: 10, nombre_platillo: 'Pasta', estado_item: 'entregado' },
        { id: 2, id_pedido: 11, nombre_platillo: 'Pizza', estado_item: 'en_cocina' }
      ]);
      PedidoModel.getPagosPorPedidos.mockResolvedValue([
        { pedido_id: 10, monto_moneda_origen: 5, moneda_codigo: 'USD', factor_cambio_aplicado: 420 },
        { pedido_id: 10, monto_moneda_origen: 100, moneda_codigo: 'CUP', factor_cambio_aplicado: 1 }
      ]);

      const resultado = await pedidoService.listarVentas({ desde: '2026-09-04' });

      expect(PedidoModel.getItemsPorPedidos).toHaveBeenCalledWith([10, 11]);
      expect(PedidoModel.getPagosPorPedidos).toHaveBeenCalledWith([10, 11]);

      expect(resultado.rows[0].items).toHaveLength(1);
      expect(resultado.rows[0].items[0].nombre_platillo).toBe('Pasta');
      expect(resultado.rows[0].pagos).toHaveLength(2);
      expect(resultado.rows[1].items[0].nombre_platillo).toBe('Pizza');
      expect(resultado.rows[1].pagos).toEqual([]);
    });

    it('con página vacía no consulta desgloses', async () => {
      PedidoModel.getVentasFiltradas.mockResolvedValue({ rows: [], total: 0, pagina: 1, porPagina: 50, totalPaginas: 1 });

      const resultado = await pedidoService.listarVentas({});

      expect(PedidoModel.getItemsPorPedidos).not.toHaveBeenCalled();
      expect(PedidoModel.getPagosPorPedidos).not.toHaveBeenCalled();
      expect(resultado.rows).toEqual([]);
    });

    it('si el resumen falla devuelve ceros sin tumbar la vista', async () => {
      PedidoModel.getResumenVentas.mockRejectedValue(new Error('boom'));
      const resumen = await pedidoService.resumenVentas({});
      expect(resumen).toEqual({ total_pedidos: 0, en_curso: 0, cobrados: 0, importe_cobrado: 0, propinas: 0 });
    });
  });

  describe('exportarVentasCSV', () => {
    it('genera CSV con BOM, separador ;, duración h:m:s y desgloses', async () => {
      PedidoModel.getParaExportarVentas.mockResolvedValue([
        {
          id: 10, creado_en: new Date('2026-09-04T13:30:00'),
          turno_id: 3, turno_usuario: 'ana', turno_apertura: new Date('2026-09-04T10:00:00'),
          numero_mesa: '5', ubicacion_mesa: 'Terraza',
          mesero_nombre: 'Luis Pérez', mesero_usuario: 'luis',
          comensales: 2, cliente_nombre: 'Marta',
          estado_pedido: 'entregado', estado_pago: 'pagado',
          subtotal: 100, descuento: 0, impuesto: 0, total: 100, propina: 10,
          fecha_cierre: new Date('2026-09-04T14:15:00'),
          duracion_seg: 2700,
          items_total: 2, items_entregados: 2, items_cancelados: 0,
          cajero_usuario: 'caja1'
        }
      ]);
      PedidoModel.getItemsPorPedidos.mockResolvedValue([
        {
          id: 1, id_pedido: 10, cantidad: 2, nombre_platillo: 'Pasta', estado_item: 'entregado',
          cocinero_nombre: 'Che Argos',
          hora_enviado: new Date('2026-09-04T13:35:00'),
          hora_entregado: new Date('2026-09-04T14:05:00')
        }
      ]);
      PedidoModel.getPagosPorPedidos.mockResolvedValue([
        { pedido_id: 10, monto_moneda_origen: 5, moneda_codigo: 'USD', factor_cambio_aplicado: 420 }
      ]);

      const { csv, filas } = await pedidoService.exportarVentasCSV({ desde: '2026-09-04' });

      expect(filas).toBe(1);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      // Cabecera sin entrecomillar (misma convención que salidas/auditoría),
      // campos de datos siempre entrecomillados
      expect(csv).toContain('Pedido;Fecha apertura;Turno;Mesa;Ubicacion');
      expect(csv).toContain('"#3 ana 2026-09-04"');
      expect(csv).toContain('"00:45:00"');           // duración del servicio
      expect(csv).toContain('"5.00 USD (x420.00)"'); // desglose de monedas
      expect(csv).toContain('"2x Pasta [entregado] (Che Argos) entrega 00:30:00"');
      // Todos los campos de DATOS entrecomillados (la cabecera no, por
      // convención de las exportaciones existentes)
      const lineas = csv.split('\r\n');
      for (const linea of lineas.slice(1)) {
        if (linea) expect(linea.split(';').every(c => c.startsWith('"'))).toBe(true);
      }
    });
  });
});
