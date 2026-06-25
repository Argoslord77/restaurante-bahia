const mysql = require('mysql2');
const config = require('./index');

const pool = mysql.createPool(config.database);

module.exports = pool.promise();