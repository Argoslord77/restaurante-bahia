// config/server.test.js
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const server = require('./server');

function appPing() {
    const app = express();
    app.get('/ping', (req, res) => res.send('pong'));
    return app;
}

describe('configuración del listener', () => {
    const puertoOriginal = process.env.PORT;
    const hostOriginal = process.env.HOST;
    const httpOriginal = process.env.SERVER_HTTP;

    afterEach(() => {
        if (puertoOriginal === undefined) delete process.env.PORT; else process.env.PORT = puertoOriginal;
        if (hostOriginal === undefined) delete process.env.HOST; else process.env.HOST = hostOriginal;
        if (httpOriginal === undefined) delete process.env.SERVER_HTTP; else process.env.SERVER_HTTP = httpOriginal;
    });

    test('puerto 3000 por defecto y desde PORT', () => {
        delete process.env.PORT;
        expect(server.puerto()).toBe(3000);
        process.env.PORT = '8443';
        expect(server.puerto()).toBe(8443);
        process.env.PORT = 'no-valido';
        expect(server.puerto()).toBe(3000);
    });

    test('host 0.0.0.0 por defecto (escucha en la LAN del restaurante)', () => {
        delete process.env.HOST;
        expect(server.host()).toBe('0.0.0.0');
        process.env.HOST = '127.0.0.1';
        expect(server.host()).toBe('127.0.0.1');
    });

    test('SERVER_HTTP=1 activa el modo texto plano', () => {
        delete process.env.SERVER_HTTP;
        expect(server.enModoHttp()).toBe(false);
        process.env.SERVER_HTTP = '1';
        expect(server.enModoHttp()).toBe(true);
    });

    test('las rutas de certificados se pueden sobrescribir por env', () => {
        process.env.SSL_KEY_PATH = '/opt/certs/k.pem';
        process.env.SSL_CERT_PATH = '/opt/certs/c.pem';
        expect(server.rutasCertificados()).toEqual({ key: '/opt/certs/k.pem', cert: '/opt/certs/c.pem' });
        delete process.env.SSL_KEY_PATH;
        delete process.env.SSL_CERT_PATH;
        expect(server.rutasCertificados().key).toBe(path.join(server.CARPETA_CERTS, 'key.pem'));
    });
});

describe('leerCertificados', () => {
    test('error accionable cuando faltan key/cert', () => {
        const rutas = { key: '/ruta/inexistente/key.pem', cert: '/ruta/inexistente/cert.pem' };
        expect(() => server.leerCertificados(rutas)).toThrow(/mkcert/);
        expect(() => server.leerCertificados(rutas)).toThrow(/SERVER_HTTP=1/);
    });

    test('devuelve el contenido de key y cert si existen', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'certs-'));
        const key = path.join(dir, 'key.pem');
        const cert = path.join(dir, 'cert.pem');
        fs.writeFileSync(key, 'CLAVE');
        fs.writeFileSync(cert, 'CERTIFICADO');

        const leidos = server.leerCertificados({ key, cert });
        expect(leidos.key.toString()).toBe('CLAVE');
        expect(leidos.cert.toString()).toBe('CERTIFICADO');

        fs.rmSync(dir, { recursive: true, force: true });
    });
});

describe('iniciarServidor', () => {
    test('arranca en HTTP sobre un puerto efímero y acepta el apagado', async () => {
        const servidor = await server.iniciarServidor(appPing(), { http: true, port: 0, host: '127.0.0.1' });
        expect(servidor.listening).toBe(true);
        expect(servidor.address().port).toBeGreaterThan(0);
        await new Promise((resolve) => servidor.close(resolve));
    });

    test('en HTTPS sin certificados rechaza con el error explicado (no un ENOENT crudo)', async () => {
        process.env.SSL_KEY_PATH = '/ruta/inexistente/key.pem';
        process.env.SSL_CERT_PATH = '/ruta/inexistente/cert.pem';
        try {
            await expect(server.iniciarServidor(appPing(), { http: false, port: 0 })).rejects.toThrow(/HTTPS/);
            await expect(server.iniciarServidor(appPing(), { http: false, port: 0 })).rejects.toThrow(/mkcert/);
        } finally {
            delete process.env.SSL_KEY_PATH;
            delete process.env.SSL_CERT_PATH;
        }
    });

    test('admite certificados explícitos por opciones', async () => {
        const ssl = { key: Buffer.from('x'), cert: Buffer.from('y') };
        // https.createServer valida el material: se espera un fallo controlado,
        // nunca un crash del proceso.
        await expect(server.iniciarServidor(appPing(), { http: false, port: 0, ssl })).rejects.toBeDefined();
    });
});

describe('registrarApagadoGracioso', () => {
    test('cierra el listener, libera recursos y sale con código 0', async () => {
        const servidor = await server.iniciarServidor(appPing(), { http: true, port: 0, host: '127.0.0.1' });
        const salir = jest.fn();

        const apagar = server.registrarApagadoGracioso(servidor, { senales: [], salir, timeoutMs: 2000 });
        await apagar('SIGTERM');

        expect(salir).toHaveBeenCalledWith(0);
        expect(servidor.listening).toBe(false);
    });

    test('es idempotente: una segunda señal no vuelve a cerrar', async () => {
        const servidor = await server.iniciarServidor(appPing(), { http: true, port: 0, host: '127.0.0.1' });
        const salir = jest.fn();
        const apagar = server.registrarApagadoGracioso(servidor, { senales: [], salir, timeoutMs: 2000 });

        await apagar('SIGINT');
        await apagar('SIGINT');

        expect(salir).toHaveBeenCalledTimes(1);
    });
});
