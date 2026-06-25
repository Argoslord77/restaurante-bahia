# REST_CAFE_BAR - Sistema de Gestión de Restaurante

Sistema de gestión integral para restaurantes con funcionalidades de POS, inventario, gestión de usuarios y pedidos. Construido con Node.js, Express.js y MySQL.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación](#instalación)
- [Configuración de Base de Datos](#configuración-de-base-de-datos)
- [Variables de Entorno](#variables-de-entorno)
- [Ejecución del Proyecto](#ejecución-del-proyecto)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Roles de Usuario](#roles-de-usuario)
- [Testing](#testing)
- [Arquitectura](#arquitectura)

## ✨ Características

- **Gestión de Usuarios**: Sistema de autenticación con roles (superadministrador, administrador, dependiente)
- **Gestión de Menú**: CRUD completo para platillos con fotos y precios
- **Sistema POS**: Punto de venta interactivo con soporte para códigos QR
- **Gestión de Mesas**: Control de mesas del restaurante
- **Gestión de Pedidos**: Ciclo completo de pedidos desde creación hasta cierre financiero
- **Inventario Multi-almacén**: Gestión de stock en múltiples almacenes con alertas de vencimiento
- **Sesiones Seguras**: Autenticación con Passport.js y cookies seguras
- **HTTPS**: Servidor configurado con SSL/TLS

## 💻 Requisitos del Sistema

### Software Requerido

- **Node.js**: v16.0.0 o superior
- **npm**: v7.0.0 o superior
- **MySQL**: v8.0 o superior
- **Git**: (opcional) para clonar el repositorio

### Hardware Mínimo

- **RAM**: 2 GB (4 GB recomendado)
- **Espacio en Disco**: 500 MB
- **Procesador**: Cualquier procesador moderno

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd REST_CAFE_BAR
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias incluyendo:
- Express.js
- Passport.js
- MySQL2
- EJS
- Bootstrap 5
- SweetAlert2
- Y otras dependencias de desarrollo

### 3. Configurar Certificados SSL (Opcional para Desarrollo)

El proyecto viene configurado para usar HTTPS. Para desarrollo local, puedes usar `mkcert`:

```bash
# Instalar mkcert (Windows)
choco install mkcert

# Crear autoridad de certificación local
mkcert -install

# Generar certificados en el directorio certs/
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1
```

Si prefieres usar HTTP en desarrollo, modifica `app.js` para usar `app.listen()` en lugar de `https.createServer()`.

## 🗄️ Configuración de Base de Datos

### 1. Crear Base de Datos MySQL

```sql
CREATE DATABASE restaurante_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Crear Usuario de Base de Datos (Recomendado)

```sql
CREATE USER 'restaurante_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON restaurante_db.* TO 'restaurante_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Ejecutar Script de Migración

Crea un archivo `migrations/01_initial_schema.sql` con las tablas necesarias:

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('superadministrador', 'administrador', 'dependiente') NOT NULL,
    foto VARCHAR(255),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mesas
CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    capacidad INT NOT NULL,
    ubicacion VARCHAR(50),
    estado ENUM('disponible', 'ocupada', 'reservada') DEFAULT 'disponible'
);

-- Tabla de menú/platillos
CREATE TABLE menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    precio_alt DECIMAL(10,2),
    categoria VARCHAR(50),
    foto VARCHAR(255),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo'
);

-- Tabla de almacenes
CREATE TABLE almacenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100),
    responsable_id INT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
);

-- Tabla de productos/inventario
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    unidad_medida VARCHAR(20)
);

-- Tabla de stock
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    almacen_id INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    fecha_vencimiento DATE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
);

-- Tabla de pedidos
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT,
    usuario_id INT NOT NULL,
    estado ENUM('abierto', 'en_proceso', 'cerrado') DEFAULT 'abierto',
    total DECIMAL(10,2) DEFAULT 0,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de detalles de pedido
CREATE TABLE pedido_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    platillo_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    estado ENUM('pendiente', 'preparando', 'listo', 'entregado') DEFAULT 'pendiente',
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (platillo_id) REFERENCES menu(id)
);

-- Tabla de tokens de "recordarme"
CREATE TABLE usuarios_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    usuario_id INT NOT NULL,
    expira_en DATETIME NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

Ejecuta el script:

```bash
mysql -u restaurante_user -p restaurante_db < migrations/01_initial_schema.sql
```

### 4. Insertar Usuario Administrador Inicial

```sql
INSERT INTO usuarios (nombre, apellidos, usuario, password, rol)
VALUES ('Admin', 'Principal', 'admin', '$2a$10$hashed_password_here', 'superadministrador');
```

**Nota**: Debes generar el hash de la contraseña usando bcrypt. Puedes hacerlo con Node.js:

