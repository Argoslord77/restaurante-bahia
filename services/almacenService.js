const AlmacenModel = require('../models/almacenModel');

class AlmacenService {
    async listarAlmacenes(filtros) {
        return await AlmacenModel.getAll(filtros);
    }

    async obtenerPorId(id) {
        if (!id) throw new Error('El ID del almacén es requerido.');
        const almacen = await AlmacenModel.getById(id);
        if (!almacen) throw new Error('Almacén no encontrado.');
        return almacen;
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
     * Mapea valores booleanos/switches del Frontend a 1 o 0 para la base de datos
     */
    _sanitizarDatos(data) {
        return {
            codigo: data.codigo ? data.codigo.trim().toUpperCase() : undefined,
            nombre: data.nombre ? data.nombre.trim() : undefined,
            descripcion: data.descripcion,
            tipo: data.tipo,
            ubicacion: data.ubicacion,
            responsable_usuario_id: data.responsable_usuario_id ? parseInt(data.responsable_usuario_id) : null,
            permite_ventas: data.permite_ventas ? 1 : 0,
            permite_consumo: data.permite_consumo ? 1 : 0,
            activo: data.activo !== undefined ? parseInt(data.activo) : 1
        };
    }
}

module.exports = new AlmacenService();