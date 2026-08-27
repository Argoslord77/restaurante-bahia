// controllers/backupController.js
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const multer = require('multer');
const BackupService = require('../services/backupService');
const AuditLogService = require('../services/auditLogService');

const restoreDirectory = path.join(os.tmpdir(), 'bahia-restore');
fs.mkdirSync(restoreDirectory, { recursive: true, mode: 0o700 });

const restoreUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => callback(null, restoreDirectory),
        filename: (_req, file, callback) => {
            const extension = path.extname(file.originalname || '').toLowerCase() || '.sql';
            callback(null, `restore-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
        }
    }),
    limits: { fileSize: BackupService.LIMITE_RESTAURACION },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const tiposPermitidos = ['.sql', '.txt'];
        if (!tiposPermitidos.includes(extension)) {
            return callback(new Error('Sólo se permiten archivos .sql o .txt.'));
        }
        callback(null, true);
    }
});

function esAdministrador(req) {
    return ['superadministrador', 'administrador'].includes(req.user?.rol);
}

function datosArchivo(file) {
    return file ? {
        nombre: file.originalname,
        tipo: file.mimetype,
        tamano: file.size
    } : null;
}

exports.restoreUpload = restoreUpload;

exports.downloadBackup = async (req, res, next) => {
    req.auditAction = 'BACKUP_DATABASE';
    if (!esAdministrador(req)) return res.status(403).json({ success: false, message: 'Sólo los administradores pueden realizar salvas.' });

    let backup;
    try {
        backup = await BackupService.crearBackup();
        await AuditLogService.registrar({
            usuario_id: req.user?.id,
            usuario_nombre: [req.user?.nombre, req.user?.apellidos].filter(Boolean).join(' '),
            usuario_rol: req.user?.rol,
            metodo_http: 'GET',
            ruta: '/configuracion/backup',
            accion: 'BACKUP_DATABASE_CREATED',
            estado_http: 200,
            operacion_exitosa: true,
            ip_origen: req.ip,
            user_agent: req.get && req.get('user-agent'),
            datos: { archivo: backup.filename, tamano: backup.size }
        });

        return res.download(backup.filePath, backup.filename, async error => {
            await BackupService.eliminarBackup(backup);
            if (error && !res.headersSent && next) next(error);
        });
    } catch (error) {
        console.error('Error al generar salva de BD:', error);
        return res.status(503).json({
            success: false,
            message: 'No se pudo generar la salva. Verifique que mysqldump esté instalado y que la conexión sea válida.'
        });
    }
};

exports.restoreBackup = async (req, res) => {
    req.auditAction = 'RESTORE_DATABASE';
    if (!esAdministrador(req)) {
        if (req.file?.path) await fsp.unlink(req.file.path).catch(() => {});
        return res.status(403).json({ success: false, message: 'Sólo los administradores pueden restaurar datos.' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Seleccione un archivo .sql o .txt para restaurar.' });
    }

    const archivo = datosArchivo(req.file);
    try {
        await BackupService.restaurarBackup(req.file.path);

        // Una salva antigua puede no contener la tabla de auditoría. Se crea
        // nuevamente antes de registrar el resultado y de atender más requests.
        await AuditLogService.ensureTable();
        await AuditLogService.registrar({
            usuario_id: req.user?.id,
            usuario_nombre: [req.user?.nombre, req.user?.apellidos].filter(Boolean).join(' '),
            usuario_rol: req.user?.rol,
            metodo_http: 'POST',
            ruta: '/configuracion/restore',
            accion: 'RESTORE_DATABASE_COMPLETED',
            estado_http: 200,
            operacion_exitosa: true,
            ip_origen: req.ip,
            user_agent: req.get && req.get('user-agent'),
            datos: { archivo }
        });

        return res.json({
            success: true,
            message: 'La base de datos fue restaurada correctamente. Se recomienda cerrar las sesiones y reiniciar la aplicación.'
        });
    } catch (error) {
        console.error('Error al restaurar BD:', error);
        await AuditLogService.ensureTable().catch(() => {});
        await AuditLogService.registrar({
            usuario_id: req.user?.id,
            usuario_nombre: [req.user?.nombre, req.user?.apellidos].filter(Boolean).join(' '),
            usuario_rol: req.user?.rol,
            metodo_http: 'POST',
            ruta: '/configuracion/restore',
            accion: 'RESTORE_DATABASE_FAILED',
            estado_http: 400,
            operacion_exitosa: false,
            ip_origen: req.ip,
            user_agent: req.get && req.get('user-agent'),
            datos: { archivo, error: error.message }
        });
        return res.status(400).json({
            success: false,
            message: `No se pudo restaurar la base de datos: ${error.message}`
        });
    } finally {
        await fsp.unlink(req.file.path).catch(() => {});
    }
};
