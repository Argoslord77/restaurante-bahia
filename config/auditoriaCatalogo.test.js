// config/auditoriaCatalogo.test.js
// Verifica que el catálogo traduce correctamente cada ruta del sistema al
// evento de auditoría esperado, con especial atención a las cuatro familias
// que el negocio exige registrar: autenticación, CRUD y visualización,
// impresión y cierres.

const Catalogo = require('./auditoriaCatalogo');
const { CATEGORIAS, SEVERIDADES, describir, estaExcluida, esSondeoExcluido } = Catalogo;

describe('Catálogo de auditoría · exclusiones', () => {
    it('deja fuera los recursos estáticos para no ahogar el registro', () => {
        ['/css/bootstrap.min.css', '/js/app.js', '/img/logo.png', '/fonts/x.woff2',
         '/favicon.ico', '/uploads/foto.jpg', '/algo/estilo.map'].forEach(ruta => {
            expect(estaExcluida(ruta)).toBe(true);
        });
    });

    it('no excluye rutas reales de la aplicación', () => {
        ['/admin/usuarios', '/pos/cobrar/12', '/admin/recetas', '/login',
         '/admin/api/transferencias'].forEach(ruta => {
            expect(estaExcluida(ruta)).toBe(false);
        });
    });
});

describe('Catálogo de auditoría · autenticación', () => {
    it('marca el POST de login y el logout para registro explícito', () => {
        // Los gestiona authRoutes.js, que sí conoce el usuario intentado
        expect(describir('POST', '/login').omitirEnMiddleware).toBe(true);
        expect(describir('GET', '/logout').omitirEnMiddleware).toBe(true);
    });

    it('clasifica la pantalla de acceso como autenticación', () => {
        const d = describir('GET', '/login');
        expect(d.categoria).toBe(CATEGORIAS.AUTENTICACION);
        expect(d.omitirEnMiddleware).toBe(false);
    });
});

describe('Catálogo de auditoría · CRUD y visualización', () => {
    const casos = [
        ['GET',    '/admin/almacenes',            'Almacén',                 CATEGORIAS.LECTURA],
        ['POST',   '/admin/almacenes/add',        'Almacén',                 CATEGORIAS.ESCRITURA],
        ['PUT',    '/admin/almacen/edit/3',       'Almacén',                 CATEGORIAS.ESCRITURA],
        ['DELETE', '/admin/almacen/delete/3',     'Almacén',                 CATEGORIAS.ESCRITURA],
        ['GET',    '/admin/mesas',                'Mesa',                    CATEGORIAS.LECTURA],
        ['GET',    '/admin/recetas',              'Receta / Ficha técnica',  CATEGORIAS.LECTURA],
        ['POST',   '/admin/api/recetas',          'Receta / Ficha técnica',  CATEGORIAS.ESCRITURA],
        ['GET',    '/admin/transferencias',       'Transferencia',           CATEGORIAS.LECTURA],
        ['GET',    '/admin/productos',            'Producto',                CATEGORIAS.LECTURA],
        ['GET',    '/admin/menu',                 'Platillo del menú',       CATEGORIAS.LECTURA],
        ['GET',    '/admin/unidades-medida',      'Unidad de medida',        CATEGORIAS.LECTURA],
        ['GET',    '/admin/salidas-manuales',     'Salida manual',           CATEGORIAS.LECTURA]
    ];

    it.each(casos)('%s %s → entidad "%s" categoría %s', (metodo, ruta, entidad, categoria) => {
        const d = describir(metodo, ruta);
        expect(d.entidad).toBe(entidad);
        expect(d.categoria).toBe(categoria);
    });

    it('registra la simple visualización de un listado (no solo las escrituras)', () => {
        const d = describir('GET', '/admin/usuarios');
        expect(d.categoria).toBe(CATEGORIAS.LECTURA);
        expect(d.accion).toMatch(/Consultar/);
    });

    it('nunca deja una ruta sin descriptor, aunque no tenga regla propia', () => {
        const d = describir('POST', '/admin/modulo-inventado/42');
        expect(d.generica).toBe(true);
        expect(d.categoria).toBe(CATEGORIAS.ESCRITURA);
        expect(d.accion).toBeTruthy();
    });
});

describe('Catálogo de auditoría · impresión', () => {
    it('clasifica la emisión de la pre-cuenta como impresión', () => {
        const d = describir('GET', '/pos/precuenta/44');
        expect(d.categoria).toBe(CATEGORIAS.IMPRESION);
        expect(d.severidad).toBe(SEVERIDADES.AVISO);
    });

    it('clasifica el ticket de cierre de día como impresión', () => {
        expect(describir('GET', '/admin/cierre-dia/ticket').categoria).toBe(CATEGORIAS.IMPRESION);
    });
});

describe('Catálogo de auditoría · cierres de cuenta y turno', () => {
    const cierres = [
        ['POST', '/pos/cobrar/17'],
        ['POST', '/admin/cierre-dia/liquidar-cuenta/17'],
        ['POST', '/admin/turno/cierre'],
        ['POST', '/admin/pedido/17/cerrar']
    ];

    it.each(cierres)('%s %s se registra como CIERRE crítico', (metodo, ruta) => {
        const d = describir(metodo, ruta);
        expect(d.categoria).toBe(CATEGORIAS.CIERRE);
        expect(d.severidad).toBe(SEVERIDADES.CRITICO);
    });

    it('la apertura de turno se registra, pero no como cierre', () => {
        const d = describir('POST', '/admin/turno/apertura');
        expect(d.categoria).toBe(CATEGORIAS.ESCRITURA);
        expect(d.accion).toMatch(/Abrir turno/);
    });
});

