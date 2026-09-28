// services/proveedorService.test.js
// V13 (C1): catálogo de proveedores — validación, código auto y
// activación (sin borrado: el historial de compras los referencia).
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const ProveedorService = require('./proveedorService');

beforeEach(() => jest.clearAllMocks());

describe('proveedorService.crear (C1)', () => {
    it('valida nombre, correo, crédito antes de insertar', async () => {
        await expect(ProveedorService.crear({ nombre: '  ' })).rejects.toThrow('nombre comercial');
        await expect(ProveedorService.crear({ nombre: 'A', email: 'mal' })).rejects.toThrow('correo');
        await expect(ProveedorService.crear({ nombre: 'A', diasCredito: -1 })).rejects.toThrow('crédito');
        await expect(ProveedorService.crear({ nombre: 'A', limiteCredito: -5 })).rejects.toThrow('crédito');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('genera código PROV-#### si no viene', async () => {
        db.query
            .mockResolvedValueOnce([[{ siguiente: 4 }], []])
            .mockResolvedValueOnce([{ insertId: 4 }, undefined]);
        const r = await ProveedorService.crear({ nombre: 'Distribuidora X' });
        expect(r).toEqual({ id: 4, codigo: 'PROV-0004', nombre: 'Distribuidora X' });
        expect(db.query.mock.calls[1][1][0]).toBe('PROV-0004');
    });

    it('rechaza códigos duplicados', async () => {
        db.query.mockResolvedValueOnce([[{ id: 1 }], []]);
        await expect(ProveedorService.crear({ codigo: 'ACME', nombre: 'Acme' }))
            .rejects.toThrow('ya existe');
    });
});

describe('proveedorService.actualizar / cambiarActivo (C1)', () => {
    it('actualizar exige existente y nombre; respeta código ajeno', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        await expect(ProveedorService.actualizar(99, { nombre: 'X' })).rejects.toThrow('no existe');
        db.query.mockResolvedValueOnce([[{ id: 1, codigo: 'A', nombre_comercial: 'A', activo: 1 }], []]);
        await expect(ProveedorService.actualizar(1, { nombre: '' })).rejects.toThrow('obligatorio');
        db.query
            .mockResolvedValueOnce([[{ id: 1, codigo: 'A', nombre_comercial: 'A', activo: 1 }], []])
            .mockResolvedValueOnce([[{ id: 2 }], []]);
        await expect(ProveedorService.actualizar(1, { codigo: 'B', nombre: 'A' }))
            .rejects.toThrow('ya existe');
    });

    it('cambiarActivo informa si no existe', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);
        await expect(ProveedorService.cambiarActivo(99, true)).rejects.toThrow('no existe');
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
        await expect(ProveedorService.cambiarActivo(1, false))
            .resolves.toEqual({ id: 1, activo: false });
    });
});

describe('proveedorService.listar / obtener (C1)', () => {
    it('mapea con estadísticas de compra', async () => {
        db.query.mockResolvedValue([[{ id: 1, codigo: 'ACME', nombre_comercial: 'Acme',
            razon_social: null, identificacion_fiscal: null, telefono: '123', email: null,
            direccion: null, persona_contacto: null, condiciones_pago: null,
            dias_credito: 15, limite_credito: 1000, observaciones: null, activo: 1,
            total_compras: 5, monto_comprado: 2500.5, ultima_compra: '2026-09-01' }], []]);
        const r = await ProveedorService.listar();
        expect(r[0]).toMatchObject({ nombre: 'Acme', activo: true, totalCompras: 5,
            montoComprado: 2500.5, diasCredito: 15 });
    });

    it('soloActivos filtra en SQL', async () => {
        db.query.mockResolvedValue([[], []]);
        await ProveedorService.listar({ soloActivos: true });
        expect(db.query.mock.calls[0][0]).toContain('WHERE p.activo = 1');
    });

    it('obtener devuelve null si no existe', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        await expect(ProveedorService.obtener(99)).resolves.toBeNull();
    });
});
