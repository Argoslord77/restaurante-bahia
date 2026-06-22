const db = require('../config/db');
const InventarioService = require('../services/inventarioService');

exports.getEntradasPage = async (req, res) => {
    try {
        // Obtener catálogos para los selects de la interfaz UI/UX de Restaurante Bahía
        const [almacenes] = await db.query("SELECT id, codigo, nombre FROM almacenes WHERE activo = 1");
        const [productos] = await db.query("SELECT id, codigo, nombre, tipo FROM productos");
        
        console.log(req.session.user);

        res.render('inventarios/entradas', {
            title: 'Entradas de Inventario - Restaurante Bahía',
            almacenes,
            productos,
            user: req.session.user || null
        });
    } catch (err) {
        res.status(500).send("Error al cargar el panel de entradas.");
    }
};

exports.procesarEntradaDirecta = async (req, res) => {
    const {
        almacen_id,
        producto_id,
        cantidad,
        costo_unitario,
        documento_numero,
        observaciones,
        maneja_lote,       // Booleano o flag de la UI
        numero_lote,       // Requerido si maneja_lote es true
        fecha_vencimiento  // Opcional/Requerido para perecederos
    } = req.body;

    const usuario_id = req.session.userId || 1; // ID del usuario en sesión
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        let lote_id = null;

        // 1. Si el producto maneja lote, se da de alta en la tabla maestra `lotes`
        if (maneja_lote === 'true' || maneja_lote === true) {
            if (!numero_lote) throw new Error("El número de lote es obligatorio para este producto.");
            
            const [loteResult] = await conn.query(
                `INSERT INTO lotes (producto_id, almacen_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, estado, created_at) 
                 VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, 'ACTIVO', NOW())`,
                [producto_id, almacen_id, numero_lote, fecha_vencimiento || null, cantidad, cantidad, costo_unitario]
            );
            lote_id = loteResult.insertId;
        }

        // 2. Ejecutar la afectación de stocks e histórico usando el servicio común
        const resultado = await InventarioService.registrarMovimiento({
            producto_id,
            almacen_id,
            lote_id,
            tipo_movimiento: 'RECEPCION', // O 'COMPRA' según corresponda
            referencia_tipo: 'ENTRADA_MANUAL',
            referencia_id: lote_id, // Vinculado al lote generado o documento
            cantidad: parseFloat(cantidad),
            costo_unitario: parseFloat(costo_unitario),
            observaciones,
            usuario_id,
            documento_numero,
            connection: conn // Se inyecta la conexión de la transacción actual
        });

        await conn.commit();
        res.status(200).json({
            success: true,
            message: `Entrada procesada correctamente. Nuevo stock general: ${resultado.stock_nuevo}`
        });

    } catch (error) {
        await conn.rollback();
        res.status(400).json({
            success: false,
            message: error.message || "Error interno al procesar la entrada."
        });
    } finally {
        conn.release();
    }
};