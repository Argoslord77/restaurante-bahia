# CajaFácil — Punto de venta para pequeños negocios

App **independiente** del restaurante (carpeta `tienda/`): ventas con punto de venta (POS),
inventario que se descuenta solo al vender, corte de caja, reportes básicos y usuarios propios.

## Requisitos

- Node.js 18+
- MySQL 8 (o MariaDB 10.6+)

## Instalación (5 minutos)

```bash
cd tienda
npm install
cp .env.example .env        # y edite usuario/clave de MySQL si hace falta
mysql -u root -p < scripts/instalar.sql
npm run crear-admin -- admin "MiClave123"
npm run demo                # opcional: categorías, productos y fondo de ejemplo
npm start                   # abre http://localhost:3001
```

> El puerto por defecto es **3001** para no chocar con el restaurante (3000).
> Cámbielo con `PUERTO=` en el `.env`.

## Uso diario

1. Entrar con su usuario → **Caja → Abrir caja** (fondo inicial).
2. **Vender (POS)**: buscar producto, agregar al carrito, descuento opcional,
   registrar pagos (efectivo/tarjeta/transferencia/otro), **Cobrar** → ticket imprimible.
3. Al final del día: **Caja → Cerrar turno** contando el efectivo (arqueo).

## Roles

| Rol | Puede |
|---|---|
| administrador | Todo: productos, movimientos, ajustes, usuarios, reportes, caja, ventas |
| cajero | Vender, cancelar ventas del turno, abrir/cerrar caja, reportes |
| vendedor | Vender y consultar |

## Reglas del negocio

- No se puede vender sin turno de caja abierto.
- El stock se descuenta al cobrar (con bloqueo de fila, sin ventas duplicadas).
- Descuento antes de IVA; el IVA % se configura en **Ajustes**.
- Cancelar una venta solo dentro del turno abierto y devuelve el stock.
- El pago total debe cubrir el total (con cambio solo si hay efectivo de sobra).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor en producción |
| `npm run dev` | Servidor con recarga (requiere `nodemon` global) |
| `npm test` | Pruebas (39, sin base de datos) |
| `npm run licencia` | Diagnóstico de la licencia |
| `npm run licencia:solicitar` | Genera la solicitud de licencia del equipo |
| `npm run crear-admin -- usuario clave` | Crea/actualiza un administrador |
| `npm run demo` | Datos de ejemplo |

## Estructura

```
tienda/
├── app.js               # aplicación Express (puerto 3001)
├── config/db.js         # pool MySQL (perezoso: arranca aun sin BD)
├── controllers/         # auth, dashboard, producto, pos, inventario, venta, caja, reporte, ajuste, usuario
├── middlewares/auth.js  # sesión propia (tiendaUser) + roles
├── routes/index.js      # rutas con rol por ruta
├── services/            # lógica + transacciones (+ .test.js con jest)
├── scripts/             # instalar.sql, crear_admin.js, seed_demo.js
├── views/               # EJS (sin dependencias externas)
└── public/              # css, js e img (logo CajaFácil + favicon) propios (funciona offline)
```
