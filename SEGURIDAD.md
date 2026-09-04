# SEGURIDAD — limpieza de secretos publicados

**Rama:** `chore/retirar-secretos-publicados`

## El problema

El repositorio `Argoslord77/restaurante-bahia` es **público** y tenía versionados:

| Archivo | Qué expone |
|---|---|
| `.env` | `DB_PASS`, `SESSION_SECRET`, `COOKIE_SECRET`, IP interna del servidor |
| `certs/key.pem` | **Clave privada TLS**: quien la tenga puede suplantar el servidor y descifrar el tráfico capturado |
| `certs/cert.pem` | Certificado de la instalación |
| `respaldo_2026*.sql` (4 archivos, ~1,9 MB) | Volcados completos de la base de datos: usuarios, hashes de contraseñas, mesas, pedidos, inventario y contabilidad del negocio |

`.gitignore` ya listaba `.env`, pero el archivo estaba **trackeado desde antes** de
añadir la regla: `.gitignore` no afecta a lo que ya está en el índice. Por eso se
seguía publicando en cada push.

## Qué hace esta rama

1. `git rm --cached` de los ocho archivos: **salen del control de versiones sin
   borrarse del disco** de la instalación en producción.
2. `.gitignore` ampliado: `.env*` (salvo `.env.example`), `certs/`, `*.pem`,
   `licencia/*.dat|*.pub|*.key`, `respaldo_*.sql|*.txt`, `backups/`, `logs/`.
3. `scripts/generar-env.js`: crea un `.env` nuevo con secretos aleatorios reales
   (`npm run env:nuevo`). Así ninguna instalación necesita volver a copiar
   secretos ajenos.

`licencia/estado.dat` (el trinquete anti-manipulación de hora) ya estaba protegido
por `licencia/.gitignore`, así que no hace falta tocarlo. Tampoco se toca
`node_modules`, versionado a propósito para desplegar sin internet en el local.

## Qué debes hacer TÚ (esto no lo arregla ningún commit)

Borrar los archivos de la punta de la rama **no los borra del historial**: siguen
en los 12 commits anteriores y en los forks/clones que ya existan.

1. **Rotar ya** (en este orden):
   - `SESSION_SECRET` y `COOKIE_SECRET`: invalidan las sesiones abiertas.
   - `DB_PASS` de `restaurante_user` en MySQL.
   - Regenerar `certs/` con mkcert y reiniciar el servicio.
2. **Poner el repositorio en privado** mientras se limpia:
   Settings → General → Danger Zone → *Change repository visibility*.
3. **Reescribir el historial** para eliminar los blobs:
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths \
     --path .env --path certs/ \
     --path-glob 'respaldo_*.sql' --path-glob 'respaldo_*.txt'
   git remote add origin https://github.com/Argoslord77/restaurante-bahia.git
   git push --force --all
   ```
   Alternativa: [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/).
   ⚠️ Reescribir el historial invalida los clones existentes: cada instalación
   deberá volver a clonar.
4. **Tokens de acceso**: cualquier token usado en un chat, correo o CI debe
   revocarse en GitHub → Settings → Developer settings → Personal access tokens.
   Un token con permisos de repo da control total sobre todos tus repositorios.

## Verificación

```bash
npm run env:nuevo -- --imprimir   # genera por pantalla, sin escribir nada
git ls-files | grep -E '^\.env$|^certs/|respaldo_'   # no debe imprimir nada
npm test                          # la aplicación no depende de esos archivos
```
