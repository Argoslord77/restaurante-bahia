const pool = require('../config/db');

/**
 * Servicio centralizado para configuración del sistema
 */
class SettingService {
    /**
     * Inicializa la tabla de configuraciones si no existe
     */
    static async ensureTable() {
        if (!pool) return;
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS configuraciones (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    clave VARCHAR(100) NOT NULL UNIQUE,
                    valor LONGTEXT NULL,
                    descripcion VARCHAR(255) NULL,
                    grupo VARCHAR(50) DEFAULT 'general',
                    tipo VARCHAR(20) DEFAULT 'boolean',
                    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `);

            // Insertar configuraciones por defecto si no existen
            const defaultConfigs = [
                {
                    clave: 'habilitar_monitores_elaboracion',
                    valor: '1',
                    descripcion: 'Habilitar monitores de elaboración en el Servicio (Cocina y Bar)',
                    grupo: 'general',
                    tipo: 'boolean'
                },
                {
                    clave: 'cliente_permite_prepedido',
                    valor: '1',
                    descripcion: 'Permitir Pre-pedidos a Clientes en menú público',
                    grupo: 'general',
                    tipo: 'boolean'
                },
                {
                    clave: 'app_nombre',
                    valor: 'Restaurante Bahía',
                    descripcion: 'Nombre Comercial del Restaurante',
                    grupo: 'identidad',
                    tipo: 'string'
                },
                {
                    clave: 'app_moneda',
                    valor: '$',
                    descripcion: 'Símbolo Monetario Predeterminado',
                    grupo: 'identidad',
                    tipo: 'string'
                },
                {
                    clave: 'salon_areas',
                    valor: 'Salon Principal, Terraza, Barra',
                    descripcion: 'Áreas y Ubicaciones del Establecimiento',
                    grupo: 'salon',
                    tipo: 'string'
                },
                {
                    clave: 'factura_impuesto',
                    valor: '0',
                    descripcion: 'Impuesto General aplicado a Ventas (%)',
                    grupo: 'finanzas',
                    tipo: 'number'
                },
                {
                    clave: 'factura_propina',
                    valor: '0',
                    descripcion: 'Porcentaje de Propina Sugerida (%)',
                    grupo: 'finanzas',
                    tipo: 'number'
                },
                {
                    clave: 'inventario_unidades',
                    valor: 'Uds, Kg, Lts, Oz',
                    descripcion: 'Unidades de Medida Permitidas (Stock)',
                    grupo: 'inventario',
                    tipo: 'string'
                }
            ];

            for (const item of defaultConfigs) {
                await pool.query(`
                    INSERT IGNORE INTO configuraciones (clave, valor, descripcion, grupo, tipo)
                    VALUES (?, ?, ?, ?, ?)
                `, [item.clave, item.valor, item.descripcion, item.grupo, item.tipo]);
            }
        } catch (err) {
            console.error('Error al verificar/crear tabla configuraciones:', err.message);
        }
    }

    /**
     * Obtiene el valor tipado de una configuración por su clave
     * @param {string} clave 
     * @param {*} valorPorDefecto 
     */
    static async get(clave, valorPorDefecto = null) {
        if (!pool) return valorPorDefecto;
        try {
            await this.ensureTable();
            const [rows] = await pool.query(
                'SELECT valor, tipo FROM configuraciones WHERE clave = ? LIMIT 1',
                [clave]
            );
            if (rows.length === 0) {
                return valorPorDefecto;
            }

            const rawVal = rows[0].valor;
            const tipo = rows[0].tipo || 'string';

            if (tipo === 'boolean') {
                return rawVal === '1' || rawVal === 'true' || rawVal === true;
            } else if (tipo === 'number') {
                return parseFloat(rawVal) || 0;
            } else if (tipo === 'json') {
                try {
                    return JSON.parse(rawVal);
                } catch {
                    return valorPorDefecto;
                }
            }
            return rawVal;
        } catch (err) {
            console.error(`Error al obtener setting ${clave}:`, err.message);
            return valorPorDefecto;
        }
    }

    /**
     * Guarda o actualiza una configuración
     * @param {string} clave 
     * @param {*} valor 
     * @param {string} descripcion 
     * @param {string} grupo 
     * @param {string} tipo 
     */
    static async set(clave, valor, descripcion = '', grupo = 'general', tipo = 'boolean') {
        if (!pool) return false;
        try {
            await this.ensureTable();
            let valorString = valor;
            if (tipo === 'boolean') {
                valorString = (valor === true || valor === '1' || valor === 'true' || valor === 1) ? '1' : '0';
            } else if (typeof valor === 'object' && valor !== null) {
                valorString = JSON.stringify(valor);
            } else {
                valorString = String(valor);
            }

            await pool.query(`
                INSERT INTO configuraciones (clave, valor, descripcion, grupo, tipo)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    valor = VALUES(valor),
                    descripcion = COALESCE(VALUES(descripcion), descripcion),
                    grupo = COALESCE(VALUES(grupo), grupo),
                    tipo = COALESCE(VALUES(tipo), tipo)
            `, [clave, valorString, descripcion, grupo, tipo]);

            return true;
        } catch (err) {
            console.error(`Error al guardar setting ${clave}:`, err.message);
            return false;
        }
    }

    /**
     * Obtiene todas las configuraciones con soporte para acceso por objeto { nombre, valor } y directo
     */
    static async getAll() {
        const defaults = {
            app_nombre: { nombre: 'Nombre Comercial del Restaurante', valor: 'Restaurante Bahía' },
            app_moneda: { nombre: 'Símbolo Monetario Predeterminado', valor: '$' },
            salon_areas: { nombre: 'Áreas y Ubicaciones del Establecimiento', valor: 'Salon Principal, Terraza, Barra' },
            factura_impuesto: { nombre: 'Impuesto General aplicado a Ventas (%)', valor: '0' },
            factura_propina: { nombre: 'Porcentaje de Propina Sugerida (%)', valor: '0' },
            inventario_unidades: { nombre: 'Unidades de Medida Permitidas (Stock)', valor: 'Uds, Kg, Lts, Oz' },
            cliente_permite_prepedido: { nombre: 'Permitir Pre-pedidos a Clientes', valor: '1' },
            habilitar_monitores_elaboracion: { nombre: 'Habilitar monitores de elaboración en el Servicio', valor: '1' }
        };

        if (!pool) return defaults;

        try {
            await this.ensureTable();
            const [rows] = await pool.query('SELECT clave, valor, tipo, descripcion, grupo FROM configuraciones');
            const settings = { ...defaults };

            for (const r of rows) {
                settings[r.clave] = {
                    clave: r.clave,
                    valor: r.valor,
                    nombre: r.descripcion || r.clave,
                    tipo: r.tipo,
                    grupo: r.grupo
                };
            }

            return settings;
        } catch (err) {
            console.error('Error al obtener configuraciones globales:', err.message);
            return defaults;
        }
    }
}

module.exports = SettingService;
