// tienda/config/db.js — Pool MySQL (tienda_db). La conexión es perezosa:
// crear el pool no abre conexiones hasta la primera consulta.
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.BD_HOST || 'localhost',
    user: process.env.BD_USER || 'root',
    password: process.env.BD_PASS || '',
    database: process.env.BD_NAME || 'tienda_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
