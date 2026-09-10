// services/mesaAsignacionService.test.js
// Titularidad del salón: resolución del dependiente asignado vigente por
// mesa y turno. El servicio nunca lanza: ante cualquier fallo devuelve el
// valor seguro (null, {} o el abridor como titular).
jest.mock('../config/db', () => ({ query: jest.fn() }));

const pool = require('../config/db');
const MesaAsignacionService = require('./mesaAsignacionService');

const FILA_JUAN = { id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'Perez' };

describe('mesaAsignacionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('obtenerDependienteAsignado', () => {
        it('devuelve el asignado vigente mapeado', async () => {
            pool.query.mockResolvedValue([[FILA_JUAN], []]);

            const asignado = await MesaAsignacionService.obtenerDependienteAsignado(3, 7);

            expect(asignado).toEqual({ id: 5, usuario: 'juan', nombre: 'Juan Perez' });
            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toContain('detalle_asignacion_mesa');
            expect(sql).toContain('MAX(a2.id)');
            expect(params).toEqual([3, 7, 7]);
        });

        it('devuelve null si la mesa no tiene asignación en el turno', async () => {
            pool.query.mockResolvedValue([[], []]);
            await expect(MesaAsignacionService.obtenerDependienteAsignado(3, 7)).resolves.toBeNull();
        });

        it('devuelve null ante un fallo de BD (no lanza)', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB down'));
            await expect(MesaAsignacionService.obtenerDependienteAsignado(3, 7)).resolves.toBeNull();
        });

        it('devuelve null sin turno (no consulta)', async () => {
            await expect(MesaAsignacionService.obtenerDependienteAsignado(3, null)).resolves.toBeNull();
            expect(pool.query).not.toHaveBeenCalled();
        });
    });

    describe('obtenerMapaAsignados', () => {
        it('indexa por mesa_id', async () => {
            pool.query.mockResolvedValue([[
                { mesa_id: 1, ...FILA_JUAN },
                { mesa_id: 2, id: 8, usuario: 'ana', nombre: 'Ana', apellidos: 'Gomez' }
            ], []]);

            const mapa = await MesaAsignacionService.obtenerMapaAsignados(7);

            expect(mapa[1]).toEqual({ id: 5, usuario: 'juan', nombre: 'Juan Perez' });
            expect(mapa[2].nombre).toBe('Ana Gomez');
        });

        it('devuelve {} ante un fallo de BD (no lanza)', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB down'));
            await expect(MesaAsignacionService.obtenerMapaAsignados(7)).resolves.toEqual({});
        });
    });

    describe('resolverMeseroTitular', () => {
        it('prefiere al asignado vigente', async () => {
            pool.query.mockResolvedValue([[FILA_JUAN], []]);
            await expect(MesaAsignacionService.resolverMeseroTitular(3, 7, 9))
                .resolves.toEqual({ id: 5, nombre: 'Juan Perez', esAsignado: true });
        });

        it('usa al abridor si no hay asignado', async () => {
            pool.query.mockResolvedValue([[], []]);
            await expect(MesaAsignacionService.resolverMeseroTitular(3, 7, 9))
                .resolves.toEqual({ id: 9, nombre: null, esAsignado: false });
        });

        it('usa al abridor ante un fallo de BD (no lanza)', async () => {
            pool.query.mockRejectedValueOnce(new Error('DB down'));
            await expect(MesaAsignacionService.resolverMeseroTitular(3, 7, 9))
                .resolves.toEqual({ id: 9, nombre: null, esAsignado: false });
        });
    });
});
