// controllers/tableController.js
const tableService = require('../services/tableService');
const TurnoService = require('../services/turnoService');

exports.listTables = async (req, res) => {
    try {
        // 1. Verificar si existe un turno activo
        const turnoActivo = await TurnoService.obtenerTurnoActivo();
        const hayTurnoActivo = !!turnoActivo;

        const tables = await tableService.getAllTables();
        const waiters = await tableService.getActiveWaiters();
        
        // Capturar áreas únicas del mobiliario actual
        const areas = [...new Set(tables.map(t => t.ubicacion || 'Salon Principal'))];
        
        // Consultar la distribución de todas las áreas si hay un turno activo
        let distributionToday = {};
        if (hayTurnoActivo) {
            for (const area of areas) {
                const distArea = await tableService.getDistributionToday(area, turnoActivo.id);
                if (distArea) {
                    distributionToday = { ...distributionToday, ...distArea };
                }
            }
        }

        const serverIp = process.env.SERVER_IP || 'localhost';

        // Renderiza la vista 
        res.render('admin/tables', {
            tables,
            waiters,
            areas,
            distributionToday,
            hayTurnoActivo,
            turnoActivo,
            user: req.user,
            view: 'tables',
            serverIp
        });
    } catch (error) {
        console.error('Error crítico al listar mesas con distribución:', error);
        res.status(500).send('Error interno al obtener el salón de mesas');
    }
};

// Guardar la distribución enviada en formato JSON vinculada al turno activo
exports.saveDistribution = async (req, res) => {
    try {
        const { asignaciones } = req.body;
        if (!Array.isArray(asignaciones)) {
            return res.status(400).json({ success: false, message: 'Parámetros de distribución inválidos.' });
        }

        // Obtener el turno activo para vincular la distribución
        const turnoActivo = await TurnoService.obtenerTurnoActivo();
        if (!turnoActivo) {
            return res.status(400).json({ success: false, message: 'No hay un turno de servicio abierto.' });
        }

        // Agrupar asignaciones por ubicación para guardarlas con su área correspondiente
        const tables = await tableService.getAllTables();
        const tableAreaMap = tables.reduce((acc, t) => {
            acc[t.id] = t.ubicacion || 'Salon Principal';
            return acc;
        }, {});

        // Agrupar las asignaciones por ubicación
        const asignacionesPorArea = {};
        for (const asign of asignaciones) {
            const area = tableAreaMap[asign.mesaId] || req.body.ubicacion || 'Salon Principal';
            if (!asignacionesPorArea[area]) asignacionesPorArea[area] = [];
            asignacionesPorArea[area].push(asign);
        }

        // Guardar por cada área vinculando el turno activo
        for (const [area, listaAsignaciones] of Object.entries(asignacionesPorArea)) {
            await tableService.saveDistribution(area, listaAsignaciones, turnoActivo.id);
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Distribución del salón guardada correctamente para el turno activo.' 
        });
    } catch (error) {
        console.error('Error al guardar distribución:', error);
        return res.status(500).json({ success: false, message: 'Error interno al procesar la distribución.' });
    }
};

// 2. CREAR NUEVA MESA (con soporte de carta)
exports.createTable = async (req, res) => {
    try {
        const numero = req.body.numero ? req.body.numero.trim() : '';
        const carta = req.body.carta ? req.body.carta.trim() : 'CUP';
        const ubicacion = req.body.ubicacion ? req.body.ubicacion.trim() : 'Salon Principal';
        const { capacidad, estado } = req.body;

        if (!numero) {
            return res.status(400).json({ success: false, message: 'El código o número de mesa es obligatorio.' });
        }

        await tableService.createTable({
            numero,
            carta,
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
        const carta = req.body.carta ? req.body.carta.trim() : 'CUP';
        const ubicacion = req.body.ubicacion ? req.body.ubicacion.trim() : 'Salon Principal';
        const { capacidad, estado } = req.body;

        if (!numero) {
            return res.status(400).json({ success: false, message: 'El número de mesa es obligatorio.' });
        }

        const updateData = {
            numero,
            carta,
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