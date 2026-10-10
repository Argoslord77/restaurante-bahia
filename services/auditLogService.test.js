// services/auditLogService.test.js
// Verifica la exportación PDF de la bitácora (gemela del CSV).
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const AuditLogService = require('./auditLogService');

describe('auditLogService · exportarPDF', () => {
    beforeEach(() => jest.clearAllMocks());

    it('genera un PDF válido con las columnas resumidas', async () => {
        db.query.mockResolvedValue([[{
            creado_en: new Date('2026-10-10T14:00:00Z'), usuario_nombre: 'Ana',
            usuario_rol: 'administrador', categoria: 'operacion', severidad: 'media',
            modulo: 'caja', accion: 'apertura', metodo_http: 'POST', ruta: '/admin/caja'
        }], []]);
        const pdf = await AuditLogService.exportarPDF({}, 20000, { generadoPor: 'Test' });
        expect(Buffer.isBuffer(pdf)).toBe(true);
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
        expect(pdf.slice(-6).toString()).toContain('%%EOF');
        expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('no rompe con bitácora vacía', async () => {
        db.query.mockResolvedValue([[], []]);
        const pdf = await AuditLogService.exportarPDF({});
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    });
});
