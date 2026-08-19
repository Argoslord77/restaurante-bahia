// models/platilloDiaModel.js
const db = require('../config/db');

class PlatilloDiaModel {
    /**
     * Obtiene los platillos del día del turno activo actual
     */
    static async getByTurno(turnoId) {
        if (!turnoId) return [];
        const [rows] = await db.query(`
            SELECT 
                pd.id,
                pd.nombre,
                pd.descripcion,
                pd.precio,
                pd.precio_alt,
                pd.precio_usd,
                pd.tipo,
                pd.foto,
                pd.activo,
                pd.creado_en,
                pd.turno_servicio_id,
                CONCAT(u.nombre, ' ', u.apellidos) AS creado_por
            FROM platillos_dia pd
            LEFT JOIN usuarios u ON pd.usuario_id = u.id
            WHERE pd.turno_servicio_id = ? AND pd.activo = 1
            ORDER BY pd.tipo ASC, pd.nombre ASC
        `, [turnoId]);
        return rows;
    }

    /**
     * Obtiene el catálogo histórico de platillos del día de turnos anteriores (para reutilizar)
     */
    static async getHistorico() {
        const [rows] = await db.query(`
            SELECT 
                pd.id,
                pd.nombre,
                pd.descripcion,
                pd.precio,
                pd.precio_alt,
                pd.precio_usd,
                pd.tipo,
                pd.foto,
                pd.creado_en,
                pd.turno_servicio_id,
                ts.fecha_apertura AS fecha_turno
            FROM platillos_dia pd
            INNER JOIN turnos_servicio ts ON pd.turno_servicio_id = ts.id
            ORDER BY pd.id DESC
            LIMIT 50
        `);
        return rows;
    }

    /**
     * Inserta un nuevo platillo/trago del día al turno activo
     */
    static async create(data) {
        const {
            turno_servicio_id,
            nombre,
            descripcion,
            precio,
            precio_alt,
            precio_usd,
            tipo,
            foto,
            usuario_id
        } = data;

        const [result] = await db.query(`
            INSERT INTO platillos_dia (
                turno_servicio_id, nombre, descripcion, precio, precio_alt, precio_usd, tipo, foto, usuario_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            turno_servicio_id,
            nombre,
            descripcion || null,
            precio,
            precio_alt || null,
            precio_usd || null,
            tipo || 'COMESTIBLES',
            foto || null,
            usuario_id || null
        ]);

        return result.insertId;
    }

    /**
     * Reutiliza/Clona un platillo del día anterior hacia el turno activo actual
     */
    static async clonarAlTurnoActual(platilloDiaId, nuevoTurnoId, usuarioId) {
        const [rows] = await db.query("SELECT * FROM platillos_dia WHERE id = ?", [platilloDiaId]);
        if (rows.length === 0) throw new Error("El platillo histórico no existe.");

        const p = rows[0];
        return await this.create({
            turno_servicio_id: nuevoTurnoId,
            nombre: p.nombre,
            descripcion: p.descripcion,
            precio: p.precio,
            precio_alt: p.precio_alt,
            precio_usd: p.precio_usd,
            tipo: p.tipo,
            foto: p.foto,
            usuario_id: usuarioId
        });
    }

    /**
     * Desactiva / Elimina un platillo del día del turno actual
     */
    static async delete(id) {
        const [result] = await db.query("DELETE FROM platillos_dia WHERE id = ?", [id]);
        return result.affectedRows;
    }
}

module.exports = PlatilloDiaModel;