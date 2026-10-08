# Centro de Productos y Precios (Argos-Core)

¿Quién tiene qué producto y a qué precio? Los negocios publican su catálogo
en el web service; cualquier cliente consulta en línea o desde su copia local.

## Piezas

- `server.js` — web service ligero (Express, cero base de datos).
  Guarda todo en `datos.json` (se crea solo al arrancar).
- `www/` — app móvil (misma estructura que CajaFácil: almacén JSON local,
  login con PIN, usuarios, licencia, temas Ónix/Blanco).
- `tests/` — pruebas del servicio y del móvil.

## Arrancar el servicio

```sh
node centro/server.js 3101
# → http://localhost:3101/salud
```

## API (v1, JSON)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/salud` | no | estado + versión |
| POST | `/api/v1/negocios` | no | registra negocio, devuelve `api_key` (una vez) |
| GET | `/api/v1/negocios` | no | directorio público |
| PUT | `/api/v1/negocios/:id/productos` | `X-API-Key` del negocio | publica catálogo (reemplaza) |
| GET | `/api/v1/productos?q=&negocio=&limite=` | no | buscar en todos los negocios |
| GET | `/api/v1/precios/:codigo` | no | comparar (ordenado por precio) |
| GET | `/api/v1/snapshot` | no | volcado completo para la copia local |

## Flujo en el móvil

1. Ajustes → escriba la dirección del servidor → Probar conexión.
2. Publicar (admin) → registre su negocio → arme su catálogo → Publicar.
3. Buscar / Comparar funcionan en línea; sin red usan la copia local
   (Ajustes → Descargar copia).

## Pruebas

```sh
npx jest centro/tests
```
