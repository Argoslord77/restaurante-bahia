// controllers/entradaController.js
const db = require('../config/db');
const Entrada = require('../models/entradaModel');

// Renderiza la vista principal de entradas
exports.viewEntradas = async (req, res) => {
    try {
        const [almacenes] = await db.query("SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC");
        const [productos] = await db.query("SELECT id, codigo, nombre FROM productos WHERE activo = 1 ORDER BY nombre ASC");
        const entradas = await Entrada.getAll();

        res.render('inventarios/entradas', {
            title: 'Entradas de Almacén - Restaurante Bahía',
            almacenes,
            productos,
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
    const { almacen_id, producto_id, fecha_ingreso, fecha_vencimiento, cantidad, costo_unitario } = req.body;

    try {
        if (!almacen_id || !producto_id || !cantidad || !costo_unitario) {
            return res.status(400).json({ success: false, message: "Todos los campos obligatorios deben ser completados." });
        }

        // 1. Validar rigurosamente que la fecha sea válida. Si viene vacía, usamos el día de hoy.
        const fechaValida = (fecha_ingreso && fecha_ingreso.trim() !== '') ? fecha_ingreso : new Date().toISOString().slice(0, 10);
        const anoActual = new Date(fechaValida).getFullYear();

        // 2. Consultar el correlativo anual sin peligro de NaN
        const [countResult] = await db.query(
            'SELECT COUNT(*) AS total FROM lotes WHERE YEAR(fecha_ingreso) = ?', 
            [anoActual]
        );
        
        // 3. Formatear el correlativo a 3 dígitos (LOT-2026-XXX)
        const siguienteCorrelativo = String(countResult[0].total + 1).padStart(3, '0');
        console.log("DEPURANDO SIGUIENTE COSNECUTIVO: ");
        console.log(siguienteCorrelativo);
        const numero_lote_autogenerado = `LOT-${anoActual}-${siguienteCorrelativo}`;

        // 4. Ejecución atómica en el Modelo
        await Entrada.registrarEntradaAtomica({
            almacen_id,
            producto_id,
            numero_lote: numero_lote_autogenerado,
            fecha_ingreso: fechaValida, // Pasamos la fecha sanitizada
            fecha_vencimiento: fecha_vencimiento === '' ? null : fecha_vencimiento,
            cantidad: parseFloat(cantidad),
            costo_unitario: parseFloat(costo_unitario)
        });

        return res.status(201).json({ 
            success: true, 
            message: `Entrada de stock registrada correctamente. Asignado el lote: ${numero_lote_autogenerado}` 
        });

    } catch (error) {
        console.error("Error en createEntrada:", error);
        return res.status(500).json({ success: false, message: "Error interno al procesar la entrada de inventario." });
    }
};