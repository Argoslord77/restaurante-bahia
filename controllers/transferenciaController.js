// controllers/transferenciaController.js
const db = require('../config/db');
const Transferencia = require('../models/transferenciaModel');
const TransferenciaService = require('../services/transferenciaService');

exports.viewTransferencias = async (req, res) => {
    try {
        const [almacenes] = await db.query("SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC");
        const [productos] = await db.query("SELECT id, codigo, nombre, unidad_inventario_id FROM productos WHERE activo = 1 ORDER BY nombre ASC");
        const [unidades] = await db.query("SELECT id, codigo, nombre, abreviatura FROM unidades_medida WHERE activa = 1 ORDER BY nombre ASC");
        const transferencias = await Transferencia.getAll();

        res.render('inventarios/transferencias', {
            title: 'Transferencias Internas - Restaurante Bahía',
            almacenes,
            productos,
            unidades,
            transferencias,
            user: req.session.user || req.user || null,
            view: 'transferencias'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al cargar la interfaz de transferencias.");
    }
};

exports.createSolicitud = async (req, res) => {
    const { almacen_origen_id, almacen_destino_id, detalles, observaciones } = req.body;
    
    // 1. Corregimos el nombre para que coincida exactamente con lo que el Modelo y la BD esperan
    const solicitado_por =  req.user?.id || req.session?.user?.id;

    try {
        // Validación de seguridad por si no hay sesión activa
        if (!solicitado_por) {
            return res.status(401).json({ 
                success: false, 
                message: "Sesión inválida o expirada. Por favor, inicie sesión de nuevo." 
            });
        }

        if (!almacen_origen_id || !almacen_destino_id || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ success: false, message: "Todos los campos obligatorios deben ser completados." });
        }

        if (parseInt(almacen_origen_id) === parseInt(almacen_destino_id)) {
            return res.status(400).json({ success: false, message: "El almacén origen y destino no pueden coincidir." });
        }

        // 2. Verificar stock de origen para CADA producto de la solicitud
        for (const detalle of detalles) {
            const tieneStock = await Transferencia.verificarStockOrigen(almacen_origen_id, detalle.producto_id, detalle.cantidad);
            if (!tieneStock) {
                return res.status(400).json({
                    success: false,
                    message: `El almacén de origen no cuenta con suficiente stock disponible para el producto ID ${detalle.producto_id}.`
                });
            }
        }

        // 3. Enviamos el objeto con la propiedad 'solicitado_por' perfectamente mapeada
        const insertId = await Transferencia.createSolicitudAtomica({
            almacen_origen_id,
            almacen_destino_id,
            solicitado_por, // <-- CAMBIADO AQUÍ (de solicitante_id a solicitado_por)
            observaciones,
            detalles
        });

        return res.status(201).json({ success: true, message: "Solicitud registrada con éxito.", id: insertId });
    } catch (error) {
        console.error("Error en createSolicitud:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.aprobarTransferencia = async (req, res) => {
    const { id } = req.params;
    const aprobadorId = req.session?.user?.id || req.user?.id || 1;
    try {
        await Transferencia.updateEstado(id, 'APROBADA', aprobadorId);
        return res.status(200).json({ success: true, message: "La solicitud ha sido aprobada." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.rechazarTransferencia = async (req, res) => {
    const { id } = req.params;
    const aprobadorId = req.session?.user?.id || req.user?.id || 1;
    try {
        await Transferencia.updateEstado(id, 'RECHAZADA', aprobadorId);
        return res.status(200).json({ success: true, message: "La solicitud ha sido rechazada." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.completarTransferencia = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.session?.user?.id || req.user?.id || 1;
    try {
        const resultado = await TransferenciaService.transferirProducto({
            id_transferencia: id,
            usuario_id
        });
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.getTransferencia = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await Transferencia.getById(id);
        if (!data) return res.status(404).json({ success: false, message: "No se encontró el registro." });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTransferenciasByAlmacen = async (req, res) => {
    const { almacenId } = req.params;
    try {
        const [rows] = await db.query("SELECT t.* FROM transferencias t WHERE t.almacen_origen_id = ? OR t.almacen_destino_id = ?", [almacenId, almacenId]);
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};