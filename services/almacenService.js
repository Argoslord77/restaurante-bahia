const AlmacenModel = require('../models/almacenModel');

class AlmacenService {
    async listarTodos() {
        return await AlmacenModel.getAll();
    }

    async obtenerPorId(id) {
        if (!id) throw new Error('El ID del almacén es obligatorio.');
        const almacen = await AlmacenModel.getById(id);
        if (!almacen) throw new Error('Almacén no encontrado.');
        return almacen;
    }

    async crearAlmacen(data) {
        // CORRECCIÓN: Ahora el modelo tiene getByCodigo
        const existe = await AlmacenModel.getByCodigo(data.codigo);
        if (existe) throw new Error(`El código '${data.codigo}' ya existe.`);

        return await AlmacenModel.create(this._sanitizarDatos(data));
    }

    async actualizarAlmacen(id, data) {
        await this.obtenerPorId(id); // Validar existencia
        return await AlmacenModel.update(id, this._sanitizarDatos(data));
    }

    async desactivarAlmacen(id) {
        await this.obtenerPorId(id);
        return await AlmacenModel.updateStatus(id, 0);
    }

    // Método privado para normalizar booleanos/bits
    _sanitizarDatos(data) {
        return {
            ...data,
            permite_ventas: data.permite_ventas ? 1 : 0,
            permite_consumo: data.permite_consumo ? 1 : 0,
            activo: data.activo !== undefined ? (data.activo ? 1 : 0) : 1
        };
    }
}

module.exports = new AlmacenService();