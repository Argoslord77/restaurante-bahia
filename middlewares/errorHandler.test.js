// middlewares/errorHandler.test.js
// A8: negociación HTML/JSON — el navegador recibe la vista de error
// amable; la API y fetch/XHR siguen recibiendo JSON.
jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const { errorHandler, notFoundHandler, AppError, ErrorCodes } = require('./errorHandler');

function reqRes({ method = 'GET', accept = 'text/html', xhr = false, url = '/nada' } = {}) {
    const req = { method, xhr, originalUrl: url, ip: '127.0.0.1', headers: { accept } };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis()
    };
    return { req, res };
}

describe('errorHandler · negociación', () => {
    it('navegación GET+html renderiza la vista error con 404 amable', () => {
        const { req, res } = reqRes({ accept: 'text/html,application/xhtml+xml' });
        notFoundHandler(req, res, (err) => errorHandler(err, req, res, jest.fn()));
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({
            message: expect.stringContaining('no existe')
        }));
        expect(res.json).not.toHaveBeenCalled();
    });

    it('fetch (Accept */*) recibe JSON, no HTML', () => {
        const { req, res } = reqRes({ accept: '*/*' });
        errorHandler(new AppError('Roto', 500), req, res, jest.fn());
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(res.render).not.toHaveBeenCalled();
    });

    it('POST con error recibe JSON aunque acepte html', () => {
        const { req, res } = reqRes({ method: 'POST', accept: 'text/html' });
        errorHandler(new AppError('Datos mal', 400, ErrorCodes.BAD_REQUEST), req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalled();
        expect(res.render).not.toHaveBeenCalled();
    });
});