```javascript
const bcrypt = require('bcryptjs');
const password = 'tu_contraseña';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Puerto del servidor
PORT=3000

# Configuración de Base de Datos
DB_HOST=localhost
DB_USER=restaurante_user
DB_PASS=tu_contraseña_segura
DB_NAME=restaurante_db

# Secretos de sesión y cookies
SESSION_SECRET=tu_secreto_de_sesion_muy_largo_y_seguro
COOKIE_SECRET=tu_secreto_de_cookies_muy_largo_y_seguro

# Ambiente
NODE_ENV=development

# IP del servidor (opcional)
SERVER_IP=
```

**⚠️ IMPORTANTE**: Nunca commits el archivo `.env` al control de versiones. Ya está incluido en `.gitignore`.

## ▶️ Ejecución del Proyecto

### Modo Desarrollo

```bash
npm run dev
```

O si no tienes el script configurado:

```bash
nodemon app.js
```

### Modo Producción

```bash
node app.js
```

### Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Modo watch (para desarrollo)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

### Acceder a la Aplicación

Una vez iniciado el servidor:

- **HTTPS**: https://localhost:3000
- **Login**: https://localhost:3000/login

Credenciales iniciales (según tu configuración):
- Usuario: `admin`
- Contraseña: `la que configuraste en el hash`

## 📁 Estructura del Proyecto

```
REST_CAFE_BAR/
├── app.js                      # Punto de entrada principal
├── package.json                # Dependencias y scripts
├── jest.config.js             # Configuración de Jest
├── .env                       # Variables de entorno (no commit)
├── .gitignore                # Archivos ignorados por Git
├── config/
│   ├── db.js                 # Configuración de base de datos
│   ├── passport.js           # Estrategia de autenticación
│   └── multer.js             # Configuración de subida de archivos
├── controllers/              # Lógica de controladores
│   ├── userController.js
│   ├── menuController.js
│   ├── posController.js
│   ├── pedidoController.js
│   └── ...
├── models/                   # Modelos de datos
│   ├── userModel.js
│   ├── menuModel.js
│   ├── orderModel.js
│   └── ...
├── services/                 # Lógica de negocio
│   ├── userService.js
│   ├── menuService.js
│   ├── orderService.js
│   └── ...
├── routes/                   # Definición de rutas
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   ├── posRoutes.js
│   └── ...
├── middlewares/              # Middleware personalizado
│   └── auth.js              # Autenticación y autorización
├── views/                    # Templates EJS
│   ├── admin/
│   ├── auth/
│   ├── includes/
│   └── ...
├── public/                   # Archivos estáticos
│   ├── uploads/             # Imágenes subidas
│   ├── css/
│   ├── js/
│   └── ...
├── certs/                    # Certificados SSL
│   ├── key.pem
│   └── cert.pem
└── tests/                   # Archivos de prueba
```

## 👥 Roles de Usuario

### Superadministrador
- Acceso completo a todas las funcionalidades
- Gestión de usuarios y roles
- Configuración del sistema

### Administrador
- Gestión de menú y platillos
- Gestión de mesas
- Gestión de inventario
- Reportes y estadísticas

### Dependiente
- Acceso al sistema POS
- Gestión de mesas asignadas
- Toma de pedidos
- Cierre de cuentas

## 🧪 Testing

El proyecto utiliza Jest como framework de testing.

### Tests Disponibles

- **Unit Tests**: Services y Models
- **Integration Tests**: Controllers
- **Coverage Report**: Disponible con `npm run test:coverage`

### Ejecutar Tests Específicos

```bash
# Tests de un archivo específico
npm test userService.test.js

# Tests con patrón
npm test -- --testNamePattern="UserService"
```

## 🏗️ Arquitectura

El proyecto sigue una arquitectura MVC con una capa adicional de servicios:

```
Request → Routes → Controllers → Services → Models → Database
                ↓
              Views
```

### Capas

1. **Routes**: Definen los endpoints HTTP
2. **Controllers**: Manejan las solicitudes y respuestas HTTP
3. **Services**: Contienen la lógica de negocio
4. **Models**: Manejan el acceso a datos
5. **Views**: Templates EJS para renderizar HTML

Para más detalles, consulta el archivo [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md).

## 🔧 Troubleshooting

### Error de Conexión a Base de Datos
- Verifica que MySQL esté corriendo
- Confirma las credenciales en `.env`
- Asegúrate de que la base de datos exista

### Error de Certificados SSL
- Genera certificados con mkcert
- O modifica `app.js` para usar HTTP en desarrollo

### Puerto Ya en Uso
- Cambia el puerto en `.env`
- O mata el proceso que está usando el puerto 3000

## 📝 Licencia

ISC

## 👨‍💻 Autor

[Nombre del Autor]

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request
