-- ============================================================================
-- MIGRACIÓN (T7): borrador del carrito compartido capitán → dependiente
-- Fecha: 2026-09-28 (rev. 2: sin llaves foráneas, convención del proyecto)
-- ============================================================================
-- Cuando el modo "solo capitanes" está activo, el capitán toma la orden en
-- el POS y su carrito (ronda en captura, aún sin enviar) se guarda aquí
-- como borrador. El dependiente asignado a la mesa lo ve en tiempo real
-- (solo lectura) en su POS y recibe el aviso en su tablero.
--
-- El borrador se elimina solo: al enviar la ronda, al cobrar la orden o
-- al vaciar el carrito. Un pedido tiene como máximo UN borrador vigente.
--
-- NOTA: igual que la tabla `reservas`, esta tabla NO declara llaves
-- foráneas (los id de pedidos/mesas son INT UNSIGNED y una FK con tipo
-- distinto aborta la migración con errno 150). La integridad la cuida la
-- aplicación, que borra el borrador al enviar, cobrar o vaciar.
--
-- Es SEGURO ejecutarlo varias veces (CREATE TABLE IF NOT EXISTS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS borradores_carrito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL COMMENT 'Pedido dueño del borrador (uno vigente por pedido)',
    id_mesa INT NOT NULL COMMENT 'Mesa del pedido (para avisar al dependiente asignado)',
    items_json JSON NOT NULL COMMENT 'Ronda en captura: [{id, nombre, precio, cantidad, notas, es_platillo_dia}]',
    actualizado_por INT NULL COMMENT 'Usuario que guardó el borrador (el capitán)',
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_borrador_pedido (id_pedido),
    KEY idx_borrador_mesa (id_mesa),
    KEY idx_borrador_actualizado (actualizado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
