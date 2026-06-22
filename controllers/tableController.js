// tableController.js
const tableService = require('../services/tableService');
const crypto = require('crypto');

// 1. LISTAR TODAS LAS MESAS (Pasamos la IP del Servidor a la vista)
exports.listTables = async (req, res) => {
    try {
        const tables = await tableService.getAllTables();
        
        // Capturar la IP del .env para la construcción de los QR
        const serverIp = process.env.SERVER_IP || 'localhost';

        res.render('admin/tables', {
            tables,
            user: req.user,
            view: 'table',
            serverIp // Enviado a la plantilla EJS
        });
    } catch (error) {
        console.error('Error crítico al listar mesas:', error);
        res.status(500).send('Error interno al obtener el salón de mesas');
    }
};

// 2. CREAR NUEVA MESA
exports.createTable = async (req, res) => {
    try {
        const numero = req.body.numero ? req.body.numero.trim() : '';
        const ubicacion = req.body.ubicacion ? req.body.ubicacion.trim() : 'Salon Principal';
        const { capacidad, estado } = req.body;

        if (!numero) {
            return res.status(400).json({ success: false, message: 'El código o número de mesa es obligatorio.' });
        }

        const auto_hash = crypto.createHash('sha256').update(`mesa-${numero}-${Date.now()}`).digest('hex');

        await tableService.createTable({
            numero,
            ubicacion,
            capacidad: parseInt(capacidad, 10) || 2,
            estado: estado || 'libre',
            auto_hash
        });

        return res.status(200).json({ success: true, message: 'Mesa dada de alta exitosamente.' });
    } catch (error) {
        console.error('Error crítico al crear mesa:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'El código o número de mesa ya está registrado.' });
        }
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// 3. EDITAR MESA 
exports.updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const numero = req.body.numero ? req.body.numero.trim() : '';
        const ubicacion = req.body.ubicacion ? req.body.ubicacion.trim() : 'Salon Principal';
        const { capacidad, estado, regenerarHash } = req.body;

        if (!numero) {
            return res.status(400).json({ success: false, message: 'El número de mesa es obligatorio.' });
        }

        const updateData = {
            numero,
            ubicacion,
            capacidad: parseInt(capacidad, 10) || 2,
            estado,
            regenerarHash: !!regenerarHash
        };

        if (updateData.regenerarHash) {
            const tokenAleatorio = crypto.randomBytes(4).toString('hex');
            updateData.auto_hash = `${Date.now()}${tokenAleatorio}`;
        }

        await tableService.updateTable(id, updateData);

        return res.status(200).json({
            success: true,
            message: updateData.regenerarHash 
                ? `Mesa ${numero} guardada correctamente y se ha regenerado un nuevo código QR.`
                : `Propiedades de la Mesa ${numero} actualizadas con éxito.`
        });

    } catch (error) {
        console.error('Error crítico al editar mesa:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'No puedes renombrar la mesa a un código que ya existe.' });
        }
        return res.status(500).json({ success: false, message: 'Error al procesar la actualización de la mesa.' });
    }
};

// 4. ELIMINAR MESA
exports.deleteTable = async (req, res) => {
    try {
        const { id } = req.params;
        await tableService.deleteTable(id);
        return res.status(200).json({ success: true, message: 'Mesa dada de baja del sistema correctamente.' });
    } catch (error) {
        console.error('Error crítico al eliminar mesa:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al procesar la baja.' });
    }
};