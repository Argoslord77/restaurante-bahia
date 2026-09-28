// controllers/monitorController.test.js
// C5: SLA de cocina/bar — minutos en cola, marca de excedido y
// configuración por área (defaults 20/10, personalizable).
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/settingService', () => ({ get: jest.fn() }));

const pool = require('../config/db');
const SettingService = require('../services/settingService');
const controller = require('./monitorController');

function filaComanda(minutos) {
    return {
        id_pedido: 15, id_mesa: 3, numero_mesa: '5', mesa_ubicacion: 'Salón',
        mesero_nombre: 'Juan', fecha_pedido: '2026-09-28 12:00:00',
        detalle_id: 100 + minutos, nombre_platillo: 'Pollo', cantidad: 1,
        notas_especiales: null, estado_item: 'en_cocina',
        categoria_tipo: 'COMESTIBLES', fecha_item: '2026-09-28 12:00:00',
        minutos_en_cola: minutos
    };
}

function reqResAPI(area = 'cocina') {
    const req = { query: { area } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    return { req, res };
}

beforeEach(() => {
    jest.clearAllMocks();
    SettingService.get.mockImplementation(async (clave, defecto) => {
        if (clave === 'habilitar_monitores_elaboracion') return true;
        return defecto;
    });
    pool.query.mockResolvedValue([[], []]);
});

describe('monitorController.getComandasAPI · SLA (C5)', () => {
    it('cocina: SLA 20 por defecto; 25 min excede, 10 no', async () => {
        pool.query.mockResolvedValue([[filaComanda(25), filaComanda(10)], []]);
        const { req, res } = reqResAPI('cocina');
        await controller.getComandasAPI(req, res);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.sla_min).toBe(20);
        expect(cuerpo.comandas).toHaveLength(1);
        expect(cuerpo.comandas[0].minutos_en_cola).toBe(25);
        expect(cuerpo.comandas[0].excedido).toBe(true);
        expect(cuerpo.comandas[0].items[0].minutos_en_cola).toBe(25);
    });

    it('bar: SLA 10 por defecto', async () => {
        pool.query.mockResolvedValue([[filaComanda(12)], []]);
        const { req, res } = reqResAPI('bar');
        await controller.getComandasAPI(req, res);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.sla_min).toBe(10);
        expect(cuerpo.comandas[0].excedido).toBe(true);
        expect(SettingService.get).toHaveBeenCalledWith('sla_bar_min', 10);
    });

    it('respeta el SLA configurado y filtra por área bar', async () => {
        SettingService.get.mockImplementation(async (clave, defecto) => {
            if (clave === 'habilitar_monitores_elaboracion') return true;
            if (clave === 'sla_bar_min') return 5;
            return defecto;
        });
        pool.query.mockResolvedValue([[filaComanda(6)], []]);
        const { req, res } = reqResAPI('bar');
        await controller.getComandasAPI(req, res);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.sla_min).toBe(5);
        expect(cuerpo.comandas[0].excedido).toBe(true);
        expect(pool.query.mock.calls[0][0]).toContain("= 'bar'");
    });

    it('valor inválido cae al default sin reventar', async () => {
        SettingService.get.mockImplementation(async (clave, defecto) => {
            if (clave === 'habilitar_monitores_elaboracion') return true;
            if (clave === 'sla_cocina_min') return 'basura';
            return defecto;
        });
        pool.query.mockResolvedValue([[filaComanda(30)], []]);
        const { req, res } = reqResAPI('cocina');
        await controller.getComandasAPI(req, res);
        expect(res.json.mock.calls[0][0].sla_min).toBe(20);
    });
});

describe('monitorController.viewMonitor · SLA (C5)', () => {
    it('pasa slaMin a la vista', async () => {
        pool.query.mockResolvedValue([[filaComanda(3)], []]);
        const req = { params: { area: 'cocina' }, user: { rol: 'cocinero' } };
        const res = { render: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
        await controller.viewMonitor(req, res);
        expect(res.render).toHaveBeenCalledWith('monitor', expect.objectContaining({ slaMin: 20 }));
        const comandas = res.render.mock.calls[0][1].comandas;
        expect(comandas[0].excedido).toBe(false);
    });
});
