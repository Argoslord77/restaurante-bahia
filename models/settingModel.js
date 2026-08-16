// models/settingModel.js
const db = require('../config/db');

const Setting = {
    // Obtener todas las configuraciones mapeadas por clave con su valor y nombre descriptivo
    getAllAsObject: async () => {
        const [rows] = await db.query('SELECT clave, valor, nombre FROM configuraciones_sistema');
        return rows.reduce((acc, cur) => {
            acc[cur.clave] = {
                valor: cur.valor,
                nombre: cur.nombre
            };
            return acc;
        }, {});
    },

    // Actualizar de manera masiva el lote de valores enviado desde la interfaz
    updateBatch: async (settingsObject) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const [clave, valor] of Object.entries(settingsObject)) {
                await connection.query(
                    `INSERT INTO configuraciones_sistema (clave, valor) 
                     VALUES (?, ?) 
                     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
                    [clave, valor]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
       * Actualiza el valor de una configuración si existe, 
       * o inserta un nuevo registro si la clave no se encuentra registrada.
       */
  updateSetting: async (clave, valor) => {
    try {
      const sql = `
        INSERT INTO configuraciones_sistema (clave, valor) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
      `;
      
      const [result] = await db.query(sql, [clave, valor]);
      return result;
    } catch (error) {
      console.error('Error en settingModel.updateSetting:', error);
      throw error;
    }
  },

    // Método para obtener un registro por su clave
    getByKey: async (clave) => {
        try {
          const sql = `SELECT * FROM configuraciones_sistema WHERE clave = ? LIMIT 1`;
          const [rows] = await db.query(sql, [clave]);
          return rows.length > 0 ? rows[0] : null;
        } catch (error) {
          console.error('Error en settingModel.getByKey:', error);
          throw error;
        }
    },
};

module.exports = Setting;