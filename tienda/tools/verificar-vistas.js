// Verificación definitiva: renderiza TODAS las vistas con datos realistas.
// Falla si alguna variable del controlador falta o una forma no cuadra.
// Guardián permanente: npm run verificar:vistas  (desde tienda/)
// Renderiza las 18 vistas con datos realistas; falla si falta una variable
// o si aparece $NaN/undefined en el HTML (columna silenciosa).
const ejs = require('ejs');
const G = {
    sesion: { rol: 'admin', nombre: 'Admin', usuario: 'admin' },
    ok_msg: [], error_msg: [], licencia: { estado: 'ACTIVA' }
};
const AHORA = new Date('2026-10-06T12:00:00');
const F = { desde: '2026-10-01', hasta: '2026-10-06' };

const casos = [
    ['ajustes', 'views/ajustes.ejs', { ajustes: { negocio_nombre: 'T', iva_pct: 16, ticket_pie: 'G' } }],
    ['caja abierta', 'views/caja.ejs', {
        turno: { id: 1, fondo_inicial: 100 },
        resumen: { cambio_total: 0, esperado_efectivo: 150, n_ventas: 2, por_metodo: { efectivo: 50, tarjeta: 0, transferencia: 0, otro: 0 }, total_vendido: 50 },
        historial: [{ id: 1, abierto_en: AHORA, cerrado_en: null, estado: 'abierto', apertura_nombre: 'A', n_ventas: 2, total_vendido: 50, diferencia: 0 }]
    }],
    ['caja cerrada', 'views/caja.ejs', { turno: null, resumen: null, historial: [] }],
    ['dashboard', 'views/dashboard.ejs', {
        turno: { id: 1 }, ventasHoy: { n: 2, total: 50 },
        ultimas: [{ id: 1, creado_en: AHORA, estado: 'cobrada', total: 25 }],
        stockBajo: [{ nombre: 'X', stock: 1, stock_minimo: 5 }], negocio: 'T'
    }],
    ['dashboard sin turno', 'views/dashboard.ejs', { turno: null, ventasHoy: { n: 0, total: 0 }, ultimas: [], stockBajo: [], negocio: 'T' }],
    ['error', 'views/error.ejs', { titulo: 'T', mensaje: 'M' }],
    ['inventario', 'views/inventario.ejs', {
        movs: [{ cantidad: 1, creado_en: AHORA, producto_nombre: 'P', tipo: 'entrada' }],
        bajo: [{ id: 1, nombre: 'P', stock: 1, stock_minimo: 5 }],
        productos: [{ id: 1, nombre: 'P', stock: 10, stock_minimo: 5 }]
    }],
    ['kardex', 'views/kardex.ejs', {
        producto: { nombre: 'P', precio_venta: 2, sku: 'S', stock: 10 },
        movs: [{ cantidad: 1, creado_en: AHORA, motivo: 'venta', referencia_id: 1, stock_antes: 11, stock_despues: 10, tipo: 'salida', usuario_nombre: 'A' }]
    }],
    ['licencia', 'views/licencia.ejs', {
        evaluacion: {
            estado: 'ACTIVA',
            licencia: { cliente: 'C', plan: 'mensual', id: 'LIC-1', expira_en: null, funciones: ['pos'] },
            instalacion: { codigo: 'LIC-ABC', huella_resumen: 'abc123', uuid: 'u1' },
            tiempo: { reloj_manipulado: false, sistema: AHORA, retraso_horas: 0, confiable: true, fuente: 'db' },
            gracia: { dias_restantes: 0, dias_totales: 7 },
            uso: { dias_consumidos: 3, dias_contratados: 30, secuencia: 5 },
            problemas: [], avisos: []
        },
        eventos: [{ creado_en: AHORA, tipo: 'INSTALADA', gravedad: 'INFO', detalle: 'ok' }],
        huella: {
            componentes: { maquina: 'a1b2c3d4e5', disco: 'd1', red: 'r1', cpu: 'c1', nucleos: '4', so: 'linux', equipo: 'srv', memoria: '8G' },
            pesos: { maquina: 40, disco: 20, red: 10, cpu: 15, nucleos: 5, so: 5, equipo: 3, memoria: 2 }
        },
        comparacion: { coincide: true, puntuacion: 100, umbral: 70, coincidentes: ['maquina'], divergentes: [], ausentes: [] }
    }],
    ['licencia sin instalar', 'views/licencia.ejs', {
        evaluacion: {
            estado: 'NO_CONFIGURADA', licencia: null,
            instalacion: { codigo: null, huella_resumen: 'abc', uuid: 'u1' },
            tiempo: { reloj_manipulado: false, sistema: AHORA, retraso_horas: 0, confiable: true, fuente: 'db' },
            gracia: { dias_restantes: 0, dias_totales: 7 },
            uso: { dias_consumidos: 0, dias_contratados: 0, secuencia: 0 },
            problemas: [], avisos: []
        },
        eventos: [], huella: { componentes: { maquina: 'a1' }, pesos: { maquina: 40 } }, comparacion: null
    }],
    ['licencia-bloqueada', 'views/licencia-bloqueada.ejs', { evaluacion: { problemas: ['X'], instalacion: { codigo: 'LIC-1' } } }],
    ['login', 'views/login.ejs', { negocio: 'T' }],
    ['pos', 'views/pos.ejs', { turno: { id: 1 }, iva: 16 }],
    ['producto_form', 'views/producto_form.ejs', {
        producto: { id: 1, activo: 1, categoria_id: 1, descripcion: 'd', nombre: 'P', precio_costo: 1, precio_venta: 2, sku: 'S', stock_minimo: 5 },
        categorias: [{ id: 1, nombre: 'C' }]
    }],
    ['producto_form nuevo', 'views/producto_form.ejs', { producto: null, categorias: [] }],
    ['productos', 'views/productos.ejs', {
        productos: [{ id: 1, activo: 1, categoria_nombre: 'C', nombre: 'P', precio_costo: 1, precio_venta: 2, sku: 'S', stock: 10, stock_minimo: 5 }],
        categorias: [{ id: 1, nombre: 'C' }], q: '', categoria: ''
    }],
    ['reporte_ventas', 'views/reporte_ventas.ejs', { filas: [{ dia: '2026-10-06', n_ventas: 2, total: 116, utilidad: 40 }], filtros: F, totalVentas: 2, totalMonto: 116, totalUtilidad: 40 }],
    ['reporte_ventas vacío', 'views/reporte_ventas.ejs', { filas: [], filtros: F, totalVentas: 0, totalMonto: 0, totalUtilidad: 0 }],
    ['reporte_mas_vendidos', 'views/reporte_mas_vendidos.ejs', { filas: [{ nombre: 'X', piezas: 5, monto: 50 }], filtros: F }],
    ['reporte_inventario', 'views/reporte_inventario.ejs', { filas: [{ nombre: 'A', stock: 3, precio_costo: 1, precio_venta: 2, valor_costo: 3, valor_venta: 6 }], totalCosto: 3, totalVenta: 6 }],
    ['ticket', 'views/ticket.ejs', {
        venta: { id: 1, cambio: 0, creado_en: AHORA, descuento: 0, estado: 'cobrada', subtotal: 100, total: 116, iva_monto: 16, usuario_nombre: 'A' },
        detalles: [{ cantidad: 2, nombre: 'P', precio_unitario: 50, subtotal: 100 }],
        pagos: [{ metodo: 'efectivo', monto: 116 }], negocio: 'T', pie: 'G'
    }],
    ['usuarios', 'views/usuarios.ejs', { usuarios: [{ id: 1, activo: 1, nombre: 'A', rol: 'admin', usuario: 'admin' }], roles: ['admin', 'cajero'] }],
    ['ventas', 'views/ventas.ejs', {
        ventas: [{ id: 1, creado_en: AHORA, usuario_nombre: 'A', total: 116, estado: 'cobrada' }],
        filtros: F, estado: ''
    }],
    ['ventas vacía', 'views/ventas.ejs', { ventas: [], filtros: F, estado: 'cobrada' }]
];

(async () => {
    let ok = 0, mal = 0;
    for (const [n, v, d] of casos) {
        try {
            const html = await ejs.renderFile(v, { ...G, ...d });
            // caza-silenciosos: columna monetaria renderizada como $NaN o vacía donde hay datos
            const sospechoso = /\$NaN|NaN\.|undefined/.test(html) ? ' (¡SOSPECHOSO: NaN/undefined en HTML!)' : '';
            if (sospechoso) mal++;
            else ok++;
            console.log((sospechoso ? 'DUDOSO' : 'OK') + ' ' + n + sospechoso);
        } catch (e) { mal++; console.log('FALLA ' + n + ': ' + e.message.split('\n')[0]); }
    }
    console.log(`\n${ok} OK, ${mal} mal/DUDOSO de ${casos.length}`);
    process.exit(mal ? 1 : 0);
})();
