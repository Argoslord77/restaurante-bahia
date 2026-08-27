// services/unidadMedidaService.js
// Gestión de Unidades de Medida + Factores de Conversión (globales y por producto).
// Usado por el POS (descuento por receta), transferencias y la configuración.
'use strict';

const db = require('../config/db');

// Unidad base por magnitud para conversión en dos pasos (origen→base→destino)
const BASE_POR_TIPO = { PESO: 'KG', VOLUMEN: 'L', UNIDAD: 'UND', LONGITUD: null, EMPAQUE: null };

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

class UnidadMedidaService {

    // ------------------------------------------------------------------ cache
    static async _recargar() {
        const [unidades] = await db.query('SELECT * FROM unidades_medida ORDER BY tipo, nombre');
        const [conversiones] = await db.query('SELECT * FROM conversiones_unidades WHERE activa = 1');
        this._cacheUnidades = unidades;
        this._cacheConversiones = conversiones;
        this._cacheCargado = true;
    }

    static async _cache() {
        if (!this._cacheCargado) await this._recargar();
        return { unidades: this._cacheUnidades || [], conversiones: this._cacheConversiones || [] };
    }

    static invalidateCache() { this._cacheCargado = false; }

    static _buscarUnidad(ref) {
        // ref puede ser id numérico, código ('KG') o abreviatura ('kg')
        // (requiere que _cache() se haya llamado antes)
        const unidades = this._cacheUnidades || [];
        if (unidades.length === 0) return null;
        const num = Number(ref);
        if (!Number.isNaN(num) && `${ref}`.trim() !== '') {
            return unidades.find(u => Number(u.id) === num && Number(u.activa) === 1) || null;
        }
        const s = normalizarTexto(ref);
        return unidades.find(u => Number(u.activa) === 1 && [u.abreviatura, u.codigo, u.nombre]
            .some(valor => normalizarTexto(valor) === s)) || null;
    }

    // ----------------------------------------------------------- unidades CRUD
    static async listarUnidades(incluirInactivas = true) {
        const [rows] = await db.query(
            `SELECT * FROM unidades_medida ${incluirInactivas ? '' : 'WHERE activa = 1'} ORDER BY tipo, nombre`
        );
        return rows;
    }

    static async crearUnidad({ codigo, nombre, abreviatura, tipo, permite_decimales }) {
        if (!codigo || !nombre || !abreviatura || !tipo) throw new Error('Código, nombre, abreviatura y tipo son obligatorios.');
        const [r] = await db.query(
            `INSERT INTO unidades_medida (codigo, nombre, abreviatura, tipo, permite_decimales) VALUES (?, ?, ?, ?, ?)`,
            [codigo.trim().toUpperCase(), nombre.trim(), abreviatura.trim(), tipo, permite_decimales ? 1 : 0]
        );
        this.invalidateCache();
        return r.insertId;
    }

    static async actualizarUnidad(id, { codigo, nombre, abreviatura, tipo, permite_decimales, activa }) {
        const [r] = await db.query(
            `UPDATE unidades_medida SET codigo=?, nombre=?, abreviatura=?, tipo=?, permite_decimales=?, activa=? WHERE id=?`,
            [codigo.trim().toUpperCase(), nombre.trim(), abreviatura.trim(), tipo, permite_decimales ? 1 : 0, activa ? 1 : 0, id]
        );
        if (r.affectedRows === 0) throw new Error('Unidad no encontrada.');
        this.invalidateCache();
        return true;
    }

