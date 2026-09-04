-- ============================================================
-- Restaurante Bahía — Mejoras 2026-09-04
-- Rama: mejoras/ficha-tecnica-y-cobro-mesas
-- 1) Ficha técnica: ingredientes indispensables/opcionales + área exigida (cocina/bar)
-- 2) Cobro de mesas: % servicio variable + motivo descuento (Juan Carlos y Asís)
-- ============================================================

-- ---------- 1) FICHA TÉCNICA ----------
-- Columna area_exigida: indica en qué área productiva es exigible el insumo.
-- Valores: 'ambas' (defecto), 'cocina', 'bar'. Si el platillo se vende desde un área
-- distinta a la exigida, la falta NO bloquea (solo advierte).
ALTER TABLE receta_detalles
  ADD COLUMN IF NOT EXISTS area_exigida VARCHAR(16) NOT NULL DEFAULT 'ambas';

-- Normalizar valores previos nulos/vacíos
UPDATE receta_detalles SET area_exigida='ambas' WHERE area_exigida IS NULL OR area_exigida='';

-- Asegurar que es_opcional existe (ya existía en instalaciones recientes)
ALTER TABLE receta_detalles
  ADD COLUMN IF NOT EXISTS es_opcional TINYINT(1) NOT NULL DEFAULT 0;

-- Índice para consultas de explosión por receta
CREATE INDEX IF NOT EXISTS idx_receta_detalles_receta ON receta_detalles (receta_id);

-- ---------- 2) COBRO DE MESAS ----------
-- % servicio variable (va a trabajadores, se deduce del efectivo del propietario en cuadre)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS porciento_servicio DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_servicio DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_descuento VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS motivo_ajuste VARCHAR(255) NULL;

-- Si la instalación usa 'recargo' genérico, se conserva. monto_servicio es específico de servicio.
-- Verificación rápida:
-- SELECT id, porciento_servicio, monto_servicio, motivo_descuento FROM pedidos LIMIT 5;
