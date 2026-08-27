const pool = require('../config/db');
const SettingService = require('../services/settingService');

module.exports = {
    // Vista de Configuración del Sistema
    viewSettings: async (req, res) => {
        try {
            const settings = await SettingService.getAll();
            let categorias = [];
            let almacenes = [];

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
            }

            res.render('admin/settings', {
                pageTitle: 'Configuración General - Restaurante Bahía',
                view: 'admin_settings',
                settings,
                categorias,
                almacenes,
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
                salon_areas,
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

            if (salon_areas !== undefined) {
                await SettingService.set('salon_areas', salon_areas, 'Áreas y Ubicaciones del Establecimiento', 'salon', 'string');
            }

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
    }
};