    static async cambiarEstadoUnidad(id, activa) {
        const [r] = await db.query('UPDATE unidades_medida SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
        if (r.affectedRows === 0) throw new Error('Unidad no encontrada.');
        this.invalidateCache();
        return true;
    }

    // Borrado físico solo si no tiene uso; si tiene uso, desactiva.
    static async eliminarUnidad(id) {
        const [uso] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM productos p WHERE p.unidad_compra_id=? OR p.unidad_inventario_id=? OR p.unidad_consumo_id=?) +
                (SELECT COUNT(*) FROM conversiones_unidades c WHERE c.unidad_origen_id=? OR c.unidad_destino_id=?) +
                (SELECT COUNT(*) FROM recetas r WHERE 0) AS en_uso`,
            [id, id, id, id, id]
        );
        if (Number(uso[0].en_uso) > 0) {
            await this.cambiarEstadoUnidad(id, false);
            return { soft: true, message: 'La unidad está en uso: se DESACTIVÓ (no se borró).' };
        }
        await db.query('DELETE FROM unidades_medida WHERE id = ?', [id]);
        this.invalidateCache();
        return { soft: false, message: 'Unidad eliminada.' };
    }

    /**
     * Precondición de negocio: un factor por producto sólo puede asociarse a
     * un producto que ya tenga una entrada de almacén con unidad registrada.
     */
    static async validarUnidadParaEntrada(productoId, unidadEntradaId) {
        const [productos] = await db.query(`
            SELECT id, nombre, unidad_inventario_id
            FROM productos
            WHERE id = ? AND activo = 1
            LIMIT 1
        `, [productoId]);
        if (!productos.length) throw new Error('El producto no existe o está inactivo.');

        await this._cache();
        const unidad = this._buscarUnidad(unidadEntradaId);
        if (!unidad) throw new Error('La unidad de la entrada no existe o está inactiva.');

        const factor = await this.obtenerFactor(
            unidad.id,
            productos[0].unidad_inventario_id,
            productoId
        );
        if (factor === null) {
            throw new Error(
                `No existe un factor de conversión activo entre ${unidad.abreviatura} ` +
                `y la unidad de inventario del producto. Defínalo antes de registrar la entrada.`
            );
        }

        return { producto: productos[0], unidad, factor_a_inventario: factor };
    }

    static async validarProductoConEntrada(productoId) {
        const [productos] = await db.query(`
            SELECT id, codigo, nombre, unidad_compra_id, unidad_inventario_id
            FROM productos
            WHERE id = ? AND activo = 1
            LIMIT 1
        `, [productoId]);
        if (!productos.length) throw new Error('El producto no existe o está inactivo.');

        const [entradas] = await db.query(`
            SELECT id, unidad_medida_id, almacen_id, cantidad_actual
            FROM lotes
            WHERE producto_id = ?
              AND unidad_medida_id IS NOT NULL
            ORDER BY id ASC
            LIMIT 1
        `, [productoId]);
        if (!entradas.length) {
            throw new Error('El producto debe tener al menos una entrada de almacén con unidad de medida registrada antes de definir una conversión.');
        }
        return { producto: productos[0], entrada: entradas[0] };
    }

    static async validarProductoParaConversion(productoId, origenRef, destinoRef) {
        const info = await this.validarProductoConEntrada(productoId);
        const factor = await this.obtenerFactor(origenRef, destinoRef, productoId);
        if (factor === null) {
            throw new Error(`El producto "${info.producto.nombre}" no tiene un factor de conversión activo para ${origenRef} → ${destinoRef}.`);
        }
        return { ...info, factor };
    }

    static async listarProductosConEntrada() {
        const [rows] = await db.query(`
            SELECT DISTINCT p.id, p.codigo, p.nombre,
                   p.unidad_inventario_id,
                   ui.nombre AS unidad_inventario_nombre,
                   ui.abreviatura AS unidad_inventario_abreviatura
            FROM productos p
            INNER JOIN lotes l
                ON l.producto_id = p.id AND l.unidad_medida_id IS NOT NULL
            LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
            WHERE p.activo = 1
            ORDER BY p.nombre ASC
        `);
        return rows;
    }

    // ------------------------------------------------------ conversiones CRUD
    static async listarConversiones() {
        const [rows] = await db.query(`
            SELECT c.*, p.nombre AS producto_nombre,
                   o.codigo AS origen_codigo, o.abreviatura AS origen_abrev, o.tipo AS origen_tipo,
                   d.codigo AS destino_codigo, d.abreviatura AS destino_abrev, d.tipo AS destino_tipo
            FROM conversiones_unidades c
            LEFT JOIN productos p ON c.producto_id = p.id
            INNER JOIN unidades_medida o ON c.unidad_origen_id = o.id
            INNER JOIN unidades_medida d ON c.unidad_destino_id = d.id
            ORDER BY c.producto_id IS NOT NULL, o.tipo, o.nombre
        `);
        return rows;
    }

    static async _validarConversion({ producto_id, unidad_origen_id, unidad_destino_id, factor }) {
        if (!unidad_origen_id || !unidad_destino_id) throw new Error('Las unidades de origen y destino son obligatorias.');
        if (Number(unidad_origen_id) === Number(unidad_destino_id)) throw new Error('Origen y destino no pueden ser la misma unidad.');
        const f = parseFloat(factor);
        if (Number.isNaN(f) || f <= 0) throw new Error('El factor debe ser un número mayor que 0.');

        await this._cache();
        if (!this._buscarUnidad(unidad_origen_id) || !this._buscarUnidad(unidad_destino_id)) {
            throw new Error('Las unidades seleccionadas deben existir y estar activas.');
        }

        if (producto_id) {
            await this.validarProductoConEntrada(Number(producto_id));
        }
        return f;
    }

    static async crearConversion(datos) {
        const factor = await this._validarConversion(datos);
        const productoId = datos.producto_id ? Number(datos.producto_id) : null;

        const [dup] = await db.query(
            `SELECT id FROM conversiones_unidades
             WHERE (producto_id IS NULL AND ? IS NULL OR producto_id = ?)
               AND unidad_origen_id = ? AND unidad_destino_id = ?`,
            [productoId, productoId, datos.unidad_origen_id, datos.unidad_destino_id]
        );
        if (dup.length > 0) throw new Error('Ya existe una conversión para ese par de unidades (edita la existente).');

        const [r] = await db.query(
            `INSERT INTO conversiones_unidades (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
             VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [productoId, datos.unidad_origen_id, datos.unidad_destino_id, factor, datos.es_conversion_base ? 1 : 0, datos.observaciones || null]
        );
        this.invalidateCache();
        return r.insertId;
    }

