// migrations/20240625000001_initial_schema.js
exports.up = function(knex) {
  return knex.schema
    // Tabla de usuarios
    .createTable('usuarios', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();
      table.string('apellidos', 100).notNullable();
      table.string('email', 255);
      table.string('usuario', 50).notNullable().unique();
      table.string('password', 255).notNullable();
      table.enum('rol', ['superadministrador', 'administrador', 'dependiente']).notNullable();
      table.string('foto', 255);
      table.enum('estado', ['activo', 'inactivo']).defaultTo('activo');
      table.timestamps(true, true);
      
      table.index('usuario');
      table.index('rol');
    })
    
    // Tabla de mesas
    .createTable('mesas', (table) => {
      table.increments('id').primary();
      table.integer('numero').notNullable().unique();
      table.integer('capacidad').notNullable();
      table.string('ubicacion', 50);
      table.enum('estado', ['disponible', 'ocupada', 'reservada']).defaultTo('disponible');
      table.timestamps(true, true);
      
      table.index('numero');
      table.index('estado');
    })
    
    // Tabla de menú/platillos
    .createTable('menu', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();
      table.text('descripcion');
      table.decimal('precio', 10, 2).notNullable();
      table.decimal('precio_alt', 10, 2);
      table.string('categoria', 50);
      table.string('foto', 255);
      table.enum('estado', ['activo', 'inactivo']).defaultTo('activo');
      table.timestamps(true, true);
      
      table.index('categoria');
      table.index('estado');
    })
    
    // Tabla de almacenes
    .createTable('almacenes', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();
      table.string('ubicacion', 100);
      table.integer('responsable_id').unsigned();
      table.enum('estado', ['activo', 'inactivo']).defaultTo('activo');
      table.timestamps(true, true);
      
      table.foreign('responsable_id').references('usuarios.id').onDelete('SET NULL');
      table.index('estado');
    })
    
    // Tabla de productos/inventario
    .createTable('productos', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).notNullable();
      table.text('descripcion');
      table.string('categoria', 50);
      table.string('unidad_medida', 20);
      table.timestamps(true, true);
      
      table.index('categoria');
    })
    
    // Tabla de stock
    .createTable('stock', (table) => {
      table.increments('id').primary();
      table.integer('producto_id').unsigned().notNullable();
      table.integer('almacen_id').unsigned().notNullable();
      table.decimal('cantidad', 10, 2).notNullable();
      table.date('fecha_vencimiento');
      table.timestamps(true, true);
      
      table.foreign('producto_id').references('productos.id').onDelete('CASCADE');
      table.foreign('almacen_id').references('almacenes.id').onDelete('CASCADE');
      table.index('producto_id');
      table.index('almacen_id');
      table.index('fecha_vencimiento');
    })
    
    // Tabla de pedidos
    .createTable('pedidos', (table) => {
      table.increments('id').primary();
      table.integer('mesa_id').unsigned();
      table.integer('usuario_id').unsigned().notNullable();
      table.enum('estado', ['abierto', 'en_proceso', 'cerrado']).defaultTo('abierto');
      table.decimal('total', 10, 2).defaultTo(0);
      table.timestamp('fecha_apertura').defaultTo(knex.fn.now());
      table.timestamp('fecha_cierre');
      table.timestamps(true, true);
      
      table.foreign('mesa_id').references('mesas.id').onDelete('SET NULL');
      table.foreign('usuario_id').references('usuarios.id').onDelete('CASCADE');
      table.index('mesa_id');
      table.index('usuario_id');
      table.index('estado');
    })
    
    // Tabla de detalles de pedido
    .createTable('pedido_detalles', (table) => {
      table.increments('id').primary();
      table.integer('pedido_id').unsigned().notNullable();
      table.integer('platillo_id').unsigned().notNullable();
      table.integer('cantidad').notNullable();
      table.decimal('precio_unitario', 10, 2).notNullable();
      table.decimal('subtotal', 10, 2).notNullable();
      table.enum('estado', ['pendiente', 'preparando', 'listo', 'entregado']).defaultTo('pendiente');
      table.timestamps(true, true);
      
      table.foreign('pedido_id').references('pedidos.id').onDelete('CASCADE');
      table.foreign('platillo_id').references('menu.id').onDelete('CASCADE');
      table.index('pedido_id');
      table.index('platillo_id');
      table.index('estado');
    })
    
    // Tabla de tokens de "recordarme"
    .createTable('usuarios_tokens', (table) => {
      table.increments('id').primary();
      table.string('token', 255).notNullable().unique();
      table.integer('usuario_id').unsigned().notNullable();
      table.datetime('expira_en').notNullable();
      table.timestamp('creado_en').defaultTo(knex.fn.now());
      
      table.foreign('usuario_id').references('usuarios.id').onDelete('CASCADE');
      table.index('token');
      table.index('usuario_id');
      table.index('expira_en');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('usuarios_tokens')
    .dropTableIfExists('pedido_detalles')
    .dropTableIfExists('pedidos')
    .dropTableIfExists('stock')
    .dropTableIfExists('productos')
    .dropTableIfExists('almacenes')
    .dropTableIfExists('menu')
    .dropTableIfExists('mesas')
    .dropTableIfExists('usuarios');
};
