// controllers/menuController.test.js
// Puerta de control de precios: con el control activo solo el designado
// guarda precios (crear/editar/reutilizar); el resto recibe 403.
jest.mock('../services/menuService', () => ({
    getAllItems: jest.fn(),
    getActiveCategories: jest.fn(),
    getItemById: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn()
}));
jest.mock('../models/platilloDiaModel', () => ({
    getByTurno: jest.fn(),
    getHistorico: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    clonarAlTurnoActual: jest.fn()
}));
jest.mock('../services/turnoService', () => ({ obtenerTurnoActivo: jest.fn() }));
jest.mock('../services/precioControlService', () => ({ puedeModificarPrecios: jest.fn() }));

const menuService = require('../services/menuService');
const platilloDiaModel = require('../models/platilloDiaModel');
const turnoService = require('../services/turnoService');
const PrecioControlService = require('../services/precioControlService');
const controller = require('./menuController');

const DESIGNADO = { id: 7, usuario: 'boss', nombre: 'Jefe Total', rol: 'administrador' };

function crearReqRes({ params = {}, body = {}, user = { id: 2, rol: 'administrador' } } = {}) {
    const req = { params, body, user, session: {}, headers: {} };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        render: jest.fn(),
        redirect: jest.fn()
    };
    return { req, res };
}

describe('menuController · puerta de control de precios', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('updateDish denegado → 403 PRECIO_NO_AUTORIZADO sin escribir', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({
            permitido: false, mensaje: 'Solo Jefe Total está autorizado a modificar los precios de las cartas (control de precios activo).'
        });
        const { req, res } = crearReqRes({
            params: { id: '3' },
            body: { nombre: 'X', descripcion: 'd', precio: '10', categoria: '1', precio_alt: '', precio_usd: '' }
        });

        await controller.updateDish(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false, codigo: 'PRECIO_NO_AUTORIZADO'
        }));
        expect(menuService.updateItem).not.toHaveBeenCalled();
    });

    it('updateDish permitido → escribe normal', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: true });
        menuService.updateItem.mockResolvedValue(true);
        const { req, res } = crearReqRes({
            params: { id: '3' },
            body: { nombre: 'X', descripcion: 'd', precio: '10', categoria: '1', precio_alt: '', precio_usd: '' }
        });

        await controller.updateDish(req, res);

        expect(menuService.updateItem).toHaveBeenCalledWith('3', expect.objectContaining({ precio: 10 }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('createDish denegado → 403 sin escribir', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: false, mensaje: 'Solo X.' });
        const { req, res } = crearReqRes({
            body: { nombre: 'N', descripcion: 'd', precio: '5', categoria: '1', precio_alt: '', precio_usd: '' }
        });

        await controller.createDish(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(menuService.createItem).not.toHaveBeenCalled();
    });

    it('createPlatilloDia denegado → 403 antes de revisar turno', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: false, mensaje: 'Solo X.' });
        const { req, res } = crearReqRes({
            body: { nombre: 'N', descripcion: 'd', precio: '5', precio_alt: '', precio_usd: '', tipo: 'COMESTIBLES' }
        });

        await controller.createPlatilloDia(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(turnoService.obtenerTurnoActivo).not.toHaveBeenCalled();
        expect(platilloDiaModel.create).not.toHaveBeenCalled();
    });

    it('updatePlatilloDia denegado → 403 sin escribir', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: false, mensaje: 'Solo X.' });
        const { req, res } = crearReqRes({
            params: { id: '4' },
            body: { nombre: 'N', descripcion: 'd', precio: '5', precio_alt: '', precio_usd: '', tipo: 'BEBIDAS' }
        });

        await controller.updatePlatilloDia(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(platilloDiaModel.update).not.toHaveBeenCalled();
    });

    it('reutilizarPlatilloDia: denegado no clona; permitido clona', async () => {
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: false, mensaje: 'Solo X.' });
        const denegado = crearReqRes({ params: { id: '8' } });
        await controller.reutilizarPlatilloDia(denegado.req, denegado.res);
        expect(denegado.res.status).toHaveBeenCalledWith(403);
        expect(platilloDiaModel.clonarAlTurnoActual).not.toHaveBeenCalled();

        PrecioControlService.puedeModificarPrecios.mockResolvedValue({ permitido: true });
        turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
        const ok = crearReqRes({ params: { id: '8' } });
        await controller.reutilizarPlatilloDia(ok.req, ok.res);
        expect(platilloDiaModel.clonarAlTurnoActual).toHaveBeenCalledWith('8', 7, 2);
        expect(ok.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('listMenu informa el control a la vista', async () => {
        menuService.getAllItems.mockResolvedValue([]);
        menuService.getActiveCategories.mockResolvedValue([]);
        turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
        platilloDiaModel.getByTurno.mockResolvedValue([]);
        platilloDiaModel.getHistorico.mockResolvedValue([]);
        PrecioControlService.puedeModificarPrecios.mockResolvedValue({
            permitido: false, controlActivo: true, usuarioControl: DESIGNADO
        });
        const { req, res } = crearReqRes({});

        await controller.listMenu(req, res);

        expect(res.render).toHaveBeenCalledWith('admin/menu', expect.objectContaining({
            controlPrecios: { activo: true, puedeModificar: false, usuarioControl: DESIGNADO }
        }));
    });
});
