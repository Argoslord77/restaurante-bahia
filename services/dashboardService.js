const db = require('../config/db');

class DashboardService {

    async getMetrics() {

        const [
            mesasTotalesRows
        ] = await db.query(`
            SELECT COUNT(*) total
            FROM mesas
        `);

        const [
            mesasOcupadasRows
        ] = await db.query(`
            SELECT COUNT(*) total
            FROM mesas
            WHERE estado = 'ocupada'
        `);

        const [
            usuariosRows
        ] = await db.query(`
            SELECT COUNT(*) total
            FROM usuarios
        `);

        const [
            platillosRows
        ] = await db.query(`
            SELECT COUNT(*) total
            FROM platillos_menu
        `);

        const [
            inventarioRows
        ] = await db.query(`
            SELECT COUNT(*) total
            FROM inventario
        `);

        return {

            mesasTotales:
                mesasTotalesRows[0]?.total || 0,

            mesasOcupadas:
                mesasOcupadasRows[0]?.total || 0,

            totalUsuarios:
                usuariosRows[0]?.total || 0,

            totalPlatillos:
                platillosRows[0]?.total || 0,

            totalInventario:
                inventarioRows[0]?.total || 0,

            pedidosCocina: 0,
            ventasDia: 0
        };
    }

}

module.exports = new DashboardService();