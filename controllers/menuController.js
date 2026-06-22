const menuService = require('../services/menuService');
const fs = require('fs');
const path = require('path');

module.exports = {

    // 1. LISTAR TODOS LOS PLATILLOS (Mantiene el render para cargar la interfaz)
    listMenu: async (req, res) => {
        try {
            const platillos = await menuService.getAllItems();

            res.render('admin/menu', {
                platillos,
                user: req.user,
                pageTitle: 'Gestión de Menú',
                view: 'dishes'
            });
        } catch (error) {
            console.error('Error al listar el menú:', error);
            res.redirect('/admin/dashboard');
        }
    },

    // 2. CREAR PLATILLO (Optimizado para SweetAlert2 via API Fetch)
    createDish: async (req, res) => {
        const { nombre, descripcion, precio, categoria, precio_alt } = req.body;
        const foto = req.file ? req.file.filename : null;

        try {
            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;
            const finalFoto = foto && foto.trim() !== '' ? foto.trim() : null;

            await menuService.createItem({
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                precio: parseFloat(precio),
                categoria: categoria.trim(),
                precio_alt: finalPrecioAlt,
                foto: finalFoto
            });

            return res.status(201).json({
                success: true,
                message: `¡El platillo "${nombre.trim()}" ha sido agregado exitosamente al menú!`
            });

        } catch (error) {
            console.error('Error al crear platillo:', error);
            
            // Si hay error, limpiamos el archivo del servidor
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'Hubo un error al registrar el platillo.'
            });
        }
    },

    // 3. EDITAR PLATILLO (Optimizado para SweetAlert2 via API Fetch)
    updateDish: async (req, res) => {
        const { id } = req.params;
        const { nombre, descripcion, precio, categoria, precio_alt, fotoActual } = req.body;

        // Si viene una nueva foto, usamos esa; de lo contrario, conservamos la actual
        const foto = req.file ? req.file.filename : (fotoActual && fotoActual !== 'null' ? fotoActual.trim() : null);

        try {
            const finalPrecioAlt = precio_alt && precio_alt.trim() !== '' ? parseFloat(precio_alt) : null;

            // Si se subió una nueva foto y existía una foto previa válida, eliminamos el archivo antiguo
            if (req.file && fotoActual && fotoActual !== 'null' && fotoActual.trim() !== '') {
                const rutaFotoVieja = path.join(__dirname, '../public/uploads', fotoActual.trim());
                fs.unlink(rutaFotoVieja, (err) => {
                    if (err) {
                        console.error(`No se pudo eliminar la imagen vieja del platillo: ${fotoActual}`, err);
                    }
                });
            }

            await menuService.updateItem(id, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                precio: parseFloat(precio),
                categoria: categoria.trim(),
                precio_alt: finalPrecioAlt,
                foto: foto
            });

            return res.status(200).json({
                success: true,
                message: `¡El platillo "${nombre.trim()}" se actualizó correctamente!`
            });

        } catch (error) {
            console.error('Error al editar platillo:', error);

            // Si falla la actualización pero se subió una nueva foto, la borramos
            if (req.file) {
                const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
                fs.unlink(rutaFotoError, () => {});
            }

            return res.status(400).json({
                success: false,
                message: error.message || 'No se pudo actualizar el platillo.'
            });
        }
    },

    // 4. ELIMINAR PLATILLO (Optimizado para SweetAlert2 via API Fetch)
    deleteDish: async (req, res) => {
        const { id } = req.params;

        try {
            // Buscamos el platillo primero para saber el nombre de su foto y limpiar disco
            const platillo = await menuService.getItemById(id);
            let nombrePlatillo = 'Platillo';

            if (platillo) {
                nombrePlatillo = platillo.nombre;
                if (platillo.foto && platillo.foto !== 'null' && platillo.foto.trim() !== '') {
                    const rutaFoto = path.join(__dirname, '../public/uploads', platillo.foto.trim());
                    fs.unlink(rutaFoto, (err) => {
                        if (err) {
                            console.error(`No se pudo eliminar la foto del platillo al borrar: ${platillo.foto}`, err);
                        }
                    });
                }
            }

            await menuService.deleteItem(id);

            return res.status(200).json({
                success: true,
                message: `El platillo "${nombrePlatillo}" fue eliminado del menú de forma permanente.`
            });

        } catch (error) {
            console.error('Error al eliminar platillo:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'No se pudo eliminar el platillo seleccionado.'
            });
        }
    }
};