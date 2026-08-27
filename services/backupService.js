// services/backupService.js
// Salva y restaura la base de datos sin interpolar comandos del usuario.
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');

const LIMITE_RESTAURACION = Math.max(
    1,
    Number(process.env.BACKUP_MAX_FILE_SIZE_MB || 100)
) * 1024 * 1024;

function dbConfig() {
    const database = config.database || {};
    return {
        host: database.host || process.env.DB_HOST || 'localhost',
        port: String(database.port || process.env.DB_PORT || 3306),
        user: database.user || process.env.DB_USER || 'root',
        password: database.password || process.env.DB_PASS || '',
        name: database.database || process.env.DB_NAME || 'restaurante_db'
    };
}

function argumentosMysql(comando) {
    const db = dbConfig();
    const comunes = [
        '--protocol=tcp',
        '--host', db.host,
        '--port', db.port,
        '--user', db.user
    ];
    if (comando === 'mysqldump') {
        return [
            ...comunes,
            '--single-transaction',
            '--routines',
            '--triggers',
            '--events',
            '--no-tablespaces',
            '--hex-blob',
            db.name
        ];
    }
    return [...comunes, db.name];
}

function entornoMysql() {
    const db = dbConfig();
    const env = { ...process.env };
    // MYSQL_PWD evita exponer la contraseña en la línea de procesos.
    env.MYSQL_PWD = db.password;
    return env;
}

function nombreSeguro(valor) {
    return String(valor || '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 100) || 'respaldo.sql';
}

async function crearBackup({ directorio = null, prefijo = 'restaurante_bahia_' } = {}) {
    const dir = directorio
        ? await fsp.mkdir(directorio, { recursive: true }).then(() => directorio)
        : await fsp.mkdtemp(path.join(os.tmpdir(), 'bahia-backup-'));
    const fecha = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = nombreSeguro(`${prefijo}${fecha}.sql`);
    const filePath = path.join(dir, filename);
    const fd = fs.openSync(filePath, 'w', 0o600);
    let stderr = '';

    try {
        await new Promise((resolve, reject) => {
            const proceso = spawn('mysqldump', argumentosMysql('mysqldump'), {
                env: entornoMysql(),
                stdio: ['ignore', fd, 'pipe']
            });
            proceso.stderr.on('data', chunk => {
                stderr = `${stderr}${chunk}`.slice(-4000);
            });
            proceso.once('error', reject);
            proceso.once('close', codigo => {
                if (codigo === 0) return resolve();
                reject(new Error(`mysqldump terminó con código ${codigo}. ${stderr.trim()}`.trim()));
            });
        });

        const stat = await fsp.stat(filePath);
        return { filePath, filename, directory: dir, size: stat.size };
    } catch (error) {
        try { await fsp.unlink(filePath); } catch (_) { /* noop */ }
        throw error;
    } finally {
        try { fs.closeSync(fd); } catch (_) { /* noop */ }
    }
}

async function eliminarBackup(backup) {
    if (!backup || !backup.filePath) return;
    try { await fsp.unlink(backup.filePath); } catch (_) { /* noop */ }
    if (backup.directory && path.basename(backup.directory).startsWith('bahia-backup-')) {
        try { await fsp.rmdir(backup.directory); } catch (_) { /* noop */ }
    }
}

async function restaurarBackup(filePath) {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error('El archivo de restauración no es válido.');
    if (stat.size === 0) throw new Error('El archivo de restauración está vacío.');
    if (stat.size > LIMITE_RESTAURACION) {
        throw new Error(`El archivo supera el límite de ${Math.round(LIMITE_RESTAURACION / 1024 / 1024)} MB.`);
    }

    let stderr = '';
    await new Promise((resolve, reject) => {
        const proceso = spawn('mysql', argumentosMysql('mysql'), {
            env: entornoMysql(),
            stdio: ['pipe', 'ignore', 'pipe']
        });
        const entrada = fs.createReadStream(filePath);
        let terminado = false;
        const fallar = error => {
            if (terminado) return;
            terminado = true;
            entrada.destroy();
            try { proceso.stdin.destroy(); } catch (_) { /* noop */ }
            reject(error);
        };

        proceso.stderr.on('data', chunk => {
            stderr = `${stderr}${chunk}`.slice(-6000);
        });
        entrada.once('error', fallar);
        proceso.once('error', fallar);
        proceso.once('close', codigo => {
            if (terminado) return;
            terminado = true;
            if (codigo === 0) return resolve();
            reject(new Error(`mysql terminó con código ${codigo}. ${stderr.trim()}`.trim()));
        });
        entrada.pipe(proceso.stdin);
    });

    return { size: stat.size };
}

module.exports = {
    LIMITE_RESTAURACION,
    dbConfig,
    crearBackup,
    eliminarBackup,
    restaurarBackup
};
