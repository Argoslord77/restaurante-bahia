// controllers/settingController.test.js
// Sección crítica "Control de precios": validación + auditoría en guardado
// rápido (AJAX) y masivo. Servicio real; settings, BD y auditoría mockeadas.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/settingService', () => ({ get: jest.fn(), getAll: jest.fn(), set: jest.fn() }));
jest.mock('../models/ubicacionMesaModel', () => ({}));
jest.mock('../services/auditLogService', () => ({ registrar: jest.fn(async () => 1) }));

const pool = require('../config/db');
const SettingService = require('../services/settingService');
const AuditLogService = require('../services/auditLogService');
const controller = require('./settingController');

const ADMIN = { id: 7, usuario: 'boss', nombre: 'Jefe', apellidos: 'Total', rol: 'administrador', activo: 1 };
const ACTOR = { id: 1, nombre: 'Root', apellidos: 'Admin', rol: 'superadministrador' };

function crearReqRes(body = {}) {
    const req = {
        method: 'PATCH',
        body,
        headers: {},
        originalUrl: '/admin/configuracion/opcion-rapida',
        url: '/admin/configuracion/opcion-rapida',
        ip: '127.0.0.1',
        sessionID: 's1',
        user: { ...ACTOR },
        flash: jest.fn()
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        redirect: jest.fn(),
        render: jest.fn()
    };
    return { req, res };
}

function simularConfig({ activo = false, usuarioId = '', filaUsuario = null } = {}) {
    SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
        if (clave === 'precio_control_activo') return activo;
        if (clave === 'precio_control_usuario_id') return usuarioId;
        return valorPorDefecto;
    });
    SettingService.set.mockResolvedValue(true);
    pool.query.mockResolvedValue([filaUsuario ? [filaUsuario] : [], []]);
}

describe('settingController · control de precios (crítico)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('actualizarOpcionRapida', () => {
        it('activa el control con designado y lo audita como CRITICO/SEGURIDAD', async () => {
            simularConfig({ activo: false, usuarioId: '7', filaUsuario: ADMIN });
            const { req, res } = crearReqRes({ clave: 'precio_control_activo', valor: '1' });

            await controller.actualizarOpcionRapida(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, clave: 'precio_control_activo', valor: '1' }));
            expect(AuditLogService.registrar).toHaveBeenCalledTimes(1);
            expect(AuditLogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
                usuario_id: 1,
                usuario_rol: 'superadministrador',
                accion: 'Control de precios: activar',
                entidad: 'configuracion',
                entidad_id: 'precio_control_activo',
                modulo: 'Configuración',
                categoria: 'SEGURIDAD',
                severidad: 'CRITICO',
                operacion_exitosa: true
            }));
            const asiento = AuditLogService.registrar.mock.calls[0][0];
            expect(asiento.datos_operacion).toMatchObject({ clave: 'precio_control_activo', valor_anterior: false, valor_nuevo: true });
        });

        it('activar sin designado falla 400 y NO audita', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            const { req, res } = crearReqRes({ clave: 'precio_control_activo', valor: '1' });

            await controller.actualizarOpcionRapida(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
            expect(res.json.mock.calls[0][0].message).toContain('designe');
            expect(AuditLogService.registrar).not.toHaveBeenCalled();
            expect(SettingService.set).not.toHaveBeenCalled();
        });

        it('designa usuario válido y lo audita con anterior/nuevo', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            pool.query.mockResolvedValue([[ADMIN], []]);
            const { req, res } = crearReqRes({ clave: 'precio_control_usuario_id', valor: '7', tipo: 'number' });

            await controller.actualizarOpcionRapida(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, valor: '7' }));
            expect(AuditLogService.registrar).toHaveBeenCalledTimes(1);
            expect(AuditLogService.registrar.mock.calls[0][0].datos_operacion).toMatchObject({
                valor_anterior: null, valor_nuevo: 7
            });
        });

        it('rechaza designar a un dependiente (400, sin auditar)', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            pool.query.mockResolvedValue([[{ ...ADMIN, id: 9, rol: 'dependiente' }], []]);
            const { req, res } = crearReqRes({ clave: 'precio_control_usuario_id', valor: '9', tipo: 'number' });

            await controller.actualizarOpcionRapida(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(AuditLogService.registrar).not.toHaveBeenCalled();
        });

        it('las claves no críticas siguen el flujo genérico (sin auditar)', async () => {
            const { req, res } = crearReqRes({ clave: 'habilitar_monitores_elaboracion', valor: '1' });

            await controller.actualizarOpcionRapida(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            expect(SettingService.set).toHaveBeenCalledWith('habilitar_monitores_elaboracion', true, '', 'general', 'boolean');
            expect(AuditLogService.registrar).not.toHaveBeenCalled();
        });
    });

    describe('updateSettings (masivo)', () => {
        it('aplica usuario y luego activo, auditando ambos', async () => {
            pool.query.mockResolvedValue([[ADMIN], []]);
            SettingService.set.mockResolvedValue(true);
            // Primera lectura del designado: vacío; siguientes: ya guardado.
            let lecturasUsuario = 0;
            SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
                if (clave === 'precio_control_activo') return false;
                if (clave === 'precio_control_usuario_id') {
                    lecturasUsuario += 1;
                    return lecturasUsuario === 1 ? '' : '7';
                }
                return valorPorDefecto;
            });
            const { req, res } = crearReqRes({
                precio_control_usuario_id: '7',
                precio_control_activo: '1'
            });
            req.method = 'POST';
            req.headers = { accept: 'application/json' };
            req.originalUrl = '/admin/configuracion/guardar';

            await controller.updateSettings(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            const orden = SettingService.set.mock.calls.map((c) => c[0]);
            expect(orden).toEqual(['precio_control_usuario_id', 'precio_control_activo']);
            expect(AuditLogService.registrar).toHaveBeenCalledTimes(2);
        });

        it('masivo inválido responde 400 JSON', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            const { req, res } = crearReqRes({ precio_control_activo: '1' });
            req.headers = { accept: 'application/json' };

            await controller.updateSettings(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });
    });
});
