/* Fusión: combinar respaldo de vendedor SIN borrar (dueño + ambulantes). */
const CFStore = require('../www/js/store');
const CFStorage = require('../www/js/storage');
const CFAjustes = require('../www/js/ajustes');
const CFUsers = require('../www/js/users');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');
const CFBackup = require('../www/js/backup');
const CFFusion = require('../www/js/fusion');

// Una tableta: dueño o vendedor, con catálogo y turno propios.
async function tableta(nombre, rol) {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    const u = await CFUsers.crear(store, { nombre, pin: '1111', rol });
    const cat = await CFProductos.crearCategoria(store, 'Bebidas');
    const prod = await CFProductos.crear(store, {
        nombre: 'Refresco', sku: 'R1', precio_venta: 100,
        stock_inicial: 50, categoria_id: cat,
    }, u.id);
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 0 });
    return { store, u, prod, turno };
}

async function vender(t, prodId, cant, precio) {
    return CFVentas.crear(t.store, {
        usuario_id: t.u.id,
        turno_id: t.turno,
        items: [{ producto_id: prodId, cantidad: cant }],
        pagos: [{ metodo: 'efectivo', monto: cant * precio * 2 }], // margen para el IVA
    });
}

describe('Fusión (combinar respaldo)', () => {
    test('roles: vendedor exporta pero no reemplaza ni combina', () => {
        expect(CFFusion.puedeExportar('administrador')).toBe(true);
        expect(CFFusion.puedeExportar('vendedor')).toBe(true);
        expect(CFFusion.puedeExportar('cajero')).toBe(false);
        expect(CFFusion.puedeExportar('dueño')).toBe(false);
        expect(CFFusion.puedeRestaurar('administrador')).toBe(true);
        expect(CFFusion.puedeRestaurar('vendedor')).toBe(false);
        expect(CFFusion.puedeRestaurar('cajero')).toBe(false);
        expect(CFFusion.puedeCombinar('administrador')).toBe(true);
        expect(CFFusion.puedeCombinar('vendedor')).toBe(false);
        expect(CFFusion.puedeCombinar('cajero')).toBe(false);
    });

    test('filasDe: paquete ajeno o incompleto → []', () => {
        expect(CFFusion.filasDe(null, 'ventas')).toEqual([]);
        expect(CFFusion.filasDe({}, 'ventas')).toEqual([]);
        expect(CFFusion.filasDe({ datos: { archivos: { ventas: 'no-json' } } }, 'ventas')).toEqual([]);
        const ok = { datos: { archivos: { ventas: '{"v":1,"data":{"filas":[{"id":1}]}}' } } };
        expect(CFFusion.filasDe(ok, 'ventas')).toEqual([{ id: 1 }]);
        const plano = { datos: { archivos: { ventas: '[{"id":2}]' } } };
        expect(CFFusion.filasDe(plano, 'ventas')).toEqual([{ id: 2 }]);
    });

    test('feliz: ventas del vendedor se agregan al turno del dueño', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        const vv = await vender(amb, amb.prod, 2, 100);
        const paquete = await CFBackup.generar(amb.store);

        const rep = await CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        expect(rep.ventas_agregadas).toBe(1);
        expect(rep.movimientos_agregados).toBe(1);
        expect(rep.total_agregado).toBe(vv.total);

        // La venta quedó en el turno del dueño, con el nombre del vendedor.
        const ventas = await dueno.store.todos('ventas');
        expect(ventas).toHaveLength(1);
        expect(ventas[0].turno_id).toBe(dueno.turno);
        expect(ventas[0].usuario_nombre).toBe('Pedro');
        expect(ventas[0].detalles[0].producto_id).toBe(dueno.prod);
        // Stock local recalculado: 50 − 2.
        expect((await dueno.store.obtener('productos', dueno.prod)).stock).toBe(48);
        // Producto enlazado por SKU: no se duplicó.
        expect(await dueno.store.todos('productos')).toHaveLength(1);
        // Paquete registrado.
        const fus = await dueno.store.todos('fusiones');
        expect(fus).toHaveLength(1);
        expect(fus[0].suma).toBe(paquete.suma);
    });

    test('idempotente: el mismo archivo dos veces se rechaza', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        await vender(amb, amb.prod, 1, 100);
        const paquete = await CFBackup.generar(amb.store);
        await CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        await expect(CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        })).rejects.toThrow('ya se combinó');
        expect(await dueno.store.todos('ventas')).toHaveLength(1);
    });

    test('acumulativo: segundo respaldo solo agrega lo nuevo', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        await vender(amb, amb.prod, 1, 100);
        const p1 = await CFBackup.generar(amb.store);
        await CFFusion.combinar(dueno.store, p1, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        const vv2 = await vender(amb, amb.prod, 3, 100);
        const p2 = await CFBackup.generar(amb.store);
        const rep = await CFFusion.combinar(dueno.store, p2, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        expect(rep.ventas_agregadas).toBe(1);
        expect(rep.ventas_omitidas).toBe(1);
        expect(rep.total_agregado).toBe(vv2.total);
        expect(await dueno.store.todos('ventas')).toHaveLength(2);
        expect((await dueno.store.obtener('productos', dueno.prod)).stock).toBe(46);
    });

    test('producto desconocido se crea en 0 y el negativo se reporta', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        const nuevo = await CFProductos.crear(amb.store, {
            nombre: 'Jugo Nuevo', sku: 'JN9', precio_venta: 50, stock_inicial: 10,
        }, amb.u.id);
        await vender(amb, nuevo, 4, 50);
        const paquete = await CFBackup.generar(amb.store);
        const rep = await CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        expect(rep.productos_creados).toBe(1);
        expect(rep.negativos).toHaveLength(1);
        expect(rep.negativos[0].producto).toBe('Jugo Nuevo');
        expect(rep.negativos[0].stock).toBe(-4);
    });

    test('sin turno abierto no combina nada', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        await vender(amb, amb.prod, 1, 100);
        const paquete = await CFBackup.generar(amb.store);
        await expect(CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: 999,
        })).rejects.toThrow('turno');
        expect(await dueno.store.todos('ventas')).toHaveLength(0);
    });

    test('respaldo del propio equipo no se combina', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        await vender(dueno, dueno.prod, 1, 100);
        const paquete = await CFBackup.generar(dueno.store);
        await expect(CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        })).rejects.toThrow('ESTE equipo');
    });

    test('venta cancelada se importa con su devolución (neto 0)', async () => {
        const dueno = await tableta('Dueño', 'administrador');
        const amb = await tableta('Pedro', 'vendedor');
        const v = await vender(amb, amb.prod, 2, 100);
        await CFVentas.cancelar(amb.store, { venta_id: v.venta_id, usuario_id: amb.u.id, motivo: 'prueba' });
        const paquete = await CFBackup.generar(amb.store);
        const rep = await CFFusion.combinar(dueno.store, paquete, {
            usuario_id: dueno.u.id, turno_id: dueno.turno,
        });
        expect(rep.ventas_agregadas).toBe(1);
        expect(rep.total_agregado).toBe(0);
        expect(rep.movimientos_agregados).toBe(2);
        const ventas = await dueno.store.todos('ventas');
        expect(ventas[0].estado).toBe('cancelada');
        expect((await dueno.store.obtener('productos', dueno.prod)).stock).toBe(50);
    });
});
