// services/tableService.js
const TableModel = require('../models/tableModel');
const UbicacionMesaModel = require('../models/ubicacionMesaModel');
const db = require('../config/db');

class TableService {

    // Listar todas las mesas ordenadas mapeando tanto orden_activa como variables planas para la vista
    async getAllTables() {
        const rows = await TableModel.getAll();
        
        return rows.map(row => {
            const mesa = {
                id: row.id,
                numero: row.numero,
                carta: row.carta,
                capacidad: row.capacidad,
                estado: row.estado,
                ubicacion: row.ubicacion,
                ubicacion_id: row.ubicacion_id || null,
                creado_en: row.creado_en,
                actualizado_en: row.actualizado_en,
                pedido_id: row.orden_id || null,
                pedido_estado: row.orden_estado || null,
                total_productos: parseInt(row.total_productos, 10) || 0,
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

    // Resolver el área de una mesa contra el catálogo ubicacion_mesa.
    // Acepta el id del área (flujo nuevo) o, como retrocompatibilidad,
    // el nombre del área (lo busca y lo crea si no existe).
    // Devuelve { ubicacion_id, ubicacion } con el nombre canónico.
    async resolverUbicacion(ubicacionId, ubicacionNombre) {
        const DEFECTO = 'Salon Principal';

        if (ubicacionId !== undefined && ubicacionId !== null && ubicacionId !== '') {
            const ubicacion = await UbicacionMesaModel.getById(ubicacionId);
            if (!ubicacion) {
                throw new Error('El área de servicio seleccionada no existe en el catálogo.');
            }
            return { ubicacion_id: ubicacion.id, ubicacion: ubicacion.nombre };
        }

        const nombre = (ubicacionNombre || '').toString().trim() || DEFECTO;
        let ubicacion = await UbicacionMesaModel.getByNombre(nombre);
        if (!ubicacion) {
            // Retrocompatibilidad: dar de alta el área indicada por nombre
            await UbicacionMesaModel.create({ nombre });
            ubicacion = await UbicacionMesaModel.getByNombre(nombre);
        }
        return { ubicacion_id: ubicacion ? ubicacion.id : null, ubicacion: nombre };
    }

    // Crear una nueva mesa respetando sus valores por defecto
    async createTable(data) { 
        const { ubicacion_id, ubicacion } = await this.resolverUbicacion(
            data.ubicacion_id,
            data.ubicacion
        );
        return await TableModel.create({ ...data, ubicacion_id, ubicacion });
    }

    // Actualizar los datos de una mesa (incluyendo ubicación y estado)
    async updateTable(id, data) { 
        const { ubicacion_id, ubicacion } = await this.resolverUbicacion(
            data.ubicacion_id,
            data.ubicacion
        );
        return await TableModel.update(id, { ...data, ubicacion_id, ubicacion });
    }

    // Eliminar físicamente el registro de la mesa
    async deleteTable(id) { 
        return await TableModel.delete(id); 
    }

    // Obtener los usuarios activos que tengan el rol de dependiente o capitan
    async getActiveWaiters() {
        const [rows] = await db.query(
            "SELECT id, CONCAT(nombre, ' ', apellidos) AS nombre, rol FROM usuarios WHERE rol IN ('dependiente', 'capitan', 'administrador', 'superadministrador') AND activo = 1 ORDER BY nombre ASC"
        );
        return rows;
    }

    // Obtener el mapeo de la distribución asociada al turno activo
    async getDistributionToday(ubicacion, turnoId = null) {
        if (!turnoId) return null;

        const [distRows] = await db.query(`
            SELECT 
                dam.mesa_id,
                dam.dependiente_id,
                CONCAT(u.nombre, ' ', u.apellidos) AS dependiente_nombre
            FROM asignaciones_diarias ad
            INNER JOIN detalle_asignacion_mesa dam ON ad.id = dam.asignacion_diaria_id
            INNER JOIN usuarios u ON dam.dependiente_id = u.id
            WHERE ad.turno_id = ? AND ad.ubicacion = ?
              AND ad.id = (
                  SELECT MAX(a2.id) FROM asignaciones_diarias a2
                  WHERE a2.turno_id = ad.turno_id AND a2.ubicacion = ad.ubicacion
              )
        `, [turnoId, ubicacion]);

        if (distRows.length === 0) return null;

        return distRows.reduce((acc, cur) => {
            acc[cur.mesa_id] = { id: cur.dependiente_id, dependiente_id: cur.dependiente_id, nombre: cur.dependiente_nombre };
            return acc;
        }, {});
    }

    // Guardar o actualizar la distribución vinculada al turno
    async saveDistribution(ubicacion, asignaciones, turnoId = null) {
        const hoy = new Date().toISOString().split('T')[0];
        let asignacionId;

        // 1. La asignación pertenece al TURNO: INSERT atómico tipo "upsert".
        //    ON DUPLICATE KEY + LAST_INSERT_ID(id) devuelve el id de la fila
        //    existente cuando ya hay asignación para este turno+ubicación (o si
        //    otro guardado concurrente la creó un instante antes, p. ej. doble
        //    clic en "Guardar"), eliminando el error de "entrada duplicada".
        if (turnoId) {
            const [resultado] = await db.query(
                `INSERT INTO asignaciones_diarias (fecha, ubicacion, turno_id)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
                [hoy, ubicacion, turnoId]
            );
            asignacionId = resultado.insertId;

            // Protección: si la BD aún tiene el índice viejo (fecha, ubicacion)
            // sin migrar, el upsert pudo resolver sobre una fila de OTRO turno.
            const [fila] = await db.query(
                'SELECT id, turno_id FROM asignaciones_diarias WHERE id = ? LIMIT 1',
                [asignacionId]
            );
            if (!fila.length || Number(fila[0].turno_id) !== Number(turnoId)) {
                throw new Error('Esquema desactualizado: asignaciones_diarias sigue usando el índice por fecha. Ejecuta scripts/migracion_asignaciones_por_turno.sql');
            }
        } else {
            // Compatibilidad sin turno: se busca una fila libre (sin turno) del día.
            // Nunca se reasigna el turno_id de una fila que pertenece a otro turno.
            const [existentes] = await db.query(
                'SELECT id FROM asignaciones_diarias WHERE fecha = ? AND ubicacion = ? AND turno_id IS NULL LIMIT 1',
                [hoy, ubicacion]
            );

            if (existentes.length > 0) {
                asignacionId = existentes[0].id;
            } else {
                const [resultado] = await db.query(
                    'INSERT INTO asignaciones_diarias (fecha, ubicacion, turno_id) VALUES (?, ?, ?)',
                    [hoy, ubicacion, null]
                );
                asignacionId = resultado.insertId;
            }
        }

        // 2. Insertar o actualizar cada detalle de mesa
        for (const asign of asignaciones) {
            if (asign.mesaId && asign.dependienteId) {
                await db.query(`
                    INSERT INTO detalle_asignacion_mesa (asignacion_diaria_id, mesa_id, dependiente_id)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE dependiente_id = VALUES(dependiente_id)
                `, [asignacionId, asign.mesaId, asign.dependienteId]);
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