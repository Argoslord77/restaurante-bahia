// config/environments/production.js
module.exports = {
  env: 'production',
  port: process.env.PORT || 3000,
  
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20, // Mayor pool en producción
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // true en producción para HTTPS
      httpOnly: true,
      maxAge: 3600000,
      sameSite: 'strict'
    }
  },
  
  security: {
    cookieSecret: process.env.COOKIE_SECRET,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 50 // Más estricto en producción
    },
    authRateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 3 // Más estricto en producción
    }
  },
  
  logging: {
    level: 'warn', // Solo warnings y errores en producción
    file: true
  },
  
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    destination: 'public/uploads/'
  }
};
