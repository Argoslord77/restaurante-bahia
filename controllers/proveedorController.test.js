// controllers/proveedorController.test.js
// V13 (C1): endpoints de proveedores — vistas, CRUD y estado.
jest.mock('../services/proveedorService', () => ({
    listar: jest.fn(), obtener: jest.fn(), crear: jest.fn(),
    actualizar: jest.fn(), cambiarActivo: jest.fn()
}));
jest.mock('../services/compraService', () => ({ historial: jest.fn(), resumenProveedor: jest.fn() }));

const ProveedorService = require('../services/proveedorService');
const CompraService = require('../services/compraService');
const controller = require('./proveedorController');

function reqRes({ body = {}, params = {}, session = {} } = {}) {
    const req = { body, params, session, user: { id: 1, rol: 'administrador' } };
    const res = {
        status: jest.fn().mockReturnThis(), json: jest.fn(),
        render: jest.fn(), send: jest.fn()
    };
    return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('proveedorController · vistas (C1)', () => {
    it('renderProveedores entrega la lista', async () => {
        ProveedorService.listar.mockResolvedValue([{ id: 1 }]);
        const { req, res } = reqRes();
        await controller.renderProveedores(req, res);
        expect(res.render).toHaveBeenCalledWith('inventarios/proveedores',
            expect.objectContaining({ view: 'proveedores', proveedores: [{ id: 1 }] }));
    });

    it('renderDetalle 404 si no existe; con resumen e historial si sí', async () => {
        ProveedorService.obtener.mockResolvedValue(null);
        const falta = reqRes({ params: { id: '99' } });
        await controller.renderDetalle(falta.req, falta.res);
        expect(falta.res.status).toHaveBeenCalledWith(404);
        ProveedorService.obtener.mockResolvedValue({ id: 1, nombre: 'Acme' });
        CompraService.resumenProveedor.mockResolvedValue({ movimientos: 2 });
        CompraService.historial.mockResolvedValue({ compras: [{ lote: 'L1' }], totales: { monto: 5 } });
        const ok = reqRes({ params: { id: '1' } });
        await controller.renderDetalle(ok.req, ok.res);
        expect(CompraService.historial).toHaveBeenCalledWith({ proveedorId: '1', limite: 50 });
        expect(ok.res.render).toHaveBeenCalledWith('inventarios/proveedor-detalle',
            expect.objectContaining({ historial: [{ lote: 'L1' }] }));
    });
});

describe('proveedorController · operaciones (C1)', () => {
    it('crear → 201; error → 400', async () => {
        ProveedorService.crear.mockResolvedValue({ id: 1, codigo: 'PROV-0001' });
        const ok = reqRes({ body: { nombre: 'Acme' } });
        await controller.crear(ok.req, ok.res);
        expect(ok.res.status).toHaveBeenCalledWith(201);
        ProveedorService.crear.mockRejectedValue(new Error('El nombre comercial es obligatorio.'));
        const mal = reqRes({ body: {} });
        await controller.crear(mal.req, mal.res);
        expect(mal.res.status).toHaveBeenCalledWith(400);
    });

    it('actualizar distingue 404 de 400', async () => {
        ProveedorService.actualizar.mockRejectedValue(new Error('El proveedor no existe.'));
        const falta = reqRes({ params: { id: '99' }, body: {} });
        await controller.actualizar(falta.req, falta.res);
        expect(falta.res.status).toHaveBeenCalledWith(404);
        ProveedorService.actualizar.mockRejectedValue(new Error('El correo no es válido.'));
        const mal = reqRes({ params: { id: '1' }, body: {} });
        await controller.actualizar(mal.req, mal.res);
        expect(mal.res.status).toHaveBeenCalledWith(400);
    });

    it('cambiarEstado normaliza booleanos', async () => {
        ProveedorService.cambiarActivo.mockResolvedValue({ id: 1, activo: true });
        for (const valor of [true, '1', 1]) {
            const { req, res } = reqRes({ params: { id: '1' }, body: { activo: valor } });
            await controller.cambiarEstado(req, res);
            expect(ProveedorService.cambiarActivo).toHaveBeenCalledWith('1', true);
        }
        const { req, res } = reqRes({ params: { id: '1' }, body: { activo: false } });
        await controller.cambiarEstado(req, res);
        expect(ProveedorService.cambiarActivo).toHaveBeenCalledWith('1', false);
    });
});
