// controllers/entradaController.js
const db = require('../config/db');
const Entrada = require('../models/entradaModel');
const UnidadMedidaService = require('../services/unidadMedidaService');

// Renderiza la vista principal de entradas
exports.viewEntradas = async (req, res) => {
    try {
        const [almacenes] = await db.query("SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC");
        const [productos] = await db.query(`
            SELECT p.id, p.codigo, p.nombre, p.unidad_inventario_id,
                   ui.nombre AS unidad_inventario_nombre,
                   ui.abreviatura AS unidad_inventario_abreviatura
            FROM productos p
            LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
            WHERE p.activo = 1
            ORDER BY p.nombre ASC
        `);
        const unidades = await UnidadMedidaService.listarUnidades(false);
        const entradas = await Entrada.getAll();

        res.render('inventarios/entradas', {
            title: 'Entradas de Almacén - Restaurante Bahía',
            almacenes,
            productos,
            unidades,
            entradas,
            user: req.session?.user || req.user || null,
            view: 'entradas' // Activa el link en el Sidebar
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al cargar el panel de entradas de almacén.");
    }
};

// API: Procesa el formulario de nueva entrada
exports.createEntrada = async (req, res) => {
    const {
        almacen_id,
        producto_id,
        unidad_medida_id,
        fecha_ingreso,
        fecha_vencimiento,
        cantidad,
        costo_unitario
    } = req.body;

    try {
        if (!almacen_id || !producto_id || !unidad_medida_id || !cantidad || costo_unitario === undefined || costo_unitario === '') {
            return res.status(400).json({
                success: false,
                message: 'Almacén, producto, unidad de medida, cantidad y costo son obligatorios.'
            });
        }

        // 1. Validar rigurosamente que la fecha sea válida. Si viene vacía, usamos el día de hoy.
        const fechaValida = (fecha_ingreso && fecha_ingreso.trim() !== '') ? fecha_ingreso : new Date().toISOString().slice(0, 10);

        // 2. Ejecución atómica en el Modelo: el número de lote (LOT-YYYY-XXX) se
        //    calcula DENTRO de la transacción y se devuelve para responder con el real.
        const resultado = await Entrada.registrarEntradaAtomica({
            almacen_id: parseInt(almacen_id, 10),
            producto_id: parseInt(producto_id, 10),
            unidad_medida_id: parseInt(unidad_medida_id, 10),
            fecha_ingreso: fechaValida,
            fecha_vencimiento: fecha_vencimiento === '' ? null : fecha_vencimiento,
            cantidad: parseFloat(cantidad),
            costo_unitario: parseFloat(costo_unitario)
        });

        return res.status(201).json({
            success: true,
            message: `Entrada de stock registrada correctamente. Asignado el lote: ${resultado.numero_lote}`
        });

    } catch (error) {
        console.error("Error en createEntrada:", error);
        return res.status(400).json({ success: false, message: error.message || "Error interno al procesar la entrada de inventario." });
    }
};