const AlmacenModel = require('../models/almacenModel');

// Categorías operativas de almacén reconocidas por el sistema
const CATEGORIAS_VALIDAS = ['logistico', 'produccion'];

// Inferencia por defecto cuando el usuario no elige categoría explícitamente
const TIPOS_PRODUCCION = ['cocina', 'bar', 'produccion'];

class AlmacenService {
    get CATEGORIAS_VALIDAS() {
        return CATEGORIAS_VALIDAS;
    }

    async listarAlmacenes(filtros) {
        return await AlmacenModel.getAll(filtros);
    }

    async obtenerPorId(id) {
        if (!id) throw new Error('El ID del almacén es requerido.');
        const almacen = await AlmacenModel.getById(id);
        if (!almacen) throw new Error('Almacén no encontrado.');
        return almacen;
    }

    /** Almacenes activos de una categoría operativa ('logistico' | 'produccion'). */
    async listarPorCategoria(categoria) {
        return await AlmacenModel.getByCategoria(categoria);
    }

    /** Devuelve {logisticos, produccion} en una sola pasada concurrente. */
    async listarPorCategoriasOperativas() {
        const [logisticos, produccion] = await Promise.all([
            AlmacenModel.getByCategoria('logistico'),
            AlmacenModel.getByCategoria('produccion')
        ]);
        return { logisticos: logisticos || [], produccion: produccion || [] };
    }

    /** true si el almacén indicado es de categoría 'produccion' y está activo. */
    async esDeProduccion(almacenId) {
        if (!almacenId) return false;
        const almacen = await AlmacenModel.getById(almacenId);
        if (!almacen) return false;
        if (Number(almacen.activo) !== 1) return false;
        return (almacen.categoria_efectiva || almacen.categoria) === 'produccion';
    }

    /**
     * Resuelve el almacén de PRODUCCIÓN desde el que se debe descontar el
     * inventario al vender un platillo.
     *
     * Regla de negocio: el descuento por venta JAMÁS ocurre en un almacén
     * logístico. El logístico solo abastece por transferencia.
     *
     * Orden de resolución:
     *   1. `almacenIdSugerido` (si es efectivamente de producción).
     *   2. Almacén ligado a la categoría de menú del platillo
     *      (categorias_platillos.almacen_id).
     *   3. Primer almacén de producción activo (fallback).
     *
     * @throws Error si el almacén sugerido es logístico o si no hay ninguno de producción.
     */
    async resolverAlmacenProduccion(platilloId, almacenIdSugerido = null) {
        if (almacenIdSugerido) {
            const almacen = await AlmacenModel.getById(almacenIdSugerido);
            if (!almacen) {
                throw new Error(`El almacén ${almacenIdSugerido} no existe.`);
            }
            const categoria = almacen.categoria_efectiva || almacen.categoria;
            if (categoria !== 'produccion') {
                throw new Error(
                    `El almacén "${almacen.nombre}" es de categoría "${categoria}". ` +
                    `El descuento de insumos por venta solo puede realizarse en almacenes de producción.`
                );
            }
            if (Number(almacen.activo) !== 1) {
                throw new Error(`El almacén de producción "${almacen.nombre}" está inactivo.`);
            }
            return almacen;
        }

        const porCategoriaMenu = await AlmacenModel.getAlmacenProduccionPorPlatillo(platilloId);
        if (porCategoriaMenu) return porCategoriaMenu;

        const fallback = await AlmacenModel.getPrimerAlmacenProduccion();
        if (!fallback) {
            throw new Error(
                'No hay ningún almacén de producción activo configurado. ' +
                'Asigna la categoría "Producción" al menos a un almacén antes de vender.'
            );
        }
        return fallback;
    }

    async crearAlmacen(data) {
        if (!data.codigo || !data.nombre || !data.tipo) {
            throw new Error('Los campos código, nombre y tipo son obligatorios.');
        }

        const existe = await AlmacenModel.getByCodigo(data.codigo);
        if (existe) throw new Error(`El código de almacén '${data.codigo}' ya se encuentra registrado.`);

        const datosSanitizados = this._sanitizarDatos(data);
        const nuevoId = await AlmacenModel.create(datosSanitizados);

        return { id: nuevoId, ...datosSanitizados };
    }

    async actualizarAlmacen(id, data) {
        await this.obtenerPorId(id); // Valida si existe, si no, lanza error

        // Validar que si cambia el código, no choque con otro existente
        if (data.codigo) {
            const existe = await AlmacenModel.getByCodigo(data.codigo);
            if (existe && existe.id != id) {
                throw new Error(`El código '${data.codigo}' ya está asignado a otro almacén.`);
            }
        }

        const datosSanitizados = this._sanitizarDatos(data);
        await AlmacenModel.update(id, datosSanitizados);
        return { id, ...datosSanitizados };
    }

    async cambiarEstadoAlmacen(id, activo) {
        await this.obtenerPorId(id);
        const estadoBit = activo ? 1 : 0;
        return await AlmacenModel.updateStatus(id, estadoBit);
    }

    /**
     * Normaliza la categoría operativa. Si no viene informada se infiere del
     * tipo; cualquier valor no reconocido cae en 'logistico' (opción segura:
     * un almacén logístico nunca es descontado automáticamente por el POS).
     */
    _normalizarCategoria(categoria, tipo) {
        const limpia = (categoria || '').toString().trim().toLowerCase();
        if (CATEGORIAS_VALIDAS.includes(limpia)) return limpia;
        const tipoLimpio = (tipo || '').toString().trim().toLowerCase();
        return TIPOS_PRODUCCION.includes(tipoLimpio) ? 'produccion' : 'logistico';
    }

    /**
     * Mapea valores booleanos/switches del Frontend a 1 o 0 para la base de datos
     */
    _sanitizarDatos(data) {
        return {
            codigo: data.codigo ? data.codigo.trim().toUpperCase() : undefined,
            nombre: data.nombre ? data.nombre.trim() : undefined,
            descripcion: data.descripcion,
            tipo: data.tipo,
            categoria: this._normalizarCategoria(data.categoria, data.tipo),
            ubicacion: data.ubicacion,
            responsable_usuario_id: data.responsable_usuario_id ? parseInt(data.responsable_usuario_id) : null,
            permite_ventas: data.permite_ventas ? 1 : 0,
            permite_consumo: data.permite_consumo ? 1 : 0,
            activo: data.activo !== undefined ? parseInt(data.activo) : 1
        };
    }
}

module.exports = new AlmacenService();
