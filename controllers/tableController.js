// controllers/tableController.js
const tableService = require('../services/tableService');

exports.listTables = async (req, res) => {
    try {
        const tables = await tableService.getAllTables();
        const waiters = await tableService.getActiveWaiters();
        
        // Capturar áreas únicas del mobiliario actual (Uso de 'Salon Principal' sin acento)
        const areas = [...new Set(tables.map(t => t.ubicacion || 'Salon Principal'))];
        
        // Consultar la distribución de la primera área por defecto o procesar el mapa completo de hoy
        const distributionToday = await tableService.getDistributionToday(areas[0] || 'Salon Principal');

        const serverIp = process.env.SERVER_IP || 'localhost';

        res.render('admin/tables', {
            tables,
            waiters,
            areas,
            distributionToday: distributionToday || {}, // Enviado como objeto para indexación directa
            user: req.user,
            view: 'table',
            serverIp
        });
    } catch (error) {
        console.error('Error crítico al listar mesas con distribución:', error);
        res.status(500).send('Error interno al obtener el salón de mesas');
    }
};

// Guardar la distribución enviada en formato JSON
exports.saveDistribution = async (req, res) => {
    try {
        const { ubicacion, asignaciones } = req.body;
        if (!ubicacion || !Array.isArray(asignaciones)) {
            return res.status(400).json({ success: false, message: 'Parámetros de distribución inválidos.' });
        }

        await tableService.saveDistribution(ubicacion, asignaciones);
        return res.status(200).json({ success: true, message: 'Distribución del salón guardada correctamente para el día de hoy.' });
    } catch (error) {
        console.error('Error al guardar distribución:', error);
        return res.status(500).json({ success: false, message: 'Error interno al procesar la distribución.' });
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

        // Se envían ÚNICAMENTE los campos existentes en tu estructura SQL
        await tableService.createTable({
            numero,
            ubicacion,
            capacidad: parseInt(capacidad, 10) || 2,
            estado: estado || 'libre'
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
        const { capacidad, estado } = req.body;

        if (!numero) {
            return res.status(400).json({ success: false, message: 'El número de mesa es obligatorio.' });
        }

        // Removida la lógica e intentos de mutación del campo inexistente auto_hash
        const updateData = {
            numero,
            ubicacion,
            capacidad: parseInt(capacidad, 10) || 2,
            estado
        };

        await tableService.updateTable(id, updateData);

        return res.status(200).json({
            success: true,
            message: `Propiedades de la Mesa ${numero} actualizadas con éxito.`
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