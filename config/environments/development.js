// config/environments/development.js
module.exports = {
  env: 'development',
  port: process.env.PORT || 3000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'restaurante_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // false en desarrollo para HTTP
      maxAge: 3600000
    }
  },
  
  security: {
    cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    authRateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 5
    }
  },
  
  logging: {
    level: 'debug',
    file: true
  },
  
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    destination: 'public/uploads/'
  }
};
