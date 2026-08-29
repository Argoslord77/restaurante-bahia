const pool = require('../config/db');
const SettingService = require('../services/settingService');
const UbicacionMesaModel = require('../models/ubicacionMesaModel');

module.exports = {
    // Vista de Configuración del Sistema
    viewSettings: async (req, res) => {
        try {
            const settings = await SettingService.getAll();
            let categorias = [];
            let almacenes = [];
            let ubicaciones = [];

            if (pool) {
                try {
                    const [catRows] = await pool.query(`
                        SELECT cp.*, a.nombre AS almacen_nombre,
                               COUNT(pm.id) AS total_platillos
                        FROM categorias_platillos cp
                        LEFT JOIN almacenes a ON cp.almacen_id = a.id
                        LEFT JOIN platillos_menu pm ON pm.categoria = cp.id
                        GROUP BY cp.id
                        ORDER BY cp.nombre ASC
                    `);
                    categorias = catRows;
                } catch (catErr) {
                    console.warn('Categorías no encontradas con conteo:', catErr.message);
                    try {
                        const [basicRows] = await pool.query('SELECT * FROM categorias_platillos ORDER BY nombre ASC');
                        categorias = basicRows;
                    } catch (err2) {}
                }

                try {
                    const [almRows] = await pool.query('SELECT id, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC');
                    almacenes = almRows;
                } catch (almErr) {
                    console.warn('Almacenes no encontrados:', almErr.message);
                }

                try {
                    const [ubiRows] = await pool.query(`
                        SELECT u.id, u.nombre, u.descripcion, u.orden, u.activo,
                               COUNT(m.id) AS total_mesas
                        FROM ubicacion_mesa u
                        LEFT JOIN mesas m ON m.ubicacion_id = u.id
                        GROUP BY u.id
                        ORDER BY u.orden ASC, u.nombre ASC
                    `);
                    ubicaciones = ubiRows;
                } catch (ubiErr) {
                    console.warn('Ubicaciones de mesa no encontradas:', ubiErr.message);
                }
            }

            res.render('admin/settings', {
                pageTitle: 'Configuración General - Restaurante Bahía',
                view: 'admin_settings',
                settings,
                categorias,
                almacenes,
                ubicaciones,
                user: req.user || null,
                success_msg: req.flash ? req.flash('success_msg') : null,
                error_msg: req.flash ? req.flash('error_msg') : null
            });
        } catch (err) {
            console.error('Error al cargar configuración:', err);
            res.status(500).send('Error al cargar configuración del sistema');
        }
    },

    // Guardar cambios generales de configuración
    updateSettings: async (req, res) => {
        try {
            const {
                app_nombre,
                app_moneda,
                factura_impuesto,
                factura_propina,
                inventario_unidades,
                habilitar_monitores_elaboracion,
                cliente_permite_prepedido
            } = req.body;

            if (app_nombre !== undefined) {
                await SettingService.set('app_nombre', app_nombre, 'Nombre Comercial del Restaurante', 'identidad', 'string');
            }

            if (app_moneda !== undefined) {
                await SettingService.set('app_moneda', app_moneda, 'Símbolo Monetario Predeterminado', 'identidad', 'string');
            }

            // NOTA: las áreas del salón ya no se guardan como texto libre:
            // se administran con el CRUD de la pestaña "Salón y Áreas"
            // (tabla ubicacion_mesa). El ajuste legado "salon_areas" se ignora.

            if (factura_impuesto !== undefined) {
                await SettingService.set('factura_impuesto', factura_impuesto, 'Impuesto General aplicado a Ventas (%)', 'finanzas', 'number');
            }

            if (factura_propina !== undefined) {
                await SettingService.set('factura_propina', factura_propina, 'Porcentaje de Propina Sugerida (%)', 'finanzas', 'number');
            }

            if (inventario_unidades !== undefined) {
                await SettingService.set('inventario_unidades', inventario_unidades, 'Unidades de Medida Permitidas (Stock)', 'inventario', 'string');
            }

            if (habilitar_monitores_elaboracion !== undefined) {
                await SettingService.set(
                    'habilitar_monitores_elaboracion',
                    habilitar_monitores_elaboracion === '1' || habilitar_monitores_elaboracion === 'on' || habilitar_monitores_elaboracion === true,
                    'Habilitar monitores de elaboración en el Servicio (Cocina y Bar)',
                    'general',
                    'boolean'
                );
            }

            if (cliente_permite_prepedido !== undefined) {
                await SettingService.set(
                    'cliente_permite_prepedido',
                    cliente_permite_prepedido === '1' || cliente_permite_prepedido === 'on' || cliente_permite_prepedido === true,
                    'Permitir Pre-pedidos a Clientes',
                    'general',
                    'boolean'
                );
            }

            if (req.xhr || req.headers.accept?.includes('json') || req.headers['content-type']?.includes('json')) {
                return res.json({ success: true, message: 'Ajustes del sistema guardados correctamente.' });
            }

            if (req.flash) req.flash('success_msg', 'Ajustes del sistema guardados correctamente');
            res.redirect('/admin/settings');
        } catch (err) {
            console.error('Error al actualizar settings:', err);
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.status(500).json({ success: false, message: err.message });
            }
            if (req.flash) req.flash('error_msg', 'Error al guardar la configuración');
            res.redirect('/admin/settings');
        }
    },

    // API: Actualizar una opción rápida vía AJAX (Toggle instantáneo)
    actualizarOpcionRapida: async (req, res) => {
        try {
            const { clave, valor, tipo } = req.body;
            if (!clave) {
                return res.status(400).json({ success: false, message: 'La clave de configuración es obligatoria' });
            }

            let valorParsed = valor;
            let tipoSetting = tipo || 'boolean';

            if (tipoSetting === 'boolean') {
                valorParsed = (valor === true || valor === 'true' || valor === 1 || valor === '1');
            }

            const success = await SettingService.set(clave, valorParsed, '', 'general', tipoSetting);

            if (success) {
                return res.json({
                    success: true,
                    clave,
                    valor: valorParsed ? '1' : '0',
                    message: `Opción "${clave}" actualizada correctamente.`
                });
            } else {
                return res.status(500).json({ success: false, message: 'No se pudo guardar la configuración' });
            }
        } catch (err) {
            console.error('Error en actualizarOpcionRapida:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    // API: Categorías de Platillos (CRUD)
    getCategoriasPlatillos: async (req, res) => {
        try {
            if (!pool) return res.json({ success: true, data: [] });
            const [rows] = await pool.query(`
                SELECT cp.*, a.nombre AS almacen_nombre,
                       COUNT(pm.id) AS total_platillos
                FROM categorias_platillos cp
                LEFT JOIN almacenes a ON cp.almacen_id = a.id
                LEFT JOIN platillos_menu pm ON pm.categoria = cp.id
                GROUP BY cp.id
                ORDER BY cp.nombre ASC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    saveCategoriaPlatillo: async (req, res) => {
        try {
            const { id, nombre, tipo, descripcion, almacen_id } = req.body;
            if (!nombre || !nombre.trim()) {
                return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
            }

            if (!pool) return res.json({ success: true, message: 'Categoría guardada exitosamente' });

            const almId = (almacen_id && almacen_id !== '') ? parseInt(almacen_id, 10) : null;
            const tipoDespacho = tipo || 'COMESTIBLES';

            if (id && id !== '') {
                await pool.query(
                    'UPDATE categorias_platillos SET nombre = ?, tipo = ?, descripcion = ?, almacen_id = ? WHERE id = ?',
                    [nombre.trim(), tipoDespacho, descripcion || null, almId, id]
                );
            } else {
                await pool.query(
                    'INSERT INTO categorias_platillos (nombre, tipo, descripcion, almacen_id, activo) VALUES (?, ?, ?, ?, 1)',
                    [nombre.trim(), tipoDespacho, descripcion || null, almId]
                );
            }
            res.json({ success: true, message: 'Categoría de menú guardada correctamente' });
        } catch (err) {
            console.error('Error al guardar categoría:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    toggleCategoriaPlatillo: async (req, res) => {
        try {
            const { id } = req.params;
            const { activo } = req.body;
            if (!pool) return res.json({ success: true });

            if (activo !== undefined) {
                await pool.query('UPDATE categorias_platillos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
            } else {
                await pool.query('UPDATE categorias_platillos SET activo = NOT activo WHERE id = ?', [id]);
            }
            res.json({ success: true, message: 'Estado de categoría actualizado' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    deleteCategoriaPlatillo: async (req, res) => {
        try {
            const { id } = req.params;
            if (!pool) return res.json({ success: true });

            // Verificar si tiene platillos asociados
            const [platillos] = await pool.query('SELECT COUNT(*) AS total FROM platillos_menu WHERE categoria = ?', [id]);
            if (platillos[0].total > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar la categoría porque contiene ${platillos[0].total} platillo(s) asociados.`
                });
            }

            await pool.query('DELETE FROM categorias_platillos WHERE id = ?', [id]);
            res.json({ success: true, message: 'Categoría eliminada con éxito' });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================================================================
    // API: Areas de Servicio / Salones (CRUD - tabla ubicacion_mesa)
    // ================================================================
    getUbicacionesMesa: async (req, res) => {
        try {
            if (!pool) return res.json({ success: true, data: [] });
            const rows = await UbicacionMesaModel.getAllWithMesas();
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    saveUbicacionMesa: async (req, res) => {
        try {
            const { id, nombre, descripcion, orden } = req.body;
            if (!nombre || !nombre.trim()) {
                return res.status(400).json({ success: false, message: 'El nombre del area es obligatorio' });
            }

            if (!pool) return res.json({ success: true, message: 'Area de servicio guardada exitosamente' });

            const data = {
                nombre: nombre.trim(),
                descripcion: (descripcion || '').toString().trim() || null,
                orden: orden || 0
            };

            if (id && id !== '') {
                const anterior = await UbicacionMesaModel.getById(id);
                await UbicacionMesaModel.update(id, data);
                // Propagar el renombrado al espejo legado mesas.ubicacion
                await UbicacionMesaModel.sincronizarNombreMesas(id, data.nombre);
                // Y a la distribución de mesas guardada hoy para ese área
                if (anterior && anterior.nombre && anterior.nombre !== data.nombre) {
                    await UbicacionMesaModel.sincronizarAsignacionesHoy(anterior.nombre, data.nombre);
                }
            } else {
                await UbicacionMesaModel.create(data);
            }
            res.json({ success: true, message: 'Area de servicio guardada correctamente' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Ya existe un area de servicio con ese nombre' });
            }
            console.error('Error al guardar area de servicio:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    toggleUbicacionMesa: async (req, res) => {
        try {
            const { id } = req.params;
            const { activo } = req.body;
            if (!pool) return res.json({ success: true });

            if (activo !== undefined) {
                await UbicacionMesaModel.setEstado(id, activo);
            } else {
                const actual = await UbicacionMesaModel.getById(id);
                if (!actual) {
                    return res.status(404).json({ success: false, message: 'Area de servicio no encontrada' });
                }
                await UbicacionMesaModel.setEstado(id, !actual.activo);
            }
            res.json({ success: true, message: 'Estado del area actualizado' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    deleteUbicacionMesa: async (req, res) => {
        try {
            const { id } = req.params;
            if (!pool) return res.json({ success: true });

            // Verificar si tiene mesas asociadas
            const totalMesas = await UbicacionMesaModel.countMesasAsociadas(id);
            if (totalMesas > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar el area porque contiene ${totalMesas} mesa(s) asociada(s). Reasigna o elimina esas mesas primero.`
                });
            }

            await UbicacionMesaModel.delete(id);
            res.json({ success: true, message: 'Area de servicio eliminada con exito' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
