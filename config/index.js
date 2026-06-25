// config/index.js - Módulo centralizado de configuración
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  development: require('./environments/development'),
  production: require('./environments/production'),
  test: require('./environments/test')
};

module.exports = config[env];
