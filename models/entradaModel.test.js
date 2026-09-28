// models/entradaModel.test.js
// V13 (C1): la entrada guarda el proveedor del lote (opcional, validado).
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../services/unidadMedidaService', () => ({ validarUnidadParaEntrada: jest.fn() }));

const db = require('../config/db');
const UnidadMedidaService = require('../services/unidadMedidaService');
const Entrada = require('./entradaModel');

function conexionPrincipal(filasProveedor) {
    const llamadas = [];
    return {
        llamadas,
        query: jest.fn(async (sql, params) => {
            llamadas.push([String(sql), params]);
            const texto = String(sql);
            if (texto.includes('FROM proveedores')) return [filasProveedor, []];
            if (texto.includes('INSERT INTO lotes')) return [{ insertId: 50 }, undefined];
            return [[], []];
        }),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };
}

function conexionSecuencia() {
    return {
        query: jest.fn(async (sql) => {
            if (String(sql).includes('UPDATE secuencias_lotes')) return [{ affectedRows: 1 }, undefined];
            return [[{ n: 7 }], []];
        }),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };
}

const DATOS = {
    almacen_id: 1, producto_id: 10, unidad_medida_id: 2,
    fecha_ingreso: '2026-09-01', fecha_vencimiento: null,
    cantidad: 5, costo_unitario: 100
};

beforeEach(() => {
    jest.clearAllMocks();
    UnidadMedidaService.validarUnidadParaEntrada.mockResolvedValue({
        factor_a_inventario: 1, unidad: { id: 2 }
    });
});

describe('entradaModel.registrarEntradaAtomica · proveedor (C1)', () => {
    it('guarda el proveedor validado en el lote', async () => {
        const principal = conexionPrincipal([{ id: 3 }]);
        db.getConnection.mockResolvedValueOnce(principal).mockResolvedValueOnce(conexionSecuencia());

        const r = await Entrada.registrarEntradaAtomica({ ...DATOS, proveedor_id: 3 });

        expect(r.numero_lote).toBe('LOT-2026-007');
        const insert = principal.llamadas.find(([sql]) => sql.includes('INSERT INTO lotes'));
        expect(insert[0]).toContain('proveedor_id');
        expect(insert[1][insert[1].length - 1]).toBe(3);
        expect(principal.commit).toHaveBeenCalled();
    });

    it('sin proveedor guarda NULL y no consulta el catálogo', async () => {
        const principal = conexionPrincipal([{ id: 3 }]);
        db.getConnection.mockResolvedValueOnce(principal).mockResolvedValueOnce(conexionSecuencia());

        await Entrada.registrarEntradaAtomica({ ...DATOS });

        const insert = principal.llamadas.find(([sql]) => sql.includes('INSERT INTO lotes'));
        expect(insert[1][insert[1].length - 1]).toBeNull();
        expect(principal.llamadas.some(([sql]) => sql.includes('FROM proveedores'))).toBe(false);
    });

    it('rechaza proveedor inexistente o inactivo', async () => {
        const principal = conexionPrincipal([]);
        db.getConnection.mockResolvedValueOnce(principal).mockResolvedValueOnce(conexionSecuencia());

        await expect(Entrada.registrarEntradaAtomica({ ...DATOS, proveedor_id: 99 }))
            .rejects.toThrow('no existe o está inactivo');
        expect(principal.rollback).toHaveBeenCalled();
        expect(principal.commit).not.toHaveBeenCalled();
    });
});

describe('entradaModel.getAll (C1)', () => {
    it('trae el nombre del proveedor del lote', async () => {
        db.query.mockResolvedValue([[{ lote_id: 1, proveedor_nombre: 'Acme' }], []]);
        const filas = await Entrada.getAll();
        expect(filas[0].proveedor_nombre).toBe('Acme');
        expect(db.query.mock.calls[0][0]).toContain('LEFT JOIN proveedores pr');
    });
});
