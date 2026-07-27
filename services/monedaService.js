// services/monedaService.js
const db = require('../config/db');

class MonedaService {
    /**
     * Obtiene el listado completo de monedas (activas e inactivas) o filtradas por estado.
     * @param {boolean|null} soloActivas 
     */
    static async obtenerTodas(soloActivas = false) {
        let sql = 'SELECT * FROM monedas';
        if (soloActivas) {
            sql += ' WHERE activo = 1';
        }
        sql += ' ORDER BY es_moneda_base DESC, codigo ASC';

        const [rows] = await db.query(sql);
        return rows;
    }

    /**
     * Obtiene una moneda específica por su ID.
     */
    static async obtenerPorId(id) {
        const [rows] = await db.query('SELECT * FROM monedas WHERE id = ?', [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Crea una nueva moneda asegurando las reglas de negocio.
     */
    static async crearMoneda(datos) {
        let { codigo, nombre, simbolo, factor_cambio, es_moneda_base } = datos;

        codigo = codigo.trim().toUpperCase();
        nombre = nombre.trim();
        simbolo = simbolo ? simbolo.trim() : '$';
        let esBase = es_moneda_base ? 1 : 0;
        let factor = parseFloat(factor_cambio);

        // Regla: Si se define como base, su factor debe ser estrictamente 1.0000
        if (esBase === 1) {
            factor = 1.0000;
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Si se establece esta como moneda base, desmarcamos cualquier otra base previa
            if (esBase === 1) {
                await conn.query('UPDATE monedas SET es_moneda_base = 0');
            }

            const [result] = await conn.query(
                `INSERT INTO monedas (codigo, nombre, simbolo, factor_cambio, es_moneda_base, activo)
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [codigo, nombre, simbolo, factor, esBase]
            );

            await conn.commit();
            return result.insertId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Actualiza la información de una moneda existente.
     */
    static async actualizarMoneda(id, datos) {
        const monedaActual = await this.obtenerPorId(id);
        if (!monedaActual) {
            throw new Error('La moneda especificada no existe.');
        }

        let { codigo, nombre, simbolo, factor_cambio, es_moneda_base } = datos;

        codigo = codigo.trim().toUpperCase();
        nombre = nombre.trim();
        simbolo = simbolo ? simbolo.trim() : '$';
        let esBase = es_moneda_base ? 1 : 0;
        let factor = parseFloat(factor_cambio);

        // Regla: Si se marca como base, su factor debe ser 1.0000
        if (esBase === 1) {
            factor = 1.0000;
        } else if (monedaActual.es_moneda_base === 1 && esBase === 0) {
            // Impedir quitar el flag de moneda base si no hay otra definida
            throw new Error('No se puede quitar el estado de moneda base directamente. Establezca otra moneda como base.');
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            if (esBase === 1) {
                await conn.query('UPDATE monedas SET es_moneda_base = 0');
            }

            await conn.query(
                `UPDATE monedas 
                 SET codigo = ?, nombre = ?, simbolo = ?, factor_cambio = ?, es_moneda_base = ?
                 WHERE id = ?`,
                [codigo, nombre, simbolo, factor, esBase, id]
            );

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Alterna la moneda base del sistema a una nueva.
     */
    static async establecerComoMonedaBase(id) {
        const moneda = await this.obtenerPorId(id);
        if (!moneda) {
            throw new Error('La moneda no existe.');
        }

        if (moneda.activo === 0) {
            throw new Error('No se puede establecer una moneda inactiva como moneda base.');
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Desmarcar todas las monedas
            await conn.query('UPDATE monedas SET es_moneda_base = 0');

            // 2. Establecer la nueva moneda base e inyectarle el factor obligatorio 1.0000
            await conn.query(
                'UPDATE monedas SET es_moneda_base = 1, factor_cambio = 1.0000 WHERE id = ?',
                [id]
            );

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    /**
     * Baja lógica (desactivar) o reactivación de moneda.
     */
    static async cambiarEstado(id, activo) {
        const moneda = await this.obtenerPorId(id);
        if (!moneda) {
            throw new Error('La moneda no existe.');
        }

        // Regla: No se puede desactivar la moneda base activa del sistema
        if (moneda.es_moneda_base === 1 && (activo === 0 || activo === false)) {
            throw new Error('Operación denegada. No se puede desactivar la moneda base del sistema.');
        }

        const nuevoEstado = activo ? 1 : 0;
        await db.query('UPDATE monedas SET activo = ? WHERE id = ?', [nuevoEstado, id]);
        return true;
    }
}

module.exports = MonedaService;