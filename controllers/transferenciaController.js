// controllers/transferenciaController.js
const db = require('../config/db');
const Transferencia = require('../models/transferenciaModel');
const TransferenciaService = require('../services/transferenciaService');

exports.viewTransferencias = async (req, res) => {
    try {
        const [almacenes] = await db.query("SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC");
        const [productos] = await db.query("SELECT id, codigo, nombre FROM productos WHERE activo = 1 ORDER BY nombre ASC");
        const transferencias = await Transferencia.getAll();

        res.render('inventarios/transferencias', {
            title: 'Transferencias Internas - Restaurante Bahía',
            almacenes,
            productos,
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
    const { almacen_origen_id, almacen_destino_id, producto_id, cantidad, observaciones } = req.body;
    const solicitante_id = req.session?.user?.id || req.user?.id || 1;

    try {
        if (parseInt(almacen_origen_id) === parseInt(almacen_destino_id)) {
            return res.status(400).json({ success: false, message: "El almacén origen y destino no pueden coincidir." });
        }

        const tieneStock = await Transferencia.verificarStockOrigen(almacen_origen_id, producto_id, cantidad);
        if (!tieneStock) {
            return res.status(400).json({ success: false, message: "El almacén de origen no cuenta con suficiente stock disponible." });
        }

        const insertId = await Transferencia.createSolicitudAtomica({
            almacen_origen_id,
            almacen_destino_id,
            producto_id,
            cantidad,
            solicitante_id,
            observaciones
        });

        return res.status(201).json({ success: true, message: "Solicitud registrada con éxito.", id: insertId });
    } catch (error) {
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