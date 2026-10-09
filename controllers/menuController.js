// controllers/menuController.js
const menuService = require('../services/menuService');
const platilloDiaModel = require('../models/platilloDiaModel');
const turnoService = require('../services/turnoService');
const PrecioControlService = require('../services/precioControlService');
const fs = require('fs');
const path = require('path');

// Descarga CSV (mismo formato que los reportes: ; + BOM para Excel).
function responderCSV(res, nombre, csv, filas) {
    const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}_${marca}.csv"`);
    if (filas != null) res.setHeader('X-Reporte-Filas', String(filas));
    return res.send(csv);
}

module.exports = {

    // 1. LISTAR TODOS LOS PLATILLOS + PLATILLOS DEL DÍA DEL TURNO ACTIVO E HISTÓRICOS
    listMenu: async (req, res) => {
        try {
            const platillos = await menuService.getAllItems();
            const categorias = await menuService.getActiveCategories();

            // Obtener turno activo
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            const turnoId = turnoActivo ? turnoActivo.id : null;

            // Obtener platillos del día del turno activo e histórico
            const platillosDiaActivos = turnoId ? await platilloDiaModel.getByTurno(turnoId) : [];
            const platillosDiaHistoricos = await platilloDiaModel.getHistorico();

            // Control de precios de cartas: la vista avisa y limita los
            // botones de guardado; el servidor revalida en cada escritura.
            let controlPrecios = { activo: false, puedeModificar: true, usuarioControl: null };
            try {
                const gatePrecios = await PrecioControlService.puedeModificarPrecios(req.user && req.user.id);
                controlPrecios = {
                    activo: !!gatePrecios.controlActivo,
                    puedeModificar: !!gatePrecios.permitido,
                    usuarioControl: gatePrecios.usuarioControl || null
                };
            } catch (errorGate) {
                console.error('Error al evaluar control de precios:', errorGate);
            }

            res.render('admin/menu', {
                platillos,
                categorias,
                user: req.user,
                controlPrecios,
                pageTitle: 'Gestión de Menú y Platillos del Día',
                view: 'dishes',
                turnoActivo,
                // Variables originales
                platillosDiaActivos,
                platillosDiaHistoricos,
                // Alias para compatibilidad con la vista
                platillosDiaTurno: platillosDiaActivos,
                historicoPlatillosDia: platillosDiaHistoricos
            });
        } catch (error) {
            console.error('Error al listar el menú:', error);
            res.redirect('/admin/dashboard');
        }
    },

    // 1b. EXPORTAR CATÁLOGO A CSV (guardar / compartir)
    exportarMenu: async (req, res) => {
        try {
            const platillos = await menuService.getAllItems();
            return responderCSV(res, 'carta_platillos',
                menuService.catalogoACSV(platillos), platillos.length);
        } catch (error) {
            console.error('Error al exportar el menú:', error);
            return res.redirect('/admin/menu');
        }
    },

    // 2. CREAR PLATILLO REGULAR
    createDish: async (req, res) => {
        const { nombre, descripcion, precio, categoria, precio_alt, precio_usd, estado } = req.body;
        const foto = req.file ? req.file.filename : null;
        // Control de precios de cartas (Configuración → Opciones generales):
        // con el control activo solo el usuario designado puede guardar precios.
        const gatePrecios = await PrecioControlService.puedeModificarPrecios(
            (req.user && req.user.id) || (req.session && req.session.user && req.session.user.id) || null
        );
        if (!gatePrecios.permitido) {
            if (req.file) {
                fs.unlink(path.join(__dirname, '../public/uploads', req.file.filename), () => {});
            }
            return res.status(403).json({ success: false, codigo: 'PRECIO_NO_AUTORIZADO', message: gatePrecios.mensaje });
        }

        try {
            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;
            const finalPrecioUsd = precio_usd && precio_usd.trim() !== '' ? parseFloat(precio_usd) : null;
            const finalFoto = foto && foto.trim() !== '' ? foto.trim() : null;

            await menuService.createItem({
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                precio: parseFloat(precio),
                categoria: categoria.trim(),
                precio_alt: finalPrecioAlt,
                precio_usd: finalPrecioUsd,
                foto: finalFoto,
                activo: estado
            });

            return res.status(201).json({
                success: true,
                message: `¡El platillo "${nombre.trim()}" ha sido agregado exitosamente al menú!`
            });
        } catch (error) {
            console.error('Error al crear platillo:', error);
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }
            return res.status(400).json({ success: false, message: error.message || 'Error al registrar el platillo.' });
        }
    },

    // 3. EDITAR PLATILLO REGULAR
    updateDish: async (req, res) => {
        const { id } = req.params;
        const { nombre, descripcion, precio, categoria, precio_alt, precio_usd, fotoActual, estado } = req.body;
        const foto = req.file ? req.file.filename : (fotoActual && fotoActual !== 'null' ? fotoActual.trim() : null);
        // Control de precios de cartas (Configuración → Opciones generales):
        // con el control activo solo el usuario designado puede guardar precios.
        const gatePrecios = await PrecioControlService.puedeModificarPrecios(
            (req.user && req.user.id) || (req.session && req.session.user && req.session.user.id) || null
        );
        if (!gatePrecios.permitido) {
            if (req.file) {
                fs.unlink(path.join(__dirname, '../public/uploads', req.file.filename), () => {});
            }
            return res.status(403).json({ success: false, codigo: 'PRECIO_NO_AUTORIZADO', message: gatePrecios.mensaje });
        }

        try {
            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;
            const finalPrecioUsd = precio_usd && precio_usd.trim() !== '' ? parseFloat(precio_usd) : null;

            if (req.file && fotoActual && fotoActual !== 'null' && fotoActual.trim() !== '') {
                const rutaFotoVieja = path.join(__dirname, '../public/uploads', fotoActual.trim());
                fs.unlink(rutaFotoVieja, () => {});
            }

            await menuService.updateItem(id, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                precio: parseFloat(precio),
                categoria: categoria.trim(),
                precio_alt: finalPrecioAlt,
                precio_usd: finalPrecioUsd,
                foto: foto,
                activo: estado
            });

            return res.status(200).json({ success: true, message: `¡El platillo "${nombre.trim()}" se actualizó correctamente!` });
        } catch (error) {
            console.error('Error al editar platillo:', error);
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }
            return res.status(400).json({ success: false, message: error.message || 'No se pudo actualizar el platillo.' });
        }
    },

    // 4. ELIMINAR PLATILLO REGULAR
    deleteDish: async (req, res) => {
        const { id } = req.params;
        try {
            const platillo = await menuService.getItemById(id);
            let nombrePlatillo = 'Platillo';

            if (platillo) {
                nombrePlatillo = platillo.nombre;
                if (platillo.foto && platillo.foto !== 'null' && platillo.foto.trim() !== '') {
                    const rutaFoto = path.join(__dirname, '../public/uploads', platillo.foto.trim());
                    fs.unlink(rutaFoto, () => {});
                }
            }

            await menuService.deleteItem(id);
            return res.status(200).json({ success: true, message: `El platillo "${nombrePlatillo}" fue eliminado permanentemente.` });
        } catch (error) {
            console.error('Error al eliminar platillo:', error);
            return res.status(500).json({ success: false, message: error.message || 'No se pudo eliminar el platillo.' });
        }
    },

    // ========================================================
    // 5. MÉTODOS PARA PLATILLOS DEL DÍA (OPERATIVOS EN EL TURNO)
    // ========================================================

    // Crear Platillo del Día en el Turno Activo
    createPlatilloDia: async (req, res) => {
        const { nombre, descripcion, precio, precio_alt, precio_usd, tipo } = req.body;
        const foto = req.file ? req.file.filename : null;
        // Control de precios de cartas (Configuración → Opciones generales):
        // con el control activo solo el usuario designado puede guardar precios.
        const gatePrecios = await PrecioControlService.puedeModificarPrecios(
            (req.user && req.user.id) || (req.session && req.session.user && req.session.user.id) || null
        );
        if (!gatePrecios.permitido) {
            if (req.file) {
                fs.unlink(path.join(__dirname, '../public/uploads', req.file.filename), () => {});
            }
            return res.status(403).json({ success: false, codigo: 'PRECIO_NO_AUTORIZADO', message: gatePrecios.mensaje });
        }

        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            if (!turnoActivo) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay un turno de servicio abierto actualmente para asignar platillos del día.'
                });
            }

            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;
            const finalPrecioUsd = precio_usd && precio_usd.trim() !== '' ? parseFloat(precio_usd) : null;

            await platilloDiaModel.create({
                turno_servicio_id: turnoActivo.id,
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                precio: parseFloat(precio),
                precio_alt: finalPrecioAlt,
                precio_usd: finalPrecioUsd,
                tipo: tipo || 'COMESTIBLES',
                foto: foto,
                usuario_id: req.user.id
            });

            return res.status(201).json({
                success: true,
                message: `¡"${nombre.trim()}" ha sido agregado como ${tipo === 'BEBIDAS' ? 'Trago' : 'Platillo'} del Día al turno #${turnoActivo.id}!`
            });
        } catch (error) {
            console.error('Error al crear platillo del día:', error);
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }
            return res.status(400).json({ success: false, message: error.message || 'Error al registrar el platillo del día.' });
        }
    },

    // EDITAR PLATILLO DEL DÍA DEL TURNO ACTIVO
    updatePlatilloDia: async (req, res) => {
        const { id } = req.params;
        const { nombre, descripcion, precio, precio_alt, precio_usd, tipo, fotoActual } = req.body;
        const foto = req.file ? req.file.filename : (fotoActual && fotoActual !== 'null' ? fotoActual.trim() : null);
        // Control de precios de cartas (Configuración → Opciones generales):
        // con el control activo solo el usuario designado puede guardar precios.
        const gatePrecios = await PrecioControlService.puedeModificarPrecios(
            (req.user && req.user.id) || (req.session && req.session.user && req.session.user.id) || null
        );
        if (!gatePrecios.permitido) {
            if (req.file) {
                fs.unlink(path.join(__dirname, '../public/uploads', req.file.filename), () => {});
            }
            return res.status(403).json({ success: false, codigo: 'PRECIO_NO_AUTORIZADO', message: gatePrecios.mensaje });
        }

        try {
            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;
            const finalPrecioUsd = precio_usd && precio_usd.trim() !== '' ? parseFloat(precio_usd) : null;

            if (req.file && fotoActual && fotoActual !== 'null' && fotoActual.trim() !== '') {
                const rutaFotoVieja = path.join(__dirname, '../public/uploads', fotoActual.trim());
                fs.unlink(rutaFotoVieja, () => {});
            }

            await platilloDiaModel.update(id, {
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                precio: parseFloat(precio),
                precio_alt: finalPrecioAlt,
                precio_usd: finalPrecioUsd,
                tipo: tipo || 'COMESTIBLES',
                foto: foto
            });

            return res.status(200).json({
                success: true,
                message: `¡"${nombre.trim()}" se actualizó correctamente!`
            });
        } catch (error) {
            console.error('Error al editar platillo del día:', error);
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }
            return res.status(400).json({ success: false, message: error.message || 'No se pudo actualizar el platillo del día.' });
        }
    },

    // Reutilizar / Clonar Platillo del Día Histórico al Turno Activo
    reutilizarPlatilloDia: async (req, res) => {
        try {
            const { id } = req.params;
            // Control de precios de cartas: reutilizar fija los precios del
            // turno, así que también exige al usuario designado.
            const gatePrecios = await PrecioControlService.puedeModificarPrecios(
                (req.user && req.user.id) || (req.session && req.session.user && req.session.user.id) || null
            );
            if (!gatePrecios.permitido) {
                return res.status(403).json({ success: false, codigo: 'PRECIO_NO_AUTORIZADO', message: gatePrecios.mensaje });
            }
            const turnoActivo = await turnoService.obtenerTurnoActivo();

            if (!turnoActivo) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No hay un turno de servicio abierto actualmente.' 
                });
            }

            const usuarioId = req.session?.user?.id || req.user?.id || null;
            await platilloDiaModel.clonarAlTurnoActual(id, turnoActivo.id, usuarioId);

            return res.json({ 
                success: true, 
                message: 'Platillo/trago agregado al turno activo con éxito.' 
            });
        } catch (error) {
            console.error('Error al reutilizar platillo del día:', error);
            return res.status(400).json({ 
                success: false, 
                message: error.message || 'Error al reutilizar el platillo.' 
            });
        }
    },

    // Eliminar Platillo del Día del Turno Actual
    deletePlatilloDia: async (req, res) => {
        const { id } = req.params;
        try {
            await platilloDiaModel.delete(id);
            return res.status(200).json({ success: true, message: 'Platillo del día removido del turno actual.' });
        } catch (error) {
            console.error('Error al eliminar platillo del día:', error);
            return res.status(500).json({ success: false, message: 'No se pudo remover el platillo del día.' });
        }
    }
};