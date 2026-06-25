// config/environments/test.js
module.exports = {
  env: 'test',
  port: process.env.TEST_PORT || 3001,
  
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 3306,
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASS || '',
    database: process.env.TEST_DB_NAME || 'restaurante_db_test',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  },
  
  session: {
    secret: 'test-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 3600000
    }
  },
  
  security: {
    cookieSecret: 'test-cookie-secret',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000 // Sin límite en tests
    },
    authRateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 1000 // Sin límite en tests
    }
  },
  
  logging: {
    level: 'error', // Solo errores en tests
    file: false
  },
  
  upload: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    destination: 'public/uploads/test/'
  }
};
