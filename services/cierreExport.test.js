// services/cierreExport.test.js
// Verifica las exportaciones del cierre del día y del histórico de cierres:
// CSV con BOM + ';' y PDFs gemelos.
const CierreExport = require('./cierreExport');

const turno = { id: 5 };
const pedidos = [
    { id: 101, nombre_mesa: 'Mesa 3', mesero: 'Ana Pérez', total: 150.5, propina: 10,
      estado_pago: 'pagado', fecha_cierre: new Date('2026-10-10 13:45:00') },
    { id: 102, nombre_mesa: 'Mesa 1', mesero: 'Luis Gómez', total: 80, propina: 0,
      estado_pago: 'facturado', fecha_cierre: null },
    { id: 103, nombre_mesa: null, mesero: null, total: 40, propina: 0,
      estado_pago: 'cortesia', fecha_cierre: null },
];
const desglosePagos = [
    { metodo_pago: 'efectivo', codigo_moneda: 'CUP', simbolo: '$',
      total_origen: 160.5, total_local: 160.5, total_transacciones: 2 },
];
const resumen = { total_cobrado_caja: 150.5, total_propinas: 10, total_efectivo_total_caja: 160.5,
    total_cxc_facturas: 80, total_pendiente_pago: 0, total_cortesias: 40,
    total_pedidos: 3, fondo_apertura: 500, total_en_caja_esperado: 660.5 };

const cierres = [
    { turno_servicio_id: 4, fecha_cierre: new Date('2026-10-09 23:00:00'),
      usuario_apertura: 'Ana P', usuario_cierre: 'Carlos R',
      total_cobrado_caja: 1000, total_propinas: 50,
      monto_real_entregado: 1050, monto_esperado_caja: 1050, balance_estado: 'cuadrado' },
    { turno_servicio_id: 3, fecha_cierre: new Date('2026-10-08 23:00:00'),
      usuario_apertura: 'Ana P', usuario_cierre: 'Carlos R',
      total_cobrado_caja: 900, total_propinas: 20,
      monto_real_entregado: 915, monto_esperado_caja: 920, balance_estado: 'faltante' },
];
const facturasPendientes = [
    { id: 77, nombre_mesa: 'Mesa 2', mesero: 'Luis Gómez', total: 250,
      fecha_pedido: new Date('2026-10-07 12:00:00'), turno_servicio_id: 2 },
];
const metricas = { totalCierres: 2, totalRecaudado: 1900, totalCxCPendiente: 250, cantidadFacturasPendientes: 1 };

describe('cierreExport · etiquetas', () => {
    it('estadoPagoLabel cubre los 5 estados', () => {
        expect(CierreExport.estadoPagoLabel('facturado')).toBe('Factura (CxC)');
        expect(CierreExport.estadoPagoLabel('pendiente_pago')).toBe('Pendiente Pago');
        expect(CierreExport.estadoPagoLabel('cortesia')).toBe('Cortesía');
        expect(CierreExport.estadoPagoLabel('pendiente')).toBe('En Consumo');
        expect(CierreExport.estadoPagoLabel('pagado')).toBe('Pagado');
    });

    it('balanceLabel cubre los 3 balances', () => {
        expect(CierreExport.balanceLabel('cuadrado')).toBe('Cuadrado');
        expect(CierreExport.balanceLabel('faltante')).toBe('Faltante');
        expect(CierreExport.balanceLabel('sobrante')).toBe('Sobrante');
    });
});

describe('cierreExport · cierreACSV / cierreAPDF', () => {
    it('genera CSV con resumen, pedidos y desglose', () => {
        const { csv, filas } = CierreExport.cierreACSV({ turno, pedidos, desglosePagos, resumen });
        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(csv).toContain('Cierre del día');
        expect(csv).toContain('Turno;#5');
        expect(csv).toContain('Efectivo esperado en caja;660,50');
        expect(csv).toContain('Orden;Mesa;Mesero;Monto;Propina;Estado;Hora');
        expect(csv).toContain('Factura (CxC)');
        expect(csv).toContain('Cortesía');
        expect(csv).toContain('Método;Moneda;Transacciones;Total origen;Total (CUP)');
        expect(filas).toBe(3);
    });

    it('genera un PDF válido', async () => {
        const pdf = await CierreExport.cierreAPDF({ turno, pedidos, desglosePagos, resumen }, { generadoPor: 'Prueba' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });
});

describe('cierreExport · historicoACSV / historicoAPDF', () => {
    it('genera CSV con cierres, facturas y métricas', () => {
        const { csv, filas } = CierreExport.historicoACSV({ cierres, facturasPendientes, metricas });
        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(csv).toContain('Histórico de cierres y cuentas por cobrar');
        expect(csv).toContain('Turno;Fecha cierre;Abrió;Cerró;Cobrado;Propinas;Real;Esperado;Balance');
        expect(csv).toContain('Cuadrado');
        expect(csv).toContain('Faltante');
        expect(csv).toContain('Orden;Mesa;Mesero;Total;Fecha pedido;Turno origen');
        expect(csv).toContain('Total recaudado;1900,00');
        expect(csv).toContain('CxC pendiente;250,00');
        expect(filas).toBe(2);
    });

    it('genera un PDF válido', async () => {
        const pdf = await CierreExport.historicoAPDF({ cierres, facturasPendientes, metricas }, { generadoPor: 'Prueba' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });
});
