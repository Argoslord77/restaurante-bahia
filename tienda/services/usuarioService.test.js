jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const UsuarioService = require('./usuarioService');
beforeEach(() => jest.clearAllMocks());

describe('usuarioService', () => {
    it('login válido devuelve la sesión', async () => {
        db.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Ana', usuario: 'ana', password_hash: 'h', rol: 'cajero', activo: 1 }], []]);
        bcrypt.compare.mockResolvedValue(true);
        const s = await UsuarioService.validarCredenciales('ana', 'clave123');
        expect(s).toEqual({ id: 1, nombre: 'Ana', usuario: 'ana', rol: 'cajero' });
    });
    it('login rechaza clave mala, inactivo o vacío sin revelar', async () => {
        db.query.mockResolvedValue([[{ id: 1, password_hash: 'h', activo: 1 }], []]);
        bcrypt.compare.mockResolvedValue(false);
        await expect(UsuarioService.validarCredenciales('ana', 'mala')).rejects.toThrow('Credenciales inválidas');
        db.query.mockResolvedValue([[{ id: 1, password_hash: 'h', activo: 0 }], []]);
        bcrypt.compare.mockResolvedValue(true);
        await expect(UsuarioService.validarCredenciales('ana', 'x')).rejects.toThrow('Credenciales inválidas');
        await expect(UsuarioService.validarCredenciales('', '')).rejects.toThrow('Credenciales inválidas');
    });
    it('crear valida y traduce duplicado', async () => {
        await expect(UsuarioService.crear({ nombre: '', usuario: 'a', clave: '123456', rol: 'cajero' })).rejects.toThrow('nombre');
        await expect(UsuarioService.crear({ nombre: 'A', usuario: 'a', clave: '123', rol: 'cajero' })).rejects.toThrow('6 caracteres');
        bcrypt.hash.mockResolvedValue('h');
        const dup = new Error('dup'); dup.code = 'ER_DUP_ENTRY';
        db.query.mockRejectedValue(dup);
        await expect(UsuarioService.crear({ nombre: 'A', usuario: 'a', clave: '123456', rol: 'cajero' })).rejects.toThrow('ya existe');
    });
});