describe('Catálogo de auditoría · seguridad y sistema', () => {
    it('trata los cambios sobre usuarios como material de seguridad crítico', () => {
        expect(describir('POST', '/admin/usuarios/crear').categoria).toBe(CATEGORIAS.SEGURIDAD);
        expect(describir('POST', '/admin/usuarios/eliminar/4').severidad).toBe(SEVERIDADES.CRITICO);
        expect(describir('POST', '/admin/usuario/cambiar-password').severidad).toBe(SEVERIDADES.CRITICO);
    });

    it('marca respaldo y restauración como operaciones críticas del sistema', () => {
        expect(describir('POST', '/admin/configuracion/restore').categoria).toBe(CATEGORIAS.SISTEMA);
        expect(describir('POST', '/admin/configuracion/backup').categoria).toBe(CATEGORIAS.EXPORTACION);
        expect(describir('POST', '/admin/configuracion/restore').severidad).toBe(SEVERIDADES.CRITICO);
    });

    it('audita a quien consulta o exporta el propio registro de auditoría', () => {
        expect(describir('GET', '/admin/auditoria').categoria).toBe(CATEGORIAS.LECTURA);
        expect(describir('GET', '/admin/auditoria').severidad).toBe(SEVERIDADES.AVISO);
        const exp = describir('GET', '/admin/auditoria/exportar');
        expect(exp.categoria).toBe(CATEGORIAS.EXPORTACION);
        expect(exp.severidad).toBe(SEVERIDADES.CRITICO);
    });
});

describe('Catálogo de auditoría · reportes y kardex', () => {
    it('audita la consulta del kardex como lectura con aviso', () => {
        const d = describir('GET', '/admin/kardex');
        expect(d.entidad).toBe('Kardex');
        expect(d.categoria).toBe('LECTURA');
        expect(d.severidad).toBe('AVISO');
        expect(describir('GET', '/admin/kardex?producto=7').entidad).toBe('Kardex');
    });

    it('clasifica la exportación del kardex como EXPORTACION', () => {
        const d = describir('GET', '/admin/kardex/exportar');
        expect(d.categoria).toBe('EXPORTACION');
        expect(d.accion).toContain('CSV');
    });

    it('describe cada reporte nuevo con su entidad propia', () => {
        expect(describir('GET', '/admin/reportes/salud-inventario').entidad).toBe('Salud del inventario');
        expect(describir('GET', '/admin/reportes/margen-platillos').entidad).toBe('Margen por platillo');
        expect(describir('GET', '/admin/reportes/explosion-recetas').entidad).toBe('Explosión de recetas');
        expect(describir('GET', '/admin/reportes/ventas-mesero').entidad).toBe('Ventas por mesero');
        expect(describir('GET', '/admin/reportes').entidad).toBe('Centro de reportes');
        // La ruta de exportación es más concreta y gana a la del kardex general
        expect(describir('GET', '/admin/kardex/exportar').entidad).toBe('Kardex');
    });

    it('clasifica la exportación de cualquier reporte como EXPORTACION', () => {
        ['/admin/reportes/salud-inventario/exportar',
         '/admin/reportes/margen-platillos/exportar',
         '/admin/reportes/explosion-recetas/exportar',
         '/admin/reportes/ventas-mesero/exportar'
        ].forEach(ruta => {
            const d = describir('GET', ruta);
            expect(d.categoria).toBe('EXPORTACION');
            expect(d.accion).toContain('CSV');
        });
    });
});

describe('Catálogo de auditoría · control de ruido', () => {
    it('excluye por completo los sondeos GET de las vistas (polling)', () => {
        // El tablero del mesero comprobando alertas, el POS consultando
        // ítems listos, el monitor de producción, el estado del turno y las
        // métricas del dashboard no son actividad del usuario.
        ['/api/monitor/comandas', '/pos/alertas-pendientes',
         '/api/pos/items-listos/15', '/pos/mesas/3/pre-pedidos',
         '/admin/turno/estado-actual', '/admin/api/dashboard/metrics'
        ].forEach(ruta => {
            expect(esSondeoExcluido('GET', ruta)).toBe(true);
        });
    });

    it('sigue auditando las escrituras sobre las rutas de sondeo', () => {
        // Descartar los pre-pedidos de una mesa es una acción real
        expect(esSondeoExcluido('DELETE', '/pos/mesas/3/pre-pedidos')).toBe(false);
        expect(esSondeoExcluido('POST', '/pos/alertas-pendientes')).toBe(false);
        expect(esSondeoExcluido('PUT', '/api/monitor/comandas')).toBe(false);
    });

    it('las rutas de sondeo ya no generan reglas de agrupación', () => {
        ['/pos/alertas-pendientes', '/api/pos/items-listos/15',
         '/api/monitor/comandas', '/admin/turno/estado-actual',
         '/admin/api/dashboard/metrics'
        ].forEach(ruta => {
            expect(describir('GET', ruta).agregarSegundos).toBe(0);
        });
    });

    it('NO agrupa las operaciones de negocio', () => {
        ['/pos/cobrar/1', '/admin/turno/cierre', '/admin/almacenes/add'].forEach(ruta => {
            expect(describir('POST', ruta).agregarSegundos).toBe(0);
        });
    });
});
