const db = require('../config/db'); // Tu pool basado en promesas

const UnidadMedida = {
    // Obtener todas las unidades de medida activas
    getActivas: async () => {
        const query = `
            SELECT id, codigo, nombre 
            FROM unidades_medida 
            WHERE activa = 1 
            ORDER BY nombre ASC
        `;
        // Al usar el cliente de promesas, db.query devuelve un array [rows, fields]
        const [rows] = await db.query(query);
        return rows;
    }
};

module.exports = UnidadMedida;