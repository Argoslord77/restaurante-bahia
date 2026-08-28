// controllers/licenciaController.js
'use strict';
const fs = require('fs');
const path = require('path');
const Licencia = require('../services/licencia/licenciaService');
const Huella = require('../services/licencia/huella');
const db = require('../config/db');
const logger = require('../config/logger');

/** Panel de estado de la licencia. */
exports.viewLicencia = async (req, res) => {
    try {
        const evaluacion = await Licencia.evaluar({ forzar: true });
        let eventos = [];
        try {
            const [filas] = await db.query(
                'SELECT tipo, gravedad, detalle, creado_en FROM licencia_eventos ORDER BY id DESC LIMIT 40');
            eventos = filas;
        } catch (_) { /* la tabla puede no existir aún */ }

        const huella = Huella.actual();
        const comparacion = evaluacion.licencia && Licencia.leerLicencia().valida
            ? Huella.comparar(Licencia.leerLicencia().datos.huella || {}, undefined, huella)
            : null;

        return res.render('admin/licencia', {
            pageTitle: 'Licencia del Sistema',
            view: 'licencia',
            user: req.user || null,
            evaluacion, eventos, huella, comparacion
        });
    } catch (error) {
        logger.error('Error al cargar el panel de licencia:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo cargar el estado de la licencia.');
        return res.redirect('/admin/configuracion');
    }
};

/** Estado en JSON, para sondeos y diagnósticos. */
exports.apiEstado = async (req, res) => {
    try {
        return res.json({ success: true, ...(await Licencia.evaluar({ forzar: req.query.forzar === '1' })) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Descarga la solicitud de licencia de este equipo. */
exports.descargarSolicitud = async (req, res) => {
    try {
        const evaluacion = await Licencia.evaluar({ forzar: true });
        const huella = Huella.actual();
        huella.umbral = Huella.UMBRAL_POR_DEFECTO;
        const solicitud = {
            version: 1,
            cliente: req.query.cliente || '',
            instalacion: evaluacion.instalacion.uuid,
            huella,
            generada_en: new Date().toISOString(),
            equipo: { plataforma: process.platform, arquitectura: process.arch, node: process.version }
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="solicitud-licencia.json"');
        return res.send(JSON.stringify(solicitud, null, 2));
    } catch (error) {
        logger.error('Error al generar la solicitud de licencia:', error);
        return res.status(500).send('No se pudo generar la solicitud.');
    }
};

/** Instala un archivo de licencia pegado en el formulario. */
exports.instalarLicencia = async (req, res) => {
    try {
        const contenido = (req.body && req.body.licencia) || '';
        if (!contenido.trim()) {
            if (req.flash) req.flash('error_msg', 'No se recibió ningún contenido de licencia.');
            return res.redirect('/admin/licencia');
        }

        let parsed;
        try { parsed = JSON.parse(contenido); }
        catch (_) {
            if (req.flash) req.flash('error_msg', 'El contenido pegado no es un archivo de licencia válido.');
            return res.redirect('/admin/licencia');
        }

        // Se escribe en un temporal y solo se instala si verifica
        fs.mkdirSync(path.dirname(Licencia.RUTA_LICENCIA), { recursive: true });
        const temporal = Licencia.RUTA_LICENCIA + '.tmp';
        fs.writeFileSync(temporal, JSON.stringify(parsed, null, 2));

        const anterior = process.env.LICENCIA_ARCHIVO;
        process.env.LICENCIA_ARCHIVO = temporal;
        delete require.cache[require.resolve('../services/licencia/licenciaService')];
        const prueba = require('../services/licencia/licenciaService').leerLicencia();
        if (anterior) process.env.LICENCIA_ARCHIVO = anterior; else delete process.env.LICENCIA_ARCHIVO;

        if (!prueba.valida) {
            fs.unlinkSync(temporal);
            if (req.flash) req.flash('error_msg', `La licencia no es válida: ${prueba.motivo}.`);
            return res.redirect('/admin/licencia');
        }

        fs.renameSync(temporal, Licencia.RUTA_LICENCIA);
        Licencia.invalidarCache();
        await Licencia.registrarEvento('LICENCIA_INSTALADA',
            { id: prueba.datos.id, cliente: prueba.datos.cliente }, 'INFO');

        if (req.flash) req.flash('success_msg', `Licencia ${prueba.datos.id} instalada correctamente.`);
        return res.redirect('/admin/licencia');
    } catch (error) {
        logger.error('Error al instalar la licencia:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo instalar la licencia.');
        return res.redirect('/admin/licencia');
    }
};