    static async actualizarConversion(id, datos) {
        const factor = await this._validarConversion(datos);
        const productoId = datos.producto_id ? Number(datos.producto_id) : null;
        const [r] = await db.query(
            `UPDATE conversiones_unidades
             SET producto_id=?, unidad_origen_id=?, unidad_destino_id=?, factor=?, es_conversion_base=?, activa=?, observaciones=?
             WHERE id=?`,
            [productoId, datos.unidad_origen_id, datos.unidad_destino_id, factor,
             datos.es_conversion_base ? 1 : 0, datos.activa ? 1 : 0, datos.observaciones || null, id]
        );
        if (r.affectedRows === 0) throw new Error('Conversión no encontrada.');
        this.invalidateCache();
        return true;
    }

    static async eliminarConversion(id) {
        const [r] = await db.query('DELETE FROM conversiones_unidades WHERE id = ?', [id]);
        if (r.affectedRows === 0) throw new Error('Conversión no encontrada.');
        this.invalidateCache();
        return true;
    }

    // --------------------------------------------------------- conversión ---
    /**
     * Factor de conversión entre dos unidades para un producto (opcional).
     * Orden de resolución:
     *   1) Misma unidad → 1
     *   2) Conversión por-producto directa o inversa
     *   3) Conversión global directa o inversa
     *   4) Dos pasos vía la unidad base del TIPO (kg / l / und)
     * Devuelve número o null si no hay forma de convertir.
     */
    static async obtenerFactor(origenRef, destinoRef, productoId = null) {
        await this._cache();
        const origen = this._buscarUnidad(origenRef);
        const destino = this._buscarUnidad(destinoRef);
        if (!origen || !destino) return null;
        if (origen.id === destino.id) return 1;

        const convs = this._cacheConversiones;
        const pid = productoId ? Number(productoId) : null;

        const buscar = (lista, o, d) => lista.find(c => Number(c.unidad_origen_id) === Number(o.id) && Number(c.unidad_destino_id) === Number(d.id));

        // 2) por producto
        if (pid) {
            const porProducto = convs.filter(c => c.producto_id !== null && Number(c.producto_id) === pid);
            const directa = buscar(porProducto, origen, destino);
            if (directa) return parseFloat(directa.factor);
            const inversa = buscar(porProducto, destino, origen);
            if (inversa) return 1 / parseFloat(inversa.factor);
        }
        // 3) global
        const globales = convs.filter(c => c.producto_id === null || typeof c.producto_id === 'undefined');
        const directaG = buscar(globales, origen, destino);
        if (directaG) return parseFloat(directaG.factor);
        const inversaG = buscar(globales, destino, origen);
        if (inversaG) return 1 / parseFloat(inversaG.factor);

        // 4) vía base del tipo (kg / l / und)
        if (origen.tipo === destino.tipo) {
            const baseCodigo = BASE_POR_TIPO[origen.tipo];
            if (baseCodigo) {
                const base = this._buscarUnidad(baseCodigo);
                if (base && base.id !== origen.id && base.id !== destino.id) {
                    const fo = buscar(globales, origen, base) || (buscar(globales, base, origen) ? { factor: 1 / parseFloat(buscar(globales, base, origen).factor) } : null);
                    const fd = buscar(globales, destino, base) || (buscar(globales, base, destino) ? { factor: 1 / parseFloat(buscar(globales, base, destino).factor) } : null);
                    if (fo && fd) return parseFloat(fo.factor) * (1 / parseFloat(fd.factor));
                }
            }
        }
        return null;
    }

    /**
     * Convierte una cantidad entre unidades (acepta id, código o abreviatura).
     * Devuelve { ok, factor, valor } o { ok:false, error }.
     */
    static async convertir(cantidad, origenRef, destinoRef, productoId = null) {
        const valor = parseFloat(cantidad);
        if (Number.isNaN(valor) || valor < 0) {
            return { ok: false, error: 'La cantidad a convertir no es válida.' };
        }
        const f = await this.obtenerFactor(origenRef, destinoRef, productoId);
        if (f === null) {
            const o = String(origenRef), d = String(destinoRef);
            return { ok: false, error: `Sin factor de conversión ${o} → ${d}` };
        }
        return { ok: true, factor: f, valor: valor * f };
    }
}

module.exports = UnidadMedidaService;
