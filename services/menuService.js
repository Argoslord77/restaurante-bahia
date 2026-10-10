const MenuModel = require('../models/menuModel');
const pdfTabla = require('./pdfTabla');

const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');
const csvTexto = (v) => String(v == null ? '' : v).replace(/[;\r\n]+/g, ' ');
// Estado visible en carta: acepta 1/0, '1'/'0', true/false y 'activo'/'inactivo'.
function normalizarActivo(v) {
    if (v === 0 || v === false || v === '0' || v === 'inactivo' || v === 'oculto') return 0;
    return 1;
}

class MenuService {

    async getAllItems() {
        return await MenuModel.getAll();
    }

    async getItemById(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.getById(id);
    }

    async createItem(data) {

        if (!data.nombre) {
            throw new Error('Nombre requerido');
        }

        return await MenuModel.create({ ...data, activo: normalizarActivo(data.activo) });
    }

    async updateItem(id, data) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.update(id, { ...data, activo: normalizarActivo(data.activo) });
    }

    async deleteItem(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.delete(id);
    }

    async getActiveItems() {

        const items = await MenuModel.getAll();

        return items.filter(
            item => Number(item.activo) === 1
        );
    }

    async updatePrice(id, precio) {

        if (precio < 0) {
            throw new Error('Precio inválido');
        }

        return await MenuModel.update(id, {
            precio
        });
    }

    async getActiveCategories() {
        return await MenuModel.getActiveCategories();
    }

    /** CSV del catálogo de platillos (imprimir / guardar / compartir). */
    catalogoACSV(platillos) {
        const filas = [];
        filas.push('Carta de platillos');
        filas.push('');
        filas.push('Nombre;Descripcion;Categoria;Precio CUP;Precio Alt;Precio USD;Estado');
        for (const p of platillos || []) {
            filas.push([
                csvTexto(p.nombre),
                csvTexto(p.descripcion),
                csvTexto(p.nombre_categoria || p.categoria),
                csvNum(p.precio),
                p.precio_alt == null ? '' : csvNum(p.precio_alt),
                p.precio_usd == null ? '' : csvNum(p.precio_usd),
                (Number(p.activo) === 1 || p.activo == null) ? 'En carta' : 'Oculto'
            ].join(';'));
        }
        return '\uFEFF' + filas.join('\r\n') + '\r\n';
    }

    /** PDF del catálogo de platillos (se genera y descarga al vuelo). */
    async catalogoAPDF(platillos, meta = {}) {
        const filas = (platillos || []).map(p => [
            p.nombre,
            p.descripcion,
            p.nombre_categoria || p.categoria,
            csvNum(p.precio),
            p.precio_alt == null ? '' : csvNum(p.precio_alt),
            p.precio_usd == null ? '' : csvNum(p.precio_usd),
            (Number(p.activo) === 1 || p.activo == null) ? 'En carta' : 'Oculto'
        ]);
        return pdfTabla.tablaPDF({
            titulo: 'Carta de platillos',
            subtitulo: `${meta.negocio || 'Restaurante Bahía'} · ${pdfTabla.fmtFecha()} · Generado por ${meta.generadoPor || 'Sistema'} · ${filas.length} platillo(s)`,
            columnas: [
                { titulo: 'Nombre', frac: 0.26 },
                { titulo: 'Descripción', frac: 0.30 },
                { titulo: 'Categoría', frac: 0.12 },
                { titulo: 'Precio CUP', frac: 0.09, alinear: 'right' },
                { titulo: 'Precio Alt.', frac: 0.08, alinear: 'right' },
                { titulo: 'Precio USD', frac: 0.08, alinear: 'right' },
                { titulo: 'Estado', frac: 0.07, alinear: 'center' }
            ],
            filas,
            pie: `${meta.negocio || 'Restaurante Bahía'} — Carta de platillos`
        });
    }

}

module.exports = new MenuService();