// services/tableService.js
const TableModel = require('../models/tableModel');
const DistributionModel = require('../models/distributionModel');
const db = require('../config/db');

class TableService {

    // Listar todas las mesas ordenadas por ubicación y número mapeando el objeto orden_activa
    async getAllTables() {
        const rows = await TableModel.getAll();
        
        return rows.map(row => {
            const mesa = {
                id: row.id,
                numero: row.numero,
                capacidad: row.capacidad,
                estado: row.estado,
                ubicacion: row.ubicacion,
                creado_en: row.creado_en,
                actualizado_en: row.actualizado_en,
                orden_activa: null
            };

            // Si la fila contiene una orden vinculada, estructuramos el objeto orden_activa
            if (row.orden_id) {
                mesa.orden_activa = {
                    id: row.orden_id,
                    estado: row.orden_estado,
                    total_productos: parseInt(row.total_productos, 10) || 0
                };
            }

            return mesa;
        });
    }

    // Buscar una mesa específica por ID
    async getTableById(id) { 
        return await TableModel.getById(id); 
    }

    // Crear una nueva mesa respetando sus valores por defecto
    async createTable(data) { 
        return await TableModel.create(data); 
    }

    // Actualizar los datos de una mesa (incluyendo ubicación y estado)
    async updateTable(id, data) { 
        return await TableModel.update(id, data); 
    }

    // Eliminar físicamente el registro de la mesa
    async deleteTable(id) { 
        return await TableModel.delete(id); 
    }

    // Obtener los usuarios activos que tengan el rol de dependiente (Sin filtro de columna estado errónea)
    async getActiveWaiters() {
        const [rows] = await db.query(
            "SELECT id, nombre FROM usuarios WHERE rol = 'dependiente' ORDER BY nombre ASC"
        );
        return rows;
    }

    // Obtener el mapeo de la distribución de hoy
    async getDistributionToday(ubicacion) {
        const hoy = new Date().toISOString().split('T')[0];
        const asignacion = await DistributionModel.getByDateAndLocation(hoy, ubicacion);
        
        if (!asignacion) return null;
        
        const detalles = await DistributionModel.getDetailsByAssignmentId(asignacion.id);
        
        // Retornamos un objeto indexado por mesa_id para búsqueda rápida O(1) en la vista
        return detalles.reduce((acc, cur) => {
            acc[cur.mesa_id] = { id: cur.dependiente_id, nombre: cur.dependiente_nombre };
            return acc;
        }, {});
    }

    // Guardar o actualizar la distribución diaria de forma incremental (Upsert)
    async saveDistribution(ubicacion, asignaciones) {
        const hoy = new Date().toISOString().split('T')[0];
        let asignacionId;

        // Comprobar si ya existe el encabezado de asignación para la fecha y área actual
        const existente = await DistributionModel.getByDateAndLocation(hoy, ubicacion);
        if (existente) {
            asignacionId = existente.id;
        } else {
            asignacionId = await DistributionModel.createAssignment(hoy, ubicacion);
        }

        // Procesar de manera segura cada mesa de forma incremental sin interferir con las otras
        for (const asign of asignaciones) {
            if (asign.mesaId && asign.dependienteId) {
                await DistributionModel.upsertDetail(asignacionId, asign.mesaId, asign.dependienteId);
            }
        }
        return true;
    }

    // Cambiar el estado operativo de una mesa de manera directa
    async changeStatus(id, nuevoEstado) {
        const mesaActual = await TableModel.getById(id);
        if (!mesaActual) throw new Error('La mesa no existe');
        return await TableModel.update(id, { ...mesaActual, estado: nuevoEstado });
    }

    // Obtener un listado filtrado de las mesas que están libres
    async getAvailableTables() {
        const tables = await TableModel.getAll();
        return tables.filter(t => t.estado === 'libre');
    }
}

module.exports = new TableService();