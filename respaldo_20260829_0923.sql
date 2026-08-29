/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: restaurante_db
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-0+deb13u1 from Debian

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `acuerdos_precios_historial`
--

DROP TABLE IF EXISTS `acuerdos_precios_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `acuerdos_precios_historial` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `acuerdo_detalle_id` bigint(20) unsigned NOT NULL,
  `precio_anterior` decimal(18,6) NOT NULL,
  `precio_nuevo` decimal(18,6) NOT NULL,
  `fecha_cambio` datetime NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `motivo` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `acuerdo_detalle_id` (`acuerdo_detalle_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `acuerdos_precios_historial_ibfk_1` FOREIGN KEY (`acuerdo_detalle_id`) REFERENCES `acuerdos_precios_proveedor_detalle` (`id`),
  CONSTRAINT `acuerdos_precios_historial_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acuerdos_precios_historial`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `acuerdos_precios_historial` WRITE;
/*!40000 ALTER TABLE `acuerdos_precios_historial` DISABLE KEYS */;
/*!40000 ALTER TABLE `acuerdos_precios_historial` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `acuerdos_precios_proveedor`
--

DROP TABLE IF EXISTS `acuerdos_precios_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `acuerdos_precios_proveedor` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint(20) unsigned NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('BORRADOR','ACTIVO','VENCIDO','SUSPENDIDO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  `moneda` varchar(10) NOT NULL DEFAULT 'USD',
  `prioridad` int(11) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `creado_por` int(11) NOT NULL,
  `aprobado_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_app_creado_por` (`creado_por`),
  KEY `fk_app_aprobado_por` (`aprobado_por`),
  KEY `idx_app_proveedor` (`proveedor_id`),
  KEY `idx_app_estado` (`estado`),
  KEY `idx_app_fechas` (`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `fk_app_aprobado_por` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_app_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_app_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acuerdos_precios_proveedor`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `acuerdos_precios_proveedor` WRITE;
/*!40000 ALTER TABLE `acuerdos_precios_proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `acuerdos_precios_proveedor` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `acuerdos_precios_proveedor_detalle`
--

DROP TABLE IF EXISTS `acuerdos_precios_proveedor_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `acuerdos_precios_proveedor_detalle` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `acuerdo_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `unidad_medida_id` bigint(20) unsigned NOT NULL,
  `cantidad_minima` decimal(18,3) NOT NULL DEFAULT 0.000,
  `cantidad_maxima` decimal(18,3) DEFAULT NULL,
  `precio_unitario` decimal(18,6) NOT NULL,
  `porcentaje_descuento` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `bonificacion_cantidad` decimal(18,3) NOT NULL DEFAULT 0.000,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_appd_unidad` (`unidad_medida_id`),
  KEY `idx_appd_producto` (`producto_id`),
  KEY `idx_appd_acuerdo` (`acuerdo_id`),
  KEY `idx_appd_cantidad` (`cantidad_minima`,`cantidad_maxima`),
  KEY `fk_appd_almacen` (`almacen_id`),
  CONSTRAINT `fk_appd_acuerdo` FOREIGN KEY (`acuerdo_id`) REFERENCES `acuerdos_precios_proveedor` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appd_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_appd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_appd_unidad` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acuerdos_precios_proveedor_detalle`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `acuerdos_precios_proveedor_detalle` WRITE;
/*!40000 ALTER TABLE `acuerdos_precios_proveedor_detalle` DISABLE KEYS */;
/*!40000 ALTER TABLE `acuerdos_precios_proveedor_detalle` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ajuste_inventario_detalles`
--

DROP TABLE IF EXISTS `ajuste_inventario_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ajuste_inventario_detalles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ajuste_inventario_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `stock_anterior` decimal(18,3) NOT NULL,
  `cantidad_ajuste` decimal(18,3) NOT NULL,
  `stock_nuevo` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `impacto_financiero` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_aid_ajuste` (`ajuste_inventario_id`),
  KEY `idx_aid_producto` (`producto_id`),
  KEY `idx_aid_almacen` (`almacen_id`),
  KEY `idx_aid_lote` (`lote_id`),
  CONSTRAINT `fk_aid_ajuste` FOREIGN KEY (`ajuste_inventario_id`) REFERENCES `ajustes_inventario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aid_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_aid_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_aid_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ajuste_inventario_detalles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ajuste_inventario_detalles` WRITE;
/*!40000 ALTER TABLE `ajuste_inventario_detalles` DISABLE KEYS */;
/*!40000 ALTER TABLE `ajuste_inventario_detalles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ajustes_inventario`
--

DROP TABLE IF EXISTS `ajustes_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ajustes_inventario` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_ajuste` varchar(50) NOT NULL,
  `fecha_ajuste` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo_ajuste` enum('POSITIVO','NEGATIVO') NOT NULL,
  `motivo` enum('CONTEO_FISICO','ERROR_RECEPCION','ERROR_TRANSFERENCIA','ERROR_PRODUCCION','ERROR_CAPTURA','REGULARIZACION','AUDITORIA','OTRO') NOT NULL,
  `conteo_fisico_id` bigint(20) unsigned DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('BORRADOR','APROBADO','APLICADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  `creado_por` int(11) NOT NULL,
  `aprobado_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_ajuste` (`numero_ajuste`),
  KEY `fk_ai_creado_por` (`creado_por`),
  KEY `fk_ai_aprobado_por` (`aprobado_por`),
  KEY `idx_ai_numero` (`numero_ajuste`),
  KEY `idx_ai_fecha` (`fecha_ajuste`),
  KEY `idx_ai_tipo` (`tipo_ajuste`),
  KEY `idx_ai_motivo` (`motivo`),
  KEY `idx_ai_estado` (`estado`),
  KEY `idx_ai_conteo` (`conteo_fisico_id`),
  CONSTRAINT `fk_ai_aprobado_por` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_conteo` FOREIGN KEY (`conteo_fisico_id`) REFERENCES `conteos_fisicos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ajustes_inventario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ajustes_inventario` WRITE;
/*!40000 ALTER TABLE `ajustes_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `ajustes_inventario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `alertas`
--

DROP TABLE IF EXISTS `alertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo_alerta` varchar(50) NOT NULL,
  `tipo_alerta` enum('STOCK_MINIMO','STOCK_CRITICO','VENCIMIENTO_PROXIMO','LOTE_VENCIDO','COMPRA_RECOMENDADA','PRODUCCION_RECOMENDADA','MERMA_EXCESIVA','DIFERENCIA_CONTEO','INVENTARIO_NEGATIVO','SIN_MOVIMIENTO','OTRO') NOT NULL,
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
  `producto_id` bigint(20) unsigned DEFAULT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `fecha_alerta` datetime NOT NULL DEFAULT current_timestamp(),
  `titulo` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('PENDIENTE','EN_PROCESO','RESUELTA','CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_resolucion` datetime DEFAULT NULL,
  `resuelto_por` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_alerta` (`codigo_alerta`),
  KEY `fk_alerta_usuario` (`resuelto_por`),
  KEY `idx_alerta_tipo` (`tipo_alerta`),
  KEY `idx_alerta_prioridad` (`prioridad`),
  KEY `idx_alerta_estado` (`estado`),
  KEY `idx_alerta_fecha` (`fecha_alerta`),
  KEY `idx_alerta_producto` (`producto_id`),
  KEY `idx_alerta_lote` (`lote_id`),
  KEY `idx_alerta_almacen` (`almacen_id`),
  CONSTRAINT `fk_alerta_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alerta_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alerta_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alerta_usuario` FOREIGN KEY (`resuelto_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alertas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `alertas` WRITE;
/*!40000 ALTER TABLE `alertas` DISABLE KEYS */;
/*!40000 ALTER TABLE `alertas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `alertas_presupuesto`
--

DROP TABLE IF EXISTS `alertas_presupuesto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas_presupuesto` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `presupuesto_id` bigint(20) unsigned NOT NULL,
  `tipo` enum('80_PORCIENTO','90_PORCIENTO','100_PORCIENTO','EXCEDIDO') NOT NULL,
  `fecha_alerta` datetime NOT NULL,
  `mensaje` text NOT NULL,
  `atendida` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ap_presupuesto` (`presupuesto_id`),
  CONSTRAINT `fk_ap_presupuesto` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuestos_compras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alertas_presupuesto`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `alertas_presupuesto` WRITE;
/*!40000 ALTER TABLE `alertas_presupuesto` DISABLE KEYS */;
/*!40000 ALTER TABLE `alertas_presupuesto` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `almacenes`
--

DROP TABLE IF EXISTS `almacenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `almacenes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('principal','cocina','bar','congelador','camara_fria','despensa','produccion','otro') NOT NULL DEFAULT 'otro',
  `categoria` enum('logistico','produccion') DEFAULT NULL COMMENT 'Categoría operativa: logistico = almacén central/abastecedor; produccion = almacén de área que consume por venta',
  `ubicacion` varchar(255) DEFAULT NULL,
  `responsable_usuario_id` int(11) DEFAULT NULL,
  `permite_ventas` tinyint(1) NOT NULL DEFAULT 0,
  `permite_consumo` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_almacen_responsable` (`responsable_usuario_id`),
  KEY `idx_almacenes_categoria` (`categoria`,`activo`),
  CONSTRAINT `fk_almacen_responsable` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `almacenes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `almacenes` WRITE;
/*!40000 ALTER TABLE `almacenes` DISABLE KEYS */;
INSERT INTO `almacenes` VALUES
(1,'A002','Almacen Central','Almacen Logistico Central del restaurante','principal','logistico','Casa Matriz',3,0,1,1,'2026-06-10 15:54:47','2026-08-28 12:44:43'),
(2,'A001','Cocina','Almacen de cocina','cocina','produccion','Casa Matriz',NULL,1,1,1,'2026-06-11 00:16:06','2026-08-28 12:44:43'),
(5,'A003','Bar','Area de almacenamiento del Bar','bar','produccion','BAR',NULL,1,1,1,'2026-07-02 16:47:06','2026-08-28 12:44:43');
/*!40000 ALTER TABLE `almacenes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `asignaciones_diarias`
--

DROP TABLE IF EXISTS `asignaciones_diarias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones_diarias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `ubicacion` varchar(100) NOT NULL,
  `turno_id` bigint(20) unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_turno_ubicacion` (`turno_id`,`ubicacion`),
  KEY `fk_asignaciones_turno` (`turno_id`),
  CONSTRAINT `fk_asignaciones_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos_servicio` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignaciones_diarias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `asignaciones_diarias` WRITE;
/*!40000 ALTER TABLE `asignaciones_diarias` DISABLE KEYS */;
INSERT INTO `asignaciones_diarias` VALUES
(15,'2026-08-27','Salon Principal',3,'2026-08-27 14:09:33'),
(16,'2026-08-27','Terraza',3,'2026-08-27 14:09:33'),
(17,'2026-08-27','Balcon',3,'2026-08-27 14:09:33'),
(18,'2026-08-28','Salon Principal',4,'2026-08-28 20:48:59'),
(19,'2026-08-28','Terraza',4,'2026-08-28 20:48:59'),
(20,'2026-08-28','Balcon',4,'2026-08-28 20:48:59');
/*!40000 ALTER TABLE `asignaciones_diarias` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `auditoria_inventario`
--

DROP TABLE IF EXISTS `auditoria_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_inventario` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `movimiento_id` bigint(20) unsigned DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE','AJUSTE','CORRECCION_COSTO','CORRECCION_LOTE','ANULACION') NOT NULL,
  `campo_modificado` varchar(100) DEFAULT NULL,
  `valor_anterior` text DEFAULT NULL,
  `valor_nuevo` text DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `ip_origen` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `datos_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_anteriores`)),
  `datos_nuevos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_nuevos`)),
  PRIMARY KEY (`id`),
  KEY `fk_ai_almacen` (`almacen_id`),
  KEY `idx_ai_producto` (`producto_id`),
  KEY `idx_ai_lote` (`lote_id`),
  KEY `idx_ai_usuario` (`usuario_id`),
  KEY `idx_ai_fecha` (`created_at`),
  KEY `idx_ai_movimiento` (`movimiento_id`),
  CONSTRAINT `fk_ai_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimientos_inventario` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ai_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_ai_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_inventario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `auditoria_inventario` WRITE;
/*!40000 ALTER TABLE `auditoria_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria_inventario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `auditoria_usuarios`
--

DROP TABLE IF EXISTS `auditoria_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_usuarios` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `usuario_nombre` varchar(150) DEFAULT NULL,
  `usuario_rol` varchar(60) DEFAULT NULL,
  `metodo_http` varchar(10) NOT NULL,
  `ruta` varchar(255) NOT NULL,
  `url` varchar(1024) DEFAULT NULL,
  `accion` varchar(150) NOT NULL,
  `entidad` varchar(100) DEFAULT NULL,
  `entidad_id` varchar(100) DEFAULT NULL,
  `modulo` varchar(60) DEFAULT NULL COMMENT 'Agrupación funcional: Inventario, Caja, Recetas...',
  `categoria` varchar(20) DEFAULT NULL COMMENT 'AUTENTICACION|LECTURA|ESCRITURA|IMPRESION|CIERRE|EXPORTACION|SEGURIDAD|SISTEMA',
  `severidad` varchar(10) DEFAULT NULL COMMENT 'INFO|AVISO|CRITICO',
  `sesion_id` varchar(128) DEFAULT NULL COMMENT 'Correlaciona toda la actividad de una misma sesión',
  `repeticiones` int(10) unsigned NOT NULL DEFAULT 1 COMMENT 'Peticiones agrupadas en endpoints de sondeo',
  `estado_http` smallint(5) unsigned DEFAULT NULL,
  `operacion_exitosa` tinyint(1) NOT NULL DEFAULT 0,
  `ip_origen` varchar(100) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `datos_operacion` longtext DEFAULT NULL,
  `duracion_ms` int(10) unsigned DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_fecha` (`creado_en`),
  KEY `idx_auditoria_accion` (`accion`),
  KEY `idx_auditoria_ruta` (`ruta`),
  KEY `idx_auditoria_estado` (`estado_http`),
  KEY `idx_auditoria_categoria` (`categoria`,`creado_en`),
  KEY `idx_auditoria_severidad` (`severidad`,`creado_en`),
  KEY `idx_auditoria_modulo` (`modulo`,`creado_en`),
  KEY `idx_auditoria_entidad` (`entidad`,`entidad_id`),
  KEY `idx_auditoria_sesion` (`sesion_id`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1347 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_usuarios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `auditoria_usuarios` WRITE;
/*!40000 ALTER TABLE `auditoria_usuarios` DISABLE KEYS */;
INSERT INTO `auditoria_usuarios` VALUES
(3,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','UzVaextIxVhwDHkYpMIxrewv3mbOOHRW',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',821,'2026-08-28 13:37:22'),
(4,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','UzVaextIxVhwDHkYpMIxrewv3mbOOHRW',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 13:37:23'),
(5,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','UzVaextIxVhwDHkYpMIxrewv3mbOOHRW',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,131,'2026-08-28 13:37:23'),
(6,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 13:37:34'),
(7,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,1325,'2026-08-28 13:37:36'),
(8,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',11,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',21,'2026-08-28 13:37:38'),
(9,3,'Willian Portilla Torriente','superadministrador','GET','/admin/configuracion','/admin/configuracion','Consultar Configuración','Configuración',NULL,'Sistema','SISTEMA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,233,'2026-08-28 13:39:24'),
(10,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,253,'2026-08-28 13:39:42'),
(11,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=1&categoria=SISTEMA','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"1\",\"categoria\":\"SISTEMA\"}}',61,'2026-08-28 13:40:28'),
(12,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,129,'2026-08-28 13:40:42'),
(13,3,'Willian Portilla Torriente','superadministrador','GET','/admin/fichas-costo','/admin/fichas-costo','Consultar /admin/fichas-costo',NULL,NULL,'Otros','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',252,'2026-08-28 13:40:51'),
(14,3,'Willian Portilla Torriente','superadministrador','GET','/admin/fichas-costo','/admin/fichas-costo?busqueda=aceite','Consultar /admin/fichas-costo',NULL,NULL,'Otros','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"busqueda\":\"aceite\"},\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',223,'2026-08-28 13:41:45'),
(15,3,'Willian Portilla Torriente','superadministrador','GET','/admin/fichas-costo','/admin/fichas-costo','Consultar /admin/fichas-costo',NULL,NULL,'Otros','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',96,'2026-08-28 13:41:56'),
(16,3,'Willian Portilla Torriente','superadministrador','GET','/admin/licencia','/admin/licencia','Consultar /admin/licencia',NULL,NULL,'Otros','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',111,'2026-08-28 13:42:33'),
(17,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,39,'2026-08-28 13:43:10'),
(18,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',22,'2026-08-28 13:43:10'),
(19,3,'Willian Portilla Torriente','superadministrador','GET','/admin/usuarios','/admin/usuarios','Consultar Usuario','Usuario',NULL,'Usuarios','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,69,'2026-08-28 13:47:58'),
(20,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,37,'2026-08-28 13:48:02'),
(21,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',14,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 13:48:12'),
(22,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,400,'2026-08-28 13:48:21'),
(23,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,41,'2026-08-28 13:48:32'),
(24,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,167,'2026-08-28 13:49:22'),
(25,3,'Willian Portilla Torriente','superadministrador','GET','/admin/pedidos','/admin/pedidos','Consultar Pedido','Pedido',NULL,'Pedidos','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,81,'2026-08-28 13:50:26'),
(26,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,55,'2026-08-28 13:51:06'),
(27,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',27,'2026-08-28 13:53:18'),
(28,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',29,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',26,'2026-08-28 13:58:21'),
(29,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,26,'2026-08-28 13:59:27'),
(30,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,26,'2026-08-28 13:59:29'),
(31,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,100,'2026-08-28 13:59:47'),
(32,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',24,'2026-08-28 14:03:30'),
(33,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',12,'2026-08-28 14:05:38'),
(34,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,3,'2026-08-28 14:05:39'),
(35,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,6,'2026-08-28 14:05:39'),
(36,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','CJIE76tHgWyjUb7B_I-X0SJrQNrKIv1k',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',4,'2026-08-28 14:06:26'),
(37,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','CJIE76tHgWyjUb7B_I-X0SJrQNrKIv1k',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 14:06:26'),
(38,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','CJIE76tHgWyjUb7B_I-X0SJrQNrKIv1k',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-28 14:06:26'),
(39,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 14:07:50'),
(40,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 14:07:50'),
(41,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,2,'2026-08-28 14:07:50'),
(42,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,18,'2026-08-28 14:07:50'),
(43,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',35,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 14:07:50'),
(44,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',10,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 14:08:32'),
(45,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,51,'2026-08-28 14:08:35'),
(46,NULL,NULL,NULL,'POST','/login','/login','Inicio de sesión fallido: credenciales incorrectas','Sesión',NULL,'Autenticación','SEGURIDAD','CRITICO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,401,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"usuario_intentado\":\"jack\",\"motivo\":\"Contraseña incorrecta.\"}',NULL,'2026-08-28 14:11:06'),
(47,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,5,'2026-08-28 14:11:07'),
(48,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,34,'2026-08-28 14:11:25'),
(49,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',421,'2026-08-28 14:13:10'),
(50,NULL,NULL,NULL,'POST','/login','/login','Inicio de sesión fallido: credenciales incorrectas','Sesión',NULL,'Autenticación','SEGURIDAD','CRITICO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,401,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"usuario_intentado\":\"jack\",\"motivo\":\"Contraseña incorrecta.\"}',NULL,'2026-08-28 14:15:23'),
(51,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','fRD9ySARyz1QnFs_zKwY4vQLsxgxUEHb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,5,'2026-08-28 14:15:23'),
(52,20,'Jack Sparrow','cocinero','POST','/login','/login','Inicio de sesión correcto','Sesión','20','Autenticación','AUTENTICACION','AVISO','VQ_PvamkZm0WC4czKzhR0cVmegkeu9yH',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"rol\":\"cocinero\",\"recordarme\":false}',NULL,'2026-08-28 14:15:37'),
(53,20,'Jack Sparrow','cocinero','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','VQ_PvamkZm0WC4czKzhR0cVmegkeu9yH',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,3,'2026-08-28 14:15:37'),
(54,20,'Jack Sparrow','cocinero','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','VQ_PvamkZm0WC4czKzhR0cVmegkeu9yH',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,5,'2026-08-28 14:15:37'),
(55,20,'Jack Sparrow','cocinero','GET','/monitor/:area','/monitor/cocina','Consultar Monitor de producción','Monitor de producción','cocina','Producción','LECTURA','INFO','VQ_PvamkZm0WC4czKzhR0cVmegkeu9yH',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"parametros_ruta\":{\"area\":\"cocina\"}}',162,'2026-08-28 14:15:37'),
(56,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,32,'2026-08-28 14:15:46'),
(57,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?accion=&categoria=AUTENTICACION&severidad=&modulo=&entidad=&usuarioId=&rol=&desde=&hasta=','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"accion\":\"\",\"categoria\":\"AUTENTICACION\",\"severidad\":\"\",\"modulo\":\"\",\"entidad\":\"\",\"usuarioId\":\"\",\"rol\":\"\",\"desde\":\"\",\"hasta\":\"\"}}',107,'2026-08-28 14:16:28'),
(58,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?accion=&categoria=&severidad=&modulo=&entidad=Monitor+de+producci%C3%B3n&usuarioId=&rol=&desde=&hasta=','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"accion\":\"\",\"categoria\":\"\",\"severidad\":\"\",\"modulo\":\"\",\"entidad\":\"Monitor de producción\",\"usuarioId\":\"\",\"rol\":\"\",\"desde\":\"\",\"hasta\":\"\"}}',33,'2026-08-28 14:16:58'),
(59,20,'Jack Sparrow','cocinero','GET','/logout','/logout','Cierre de sesión','Sesión','20','Autenticación','AUTENTICACION','INFO','EyaaKFKygcx3oN9T9cC9UECxv_HxJvl_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"sesion_recordada_revocada\":false}',NULL,'2026-08-28 14:18:13'),
(60,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','EyaaKFKygcx3oN9T9cC9UECxv_HxJvl_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,9,'2026-08-28 14:18:13'),
(61,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,33,'2026-08-28 14:18:22'),
(62,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',13,'2026-08-28 14:19:10'),
(63,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,29,'2026-08-28 14:20:33'),
(64,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',16,'2026-08-28 14:20:33'),
(65,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','8r1wT75jm1hwBLnng7JyQlpSqWMyRUjG',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',2,'2026-08-28 14:21:17'),
(66,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','8r1wT75jm1hwBLnng7JyQlpSqWMyRUjG',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,3,'2026-08-28 14:21:17'),
(67,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','8r1wT75jm1hwBLnng7JyQlpSqWMyRUjG',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,5,'2026-08-28 14:21:17'),
(68,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','11','Autenticación','AUTENTICACION','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 14:23:45'),
(69,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,2,'2026-08-28 14:23:46'),
(70,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,2,'2026-08-28 14:23:46'),
(71,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,47,'2026-08-28 14:23:46'),
(72,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 14:23:46'),
(73,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',75,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 14:23:50'),
(74,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',13,'2026-08-28 14:25:10'),
(75,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-28 14:25:35'),
(76,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',23,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 14:28:51'),
(77,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"cuerpo\":{\"id_mesa\":26}}',93,'2026-08-28 14:29:08'),
(78,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',448,'2026-08-28 14:29:09'),
(79,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"cuerpo\":{\"id_pedido\":\"13\",\"id_mesa\":26,\"items\":[{\"id\":\"107\",\"nombre\":\"Agua Natural\",\"precio\":320,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false},{\"id\":\"65\",\"nombre\":\"Aporreado de Ternera\",\"precio\":4100,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false}]}}',218,'2026-08-28 14:30:00'),
(80,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/13','Registrar Punto de venta','Punto de venta','13','Punto de Venta','ESCRITURA','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',33,'2026-08-28 14:30:08'),
(81,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/13','Emitir pre-cuenta para impresión','Pre-cuenta','13','Punto de Venta','IMPRESION','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',40,'2026-08-28 14:30:15'),
(82,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',226,'2026-08-28 14:30:29'),
(83,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',25,'2026-08-28 14:30:37'),
(84,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,4,'2026-08-28 14:30:40'),
(85,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,1,'2026-08-28 14:30:40'),
(86,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,20,'2026-08-28 14:30:41'),
(87,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',15,'2026-08-28 14:31:10'),
(88,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,23,'2026-08-28 14:31:30'),
(89,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"cuerpo\":{\"id_mesa\":26}}',9,'2026-08-28 14:31:50'),
(90,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',239,'2026-08-28 14:31:51'),
(91,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','10IXNvtVtZDPYUXmHj2EpRmbr86djxGl',12,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',15,'2026-08-28 14:35:37'),
(92,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',41,'2026-08-28 14:37:10'),
(93,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 14:37:37'),
(94,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:37:37'),
(95,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:37:47'),
(96,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:37:57'),
(97,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:38:07'),
(98,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:38:17'),
(99,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:38:27'),
(100,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:38:37'),
(101,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:38:47'),
(102,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:38:57'),
(103,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:39:07'),
(104,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:39:17'),
(105,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:39:27'),
(106,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:39:37'),
(107,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:39:47'),
(108,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:39:57'),
(109,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 14:40:07'),
(110,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:40:17'),
(111,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:40:27'),
(112,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:40:37'),
(113,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:40:47'),
(114,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:40:57'),
(115,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:41:07'),
(116,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 14:41:17'),
(117,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:41:27'),
(118,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:41:37'),
(119,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:41:47'),
(120,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:41:57'),
(121,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:42:07'),
(122,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:42:17'),
(123,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:42:27'),
(124,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 14:42:37'),
(125,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:42:37'),
(126,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:42:47'),
(127,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:42:57'),
(128,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:43:07'),
(129,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',4,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 14:43:10'),
(130,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:43:17'),
(131,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:43:27'),
(132,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:43:37'),
(133,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:43:47'),
(134,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:43:57'),
(135,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:44:07'),
(136,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:44:17'),
(137,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:44:27'),
(138,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:44:37'),
(139,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":27}}',56,'2026-08-28 14:44:42'),
(140,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/14','Consultar Punto de venta','Punto de venta','14','Punto de Venta','LECTURA','INFO','B3YAtjRSwzCwN7MTgajWApYuqvqOhPfD',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',152,'2026-08-28 14:44:43'),
(141,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:44:47'),
(142,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,2,'2026-08-28 14:44:52'),
(143,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,302,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,2,'2026-08-28 14:44:52'),
(144,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,21,'2026-08-28 14:44:52'),
(145,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',2,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 14:44:52'),
(146,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0',NULL,37,'2026-08-28 14:44:54'),
(147,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,200,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"cuerpo\":{\"id_mesa\":26}}',6,'2026-08-28 14:44:56'),
(148,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','aH16xR0hZAoCvFXQ0HnVacOXllwx1aDW',1,304,1,'::ffff:192.168.250.242','Mozilla/5.0 (Android 12; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',138,'2026-08-28 14:44:56'),
(149,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:44:57'),
(150,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:45:07'),
(151,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:45:17'),
(152,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:45:27'),
(153,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:45:37'),
(154,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 14:45:47'),
(155,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:45:57'),
(156,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:46:07'),
(157,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:46:18'),
(158,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 14:46:27'),
(159,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:46:37'),
(160,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:46:47'),
(161,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:46:57'),
(162,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:47:07'),
(163,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:47:17'),
(164,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:47:27'),
(165,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 14:47:37'),
(166,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:47:37'),
(167,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:47:47'),
(168,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:47:57'),
(169,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:48:07'),
(170,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:48:17'),
(171,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:48:27'),
(172,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:48:37'),
(173,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:48:47'),
(174,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:48:57'),
(175,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:49:07'),
(176,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:49:17'),
(177,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:49:27'),
(178,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:49:37'),
(179,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:49:47'),
(180,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:49:57'),
(181,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:50:07'),
(182,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:50:17'),
(183,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:50:27'),
(184,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:50:37'),
(185,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:50:47'),
(186,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,14,'2026-08-28 14:50:58'),
(187,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 14:51:07'),
(188,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:51:17'),
(189,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:51:27'),
(190,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:51:37'),
(191,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:51:47'),
(192,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:51:57'),
(193,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 14:52:07'),
(194,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:52:17'),
(195,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 14:52:27'),
(196,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 14:52:37'),
(197,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:52:37'),
(198,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:52:47'),
(199,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:52:57'),
(200,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 14:53:07'),
(201,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:53:17'),
(202,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,16,'2026-08-28 14:53:27'),
(203,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:53:37'),
(204,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:53:47'),
(205,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:53:57'),
(206,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:54:07'),
(207,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:54:17'),
(208,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:54:27'),
(209,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:54:37'),
(210,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:54:47'),
(211,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 14:54:57'),
(212,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:55:07'),
(213,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:55:17'),
(214,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:55:27'),
(215,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:55:37'),
(216,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:55:47'),
(217,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:55:57'),
(218,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:56:07'),
(219,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:56:17'),
(220,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:56:27'),
(221,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:56:37'),
(222,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:56:47'),
(223,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:56:57'),
(224,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:57:07'),
(225,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:57:17'),
(226,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:57:27'),
(227,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',4,'2026-08-28 14:57:37'),
(228,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:57:37'),
(229,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 14:57:47'),
(230,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 14:57:57'),
(231,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:58:07'),
(232,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 14:58:17'),
(233,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 14:58:27'),
(234,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:58:37'),
(235,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:58:47'),
(236,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 14:58:57'),
(237,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:59:07'),
(238,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:59:17'),
(239,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 14:59:27'),
(240,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:59:37'),
(241,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:59:47'),
(242,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 14:59:57'),
(243,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:00:07'),
(244,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:00:17'),
(245,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:00:27'),
(246,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:00:37'),
(247,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:00:47'),
(248,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:00:57'),
(249,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:01:07'),
(250,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:01:17'),
(251,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:01:28'),
(252,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:01:38'),
(253,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:01:48'),
(254,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:01:58'),
(255,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:02:08'),
(256,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:02:18'),
(257,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:02:28'),
(258,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 15:02:38'),
(259,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:02:38'),
(260,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:02:48'),
(261,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:02:58'),
(262,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:03:08'),
(263,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:03:18'),
(264,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:03:28'),
(265,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:03:38'),
(266,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:03:48'),
(267,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:03:58'),
(268,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:04:08'),
(269,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:04:18'),
(270,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:04:28'),
(271,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,15,'2026-08-28 15:04:38'),
(272,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:04:48'),
(273,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:04:58'),
(274,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:05:08'),
(275,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:05:18'),
(276,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:05:28'),
(277,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:05:38'),
(278,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:05:48'),
(279,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:05:58'),
(280,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:06:08'),
(281,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:06:18'),
(282,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 15:06:28'),
(283,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:06:38'),
(284,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:06:48'),
(285,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:06:58'),
(286,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:07:08'),
(287,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:07:18'),
(288,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:07:28'),
(289,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',3,'2026-08-28 15:07:38'),
(290,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:07:38'),
(291,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:07:48'),
(292,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:07:58'),
(293,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:08:08'),
(294,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:08:18'),
(295,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:08:28'),
(296,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:08:38'),
(297,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:08:48'),
(298,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 15:08:58'),
(299,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:09:08'),
(300,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:09:18'),
(301,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:09:28'),
(302,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:09:38'),
(303,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:09:48'),
(304,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:09:58'),
(305,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:10:08'),
(306,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:10:18'),
(307,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:10:28'),
(308,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:10:39'),
(309,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:10:48'),
(310,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:10:58'),
(311,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:11:08'),
(312,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:11:18'),
(313,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:11:28'),
(314,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:11:38'),
(315,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:11:48'),
(316,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:11:58'),
(317,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:12:08'),
(318,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:12:18'),
(319,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:12:28'),
(320,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 15:12:38'),
(321,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:12:38'),
(322,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:12:48'),
(323,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:12:58'),
(324,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:13:08'),
(325,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 15:13:18'),
(326,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:13:28'),
(327,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:13:38'),
(328,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:13:48'),
(329,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 15:13:58'),
(330,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:14:08'),
(331,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:14:18'),
(332,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:14:28'),
(333,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:14:38'),
(334,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:14:48'),
(335,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:14:58'),
(336,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:15:08'),
(337,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:15:18'),
(338,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:15:28'),
(339,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:15:38'),
(340,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:15:48'),
(341,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:15:58'),
(342,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:16:08'),
(343,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:16:18'),
(344,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:16:28'),
(345,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:16:38'),
(346,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:16:48'),
(347,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:16:58'),
(348,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:17:08'),
(349,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:17:18'),
(350,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:17:28'),
(351,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',43,'2026-08-28 15:17:38'),
(352,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:17:38'),
(353,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:17:48'),
(354,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:17:58'),
(355,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:18:08'),
(356,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:18:18'),
(357,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:18:28'),
(358,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:18:38'),
(359,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:18:48'),
(360,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:18:58'),
(361,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:19:08'),
(362,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:19:18'),
(363,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:19:28'),
(364,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:19:38'),
(365,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:19:48'),
(366,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:19:58'),
(367,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:20:08'),
(368,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:20:18'),
(369,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:20:28'),
(370,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:20:38'),
(371,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:20:48'),
(372,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:20:58'),
(373,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:21:08'),
(374,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:21:18'),
(375,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:21:28'),
(376,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:21:38'),
(377,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:21:48'),
(378,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 15:21:58'),
(379,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:22:08'),
(380,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:22:18'),
(381,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:22:28'),
(382,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',1,'2026-08-28 15:22:38'),
(383,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:22:38'),
(384,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:22:48'),
(385,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:22:58'),
(386,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:23:08'),
(387,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:23:18'),
(388,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:23:28'),
(389,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:23:38'),
(390,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:23:48'),
(391,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:23:58'),
(392,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:24:08'),
(393,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:24:18'),
(394,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:24:28'),
(395,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:24:38'),
(396,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:24:48'),
(397,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:24:58'),
(398,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:25:08'),
(399,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:25:18'),
(400,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:25:28'),
(401,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:25:38'),
(402,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:25:48'),
(403,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:25:58'),
(404,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:26:08'),
(405,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:26:18'),
(406,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:26:28'),
(407,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:26:38'),
(408,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:26:48'),
(409,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:26:58'),
(410,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:27:08'),
(411,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:27:18'),
(412,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:27:28'),
(413,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 15:27:38'),
(414,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:27:38'),
(415,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:27:48'),
(416,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:27:58'),
(417,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:28:08'),
(418,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:28:18'),
(419,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:28:28'),
(420,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:28:38'),
(421,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:28:48'),
(422,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:28:58'),
(423,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 15:29:08'),
(424,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:29:18'),
(425,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:29:28'),
(426,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:29:38'),
(427,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:29:48'),
(428,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:29:58'),
(429,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:30:08'),
(430,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:30:18'),
(431,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:30:28'),
(432,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:30:38'),
(433,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:30:48'),
(434,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:30:58'),
(435,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:31:08'),
(436,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:31:18'),
(437,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:31:28'),
(438,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:31:38'),
(439,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:31:48'),
(440,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:31:58'),
(441,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:32:08'),
(442,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:32:18'),
(443,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:32:28'),
(444,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',31,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',64,'2026-08-28 15:32:38'),
(445,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:32:38'),
(446,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:32:48'),
(447,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:32:58'),
(448,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:33:08'),
(449,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:33:18'),
(450,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:33:28'),
(451,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:33:38'),
(452,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:33:48'),
(453,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:33:58'),
(454,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:34:08'),
(455,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:34:18'),
(456,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:34:28'),
(457,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:34:38'),
(458,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:34:48'),
(459,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:34:58'),
(460,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:35:08'),
(461,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:35:18'),
(462,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:35:28'),
(463,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:35:38'),
(464,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:35:48'),
(465,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:35:58'),
(466,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:36:08'),
(467,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:36:18'),
(468,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:36:28'),
(469,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:36:38'),
(470,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:36:48'),
(471,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:36:58'),
(472,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:37:08'),
(473,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,22,'2026-08-28 15:37:18'),
(474,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:37:28'),
(475,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:37:38'),
(476,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',1,'2026-08-28 15:37:48'),
(477,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:37:48'),
(478,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:37:58'),
(479,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:38:08'),
(480,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:38:18'),
(481,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:38:28'),
(482,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:38:38'),
(483,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:38:48'),
(484,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:38:58'),
(485,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:39:08'),
(486,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:39:18'),
(487,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:39:28'),
(488,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:39:38'),
(489,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:39:48'),
(490,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:39:58'),
(491,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:40:08'),
(492,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:40:18'),
(493,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:40:28'),
(494,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:40:38'),
(495,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:40:48'),
(496,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:40:58'),
(497,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:41:08'),
(498,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:41:18'),
(499,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:41:28'),
(500,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:41:38'),
(501,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:41:48'),
(502,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:41:58'),
(503,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:42:08'),
(504,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:42:18'),
(505,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:42:28'),
(506,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:42:38'),
(507,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 15:42:48'),
(508,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:42:48'),
(509,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:42:58'),
(510,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:43:08'),
(511,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:43:18'),
(512,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:43:28'),
(513,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:43:38'),
(514,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:43:48'),
(515,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:43:58'),
(516,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:44:08'),
(517,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:44:18'),
(518,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:44:28'),
(519,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:44:38'),
(520,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:44:48'),
(521,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:44:58'),
(522,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:45:08'),
(523,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:45:18'),
(524,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:45:28'),
(525,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:45:38'),
(526,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:45:48'),
(527,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:45:58'),
(528,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:46:08'),
(529,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:46:18'),
(530,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:46:28'),
(531,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:46:38'),
(532,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:46:48'),
(533,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:46:58'),
(534,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:47:08'),
(535,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:47:18'),
(536,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:47:28'),
(537,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:47:38'),
(538,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',31,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',39,'2026-08-28 15:47:48'),
(539,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:47:48'),
(540,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:47:58'),
(541,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:48:08'),
(542,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:48:18'),
(543,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:48:28'),
(544,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:48:38'),
(545,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:48:48'),
(546,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:48:58'),
(547,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:49:08'),
(548,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:49:18'),
(549,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:49:28'),
(550,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:49:38'),
(551,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:49:48'),
(552,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:49:58'),
(553,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:50:08'),
(554,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:50:18'),
(555,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:50:28'),
(556,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:50:38'),
(557,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:50:48'),
(558,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:50:58'),
(559,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:51:08'),
(560,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 15:51:18'),
(561,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:51:28'),
(562,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:51:38'),
(563,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:51:48'),
(564,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:51:58'),
(565,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:52:08'),
(566,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:52:18'),
(567,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:52:28'),
(568,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:52:38'),
(569,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:52:48'),
(570,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 15:52:58'),
(571,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:52:58'),
(572,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:53:08'),
(573,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:53:18'),
(574,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:53:28'),
(575,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:53:38'),
(576,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:53:48'),
(577,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:53:58'),
(578,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:54:08'),
(579,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:54:18'),
(580,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 15:54:28'),
(581,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:54:38'),
(582,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:54:48'),
(583,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:54:58'),
(584,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:55:08'),
(585,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 15:55:18'),
(586,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:55:28'),
(587,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:55:38'),
(588,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:55:48'),
(589,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:55:58'),
(590,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:56:08'),
(591,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:56:18'),
(592,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:56:28'),
(593,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:56:38'),
(594,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:56:48'),
(595,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 15:56:58'),
(596,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:57:08'),
(597,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:57:18'),
(598,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:57:28'),
(599,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:57:38'),
(600,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:57:48'),
(601,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',4,'2026-08-28 15:57:58'),
(602,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:57:58'),
(603,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 15:58:08'),
(604,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 15:58:18'),
(605,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 15:58:28'),
(606,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 15:58:38'),
(607,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:58:48'),
(608,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 15:58:58'),
(609,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 15:59:08'),
(610,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:59:18'),
(611,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 15:59:28'),
(612,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 15:59:38'),
(613,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 15:59:48'),
(614,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 15:59:58'),
(615,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 16:00:08'),
(616,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:00:18'),
(617,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-28 16:00:28'),
(618,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 16:00:38'),
(619,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:00:48'),
(620,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 16:00:58'),
(621,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:01:08'),
(622,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:01:18'),
(623,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:01:28'),
(624,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 16:01:38'),
(625,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:01:48'),
(626,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:01:58'),
(627,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:02:08'),
(628,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:02:18'),
(629,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 16:02:28'),
(630,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 16:02:38'),
(631,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:02:48'),
(632,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',31,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',82,'2026-08-28 16:02:58'),
(633,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 16:02:58'),
(634,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 16:03:08'),
(635,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:03:18'),
(636,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:03:28'),
(637,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 16:03:38'),
(638,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:03:48'),
(639,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:03:58'),
(640,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:04:08'),
(641,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 16:04:18'),
(642,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:04:28'),
(643,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:04:38'),
(644,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:04:48'),
(645,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 16:04:58'),
(646,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:05:08'),
(647,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:05:18'),
(648,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-28 16:05:28'),
(649,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 16:05:38'),
(650,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:05:48'),
(651,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 16:05:58'),
(652,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:06:08'),
(653,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:06:18'),
(654,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,13,'2026-08-28 16:06:28'),
(655,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:06:38'),
(656,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:06:48'),
(657,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:06:58'),
(658,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 16:07:08'),
(659,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:07:18'),
(660,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:07:28'),
(661,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 16:07:38'),
(662,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 16:07:48'),
(663,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,2,'2026-08-28 16:07:58'),
(664,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',3,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 16:08:08'),
(665,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:08:08'),
(666,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 16:08:18'),
(667,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 16:08:28'),
(668,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 16:08:36'),
(669,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aS1RIGxhKodGJW7zIk3USXzOMM2i65q0',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,15,'2026-08-28 16:08:36'),
(670,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 16:08:41'),
(671,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,237,'2026-08-28 16:08:41'),
(672,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',17,'2026-08-28 16:08:41'),
(673,NULL,NULL,NULL,'GET','/pos/:id_pedido','/pos/14','Consultar Punto de venta','Punto de venta','14','Punto de Venta','LECTURA','INFO','Dbk_Y696g0IEc4CSq56wNnar1N8LwKD5',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',3,'2026-08-28 16:09:19'),
(674,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','Dbk_Y696g0IEc4CSq56wNnar1N8LwKD5',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 16:09:19'),
(675,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','11','Autenticación','AUTENTICACION','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 16:09:30'),
(676,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,2,'2026-08-28 16:09:30'),
(677,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 16:09:30'),
(678,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,18,'2026-08-28 16:09:30'),
(679,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',51,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',8,'2026-08-28 16:09:30'),
(680,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":26}}',28,'2026-08-28 16:09:33'),
(681,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',119,'2026-08-28 16:09:33'),
(682,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,17,'2026-08-28 16:09:57'),
(683,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":25}}',117,'2026-08-28 16:09:59'),
(684,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/15','Consultar Punto de venta','Punto de venta','15','Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',109,'2026-08-28 16:09:59'),
(685,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"15\",\"id_mesa\":25,\"items\":[{\"id\":\"107\",\"nombre\":\"Agua Natural\",\"precio\":320,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false},{\"id\":\"89\",\"nombre\":\"Arroz Frito Especial\",\"precio\":2550,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false}]}}',144,'2026-08-28 16:10:13'),
(686,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/15','Registrar Punto de venta','Punto de venta','15','Punto de Venta','ESCRITURA','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',62,'2026-08-28 16:10:25'),
(687,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/15','Emitir pre-cuenta para impresión','Pre-cuenta','15','Punto de Venta','IMPRESION','AVISO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',106,'2026-08-28 16:10:32'),
(688,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/15','Consultar Punto de venta','Punto de venta','15','Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',110,'2026-08-28 16:10:37'),
(689,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,19,'2026-08-28 16:10:54'),
(690,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 16:13:42'),
(691,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 16:14:31'),
(692,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',15,'2026-08-28 16:18:42'),
(693,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',16,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 16:19:35'),
(694,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',89,'2026-08-28 16:23:42'),
(695,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 16:25:10'),
(696,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',8,'2026-08-28 16:28:42'),
(697,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 16:31:10'),
(698,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 16:33:42'),
(699,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',78,'2026-08-28 16:36:10'),
(700,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-28 16:38:42'),
(701,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 16:42:10'),
(702,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',13,'2026-08-28 16:43:42'),
(703,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 16:47:10'),
(704,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',31,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',63,'2026-08-28 16:48:42'),
(705,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',58,'2026-08-28 16:53:10'),
(706,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',24,'2026-08-28 16:53:52'),
(707,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gfsvVdFGyTeH0CKgJ8HZrSIOyYKwHvwz',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',19,'2026-08-28 16:58:52'),
(708,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lRvRdeXaBZ2Amjkgq80DIUwzrIp1vEjz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 16:59:10'),
(709,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','tPAna3I3kqeoydFaO2a1q6zA21zFFALk',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',217,'2026-08-28 17:02:32'),
(710,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','tPAna3I3kqeoydFaO2a1q6zA21zFFALk',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,52,'2026-08-28 17:02:32'),
(711,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OavgStjKDTeXWepN8u8PasqDrdGGNMMl',2,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',184,'2026-08-28 17:03:10'),
(712,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',31,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-28 17:03:12'),
(713,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,23,'2026-08-28 17:03:12'),
(714,NULL,NULL,NULL,'GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OavgStjKDTeXWepN8u8PasqDrdGGNMMl',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,16,'2026-08-28 17:03:12'),
(715,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','OavgStjKDTeXWepN8u8PasqDrdGGNMMl',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,10,'2026-08-28 17:03:12'),
(716,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','11','Autenticación','AUTENTICACION','AVISO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 17:03:21'),
(717,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-28 17:03:21'),
(718,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,6,'2026-08-28 17:03:21'),
(719,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,28,'2026-08-28 17:03:21'),
(720,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',25,'2026-08-28 17:03:21'),
(721,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,9,'2026-08-28 17:03:22'),
(722,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',210,'2026-08-28 17:03:25'),
(723,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:03:32'),
(724,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:03:42'),
(725,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:03:52'),
(726,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:04:02'),
(727,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:04:12'),
(728,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:04:22'),
(729,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 17:04:32'),
(730,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:04:42'),
(731,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 17:04:52'),
(732,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:05:02'),
(733,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:05:12'),
(734,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:05:22'),
(735,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:05:32'),
(736,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:05:42'),
(737,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:05:52'),
(738,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:06:02'),
(739,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:06:12'),
(740,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:06:22'),
(741,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 17:06:32'),
(742,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:06:42'),
(743,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:06:52'),
(744,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:07:02'),
(745,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:07:12'),
(746,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:07:22'),
(747,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:07:32'),
(748,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:07:42'),
(749,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:07:52'),
(750,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:08:02'),
(751,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:08:12'),
(752,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',30,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',2,'2026-08-28 17:08:22'),
(753,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:08:22'),
(754,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 17:08:32'),
(755,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:08:42'),
(756,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:08:52'),
(757,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:09:02'),
(758,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:09:12'),
(759,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:09:22'),
(760,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:09:32'),
(761,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 17:09:42'),
(762,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:09:52'),
(763,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:10:02'),
(764,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:10:12'),
(765,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:10:22'),
(766,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:10:32'),
(767,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:10:42'),
(768,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 17:10:52'),
(769,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:11:02'),
(770,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:11:12'),
(771,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:11:22'),
(772,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:11:32'),
(773,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:11:42'),
(774,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:11:52'),
(775,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:12:02'),
(776,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 17:12:12'),
(777,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:12:22'),
(778,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"13\",\"id_mesa\":26,\"items\":[{\"id\":\"65\",\"nombre\":\"Aporreado de Ternera\",\"precio\":4100,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false}]}}',186,'2026-08-28 17:12:23'),
(779,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/13','Emitir pre-cuenta para impresión','Pre-cuenta','13','Punto de Venta','IMPRESION','AVISO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',101,'2026-08-28 17:12:27'),
(780,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',130,'2026-08-28 17:12:30'),
(781,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:12:32'),
(782,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/13','Registrar Punto de venta','Punto de venta','13','Punto de Venta','ESCRITURA','AVISO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',63,'2026-08-28 17:12:37'),
(783,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/13','Emitir pre-cuenta para impresión','Pre-cuenta','13','Punto de Venta','IMPRESION','AVISO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',34,'2026-08-28 17:12:40'),
(784,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,5,'2026-08-28 17:12:42'),
(785,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/13','Consultar Punto de venta','Punto de venta','13','Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"13\"}}',110,'2026-08-28 17:12:43'),
(786,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,12,'2026-08-28 17:12:47'),
(787,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-28 17:12:52'),
(788,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/13','Cobrar y cerrar cuenta','Cuenta','13','Caja','CIERRE','CRITICO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":9000,\"monto_equivalente_local\":9000,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"13\"}}',174,'2026-08-28 17:12:56'),
(789,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,36,'2026-08-28 17:12:58'),
(790,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',22,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 17:12:58'),
(791,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:13:02'),
(792,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,3,'2026-08-28 17:13:12'),
(793,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 17:13:14'),
(794,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','aBhVgbDQM5eNHGmShMwUtyz-5ftvxJph',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-28 17:13:14'),
(795,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 17:13:20'),
(796,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,43,'2026-08-28 17:13:20'),
(797,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',2,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',28,'2026-08-28 17:13:20'),
(798,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,98,'2026-08-28 17:13:33'),
(799,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?accion=&categoria=&severidad=&modulo=&entidad=Comanda&usuarioId=&rol=&desde=&hasta=','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"accion\":\"\",\"categoria\":\"\",\"severidad\":\"\",\"modulo\":\"\",\"entidad\":\"Comanda\",\"usuarioId\":\"\",\"rol\":\"\",\"desde\":\"\",\"hasta\":\"\"}}',54,'2026-08-28 17:14:14'),
(800,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',13,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 17:18:10'),
(801,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,83,'2026-08-28 17:22:33'),
(802,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',30,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',27,'2026-08-28 17:22:34'),
(803,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',13,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-28 17:23:11'),
(804,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/15','Consultar Punto de venta','Punto de venta','15','Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',150,'2026-08-28 17:25:30'),
(805,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,6,'2026-08-28 17:25:35'),
(806,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/15','Consultar Punto de venta','Punto de venta','15','Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',182,'2026-08-28 17:25:53'),
(807,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,6,'2026-08-28 17:25:55'),
(808,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,69,'2026-08-28 17:26:42'),
(809,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',32,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 17:27:35'),
(810,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,7,'2026-08-28 17:28:06'),
(811,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/15','Cobrar y cerrar cuenta','Cuenta','15','Caja','CIERRE','CRITICO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":2,\"codigo_moneda\":\"USD\",\"factor_cambio_aplicado\":660,\"monto_moneda_origen\":5,\"monto_equivalente_local\":3300,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"15\"}}',132,'2026-08-28 17:28:27'),
(812,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,38,'2026-08-28 17:28:30'),
(813,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',20,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 17:28:30'),
(814,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 17:29:15'),
(815,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,3,'2026-08-28 17:29:15'),
(816,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,3,'2026-08-28 17:29:15'),
(817,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,25,'2026-08-28 17:29:15'),
(818,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',64,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 17:29:18'),
(819,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',15,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-28 17:32:44'),
(820,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/14','Consultar Punto de venta','Punto de venta','14','Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',254,'2026-08-28 17:33:30'),
(821,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"cuerpo\":{\"id_pedido\":\"14\",\"id_mesa\":27,\"items\":[{\"id\":\"65\",\"nombre\":\"Aporreado de Ternera\",\"precio\":4100,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false},{\"id\":\"158\",\"nombre\":\"Aceituna,Cebolla y Pimiento\",\"precio\":1,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false},{\"id\":\"107\",\"nombre\":\"Agua Natural\",\"precio\":320,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false},{\"id\":\"91\",\"nombre\":\"Arroz Blanco\",\"precio\":300,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false}]}}',190,'2026-08-28 17:33:52'),
(822,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/14','Registrar Punto de venta','Punto de venta','14','Punto de Venta','ESCRITURA','AVISO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',88,'2026-08-28 17:33:58'),
(823,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-28 17:34:10'),
(824,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/14','Emitir pre-cuenta para impresión','Pre-cuenta','14','Punto de Venta','IMPRESION','AVISO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',59,'2026-08-28 17:34:25'),
(825,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/14','Consultar Punto de venta','Punto de venta','14','Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"parametros_ruta\":{\"id_pedido\":\"14\"}}',85,'2026-08-28 17:34:30'),
(826,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,7,'2026-08-28 17:34:35'),
(827,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/14','Cobrar y cerrar cuenta','Cuenta','14','Caja','CIERRE','CRITICO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":5000,\"monto_equivalente_local\":5000,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"14\"}}',138,'2026-08-28 17:34:51'),
(828,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0',NULL,24,'2026-08-28 17:34:53'),
(829,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',24,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-28 17:34:55'),
(830,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,35,'2026-08-28 17:35:03'),
(831,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,33,'2026-08-28 17:35:07'),
(832,3,'Willian Portilla Torriente','superadministrador','GET','/pos/precuenta/:id_pedido','/pos/precuenta/15','Emitir pre-cuenta para impresión','Pre-cuenta','15','Punto de Venta','IMPRESION','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',91,'2026-08-28 17:37:16'),
(833,3,'Willian Portilla Torriente','superadministrador','GET','/pos/:id_pedido','/pos/15','Consultar Punto de venta','Punto de venta','15','Punto de Venta','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id_pedido\":\"15\"}}',83,'2026-08-28 17:37:34'),
(834,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,37,'2026-08-28 17:37:41'),
(835,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,27,'2026-08-28 17:37:44'),
(836,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',511,'2026-08-28 17:39:10'),
(837,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,32,'2026-08-28 17:39:40'),
(838,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket','/admin/cierre-dia/ticket','Emitir ticket de cierre de día','Ticket de cierre',NULL,'Caja','IMPRESION','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,19,'2026-08-28 17:39:55'),
(839,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 17:40:10'),
(840,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',131,'2026-08-28 17:45:10'),
(841,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',157,'2026-08-28 17:45:10'),
(842,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 17:51:10'),
(843,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',13,'2026-08-28 17:51:10'),
(844,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',117,'2026-08-28 17:56:10'),
(845,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',124,'2026-08-28 17:56:10'),
(846,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','lp1re9J8cHACTRcEz-KWfJgUeR9zdibN',2,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',223,'2026-08-28 18:02:10'),
(847,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',172,'2026-08-28 18:02:10'),
(848,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','8uPl50Qj9O4Gq3H87XhOHoGHdS0OndDa',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',86,'2026-08-28 18:04:10'),
(849,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',32,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',64,'2026-08-28 18:08:10'),
(850,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','8uPl50Qj9O4Gq3H87XhOHoGHdS0OndDa',4,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',484,'2026-08-28 18:09:10'),
(851,NULL,NULL,NULL,'GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','8uPl50Qj9O4Gq3H87XhOHoGHdS0OndDa',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,11,'2026-08-28 18:10:46'),
(852,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','8uPl50Qj9O4Gq3H87XhOHoGHdS0OndDa',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,9,'2026-08-28 18:10:46'),
(853,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,52,'2026-08-28 18:11:02'),
(854,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 18:11:21'),
(855,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-28 18:11:21'),
(856,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-28 18:11:21'),
(857,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,27,'2026-08-28 18:11:22'),
(858,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":27}}',140,'2026-08-28 18:13:04'),
(859,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/16','Consultar Punto de venta','Punto de venta','16','Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"16\"}}',218,'2026-08-28 18:13:04'),
(860,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,43,'2026-08-28 18:13:10'),
(861,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','xdixZYcw0bvFfDc54-7OQ0sOW00v-v86',10,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',21,'2026-08-28 18:13:11'),
(862,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','VyhEekDozQ1zym6v8fRMCUZblS7AhH29',2,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',4,'2026-08-28 18:13:22'),
(863,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','VyhEekDozQ1zym6v8fRMCUZblS7AhH29',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 18:13:22'),
(864,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','VyhEekDozQ1zym6v8fRMCUZblS7AhH29',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 18:13:32'),
(865,NULL,NULL,NULL,'GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','VyhEekDozQ1zym6v8fRMCUZblS7AhH29',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-28 18:13:39'),
(866,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','VyhEekDozQ1zym6v8fRMCUZblS7AhH29',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 18:13:39'),
(867,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 18:13:47'),
(868,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,47,'2026-08-28 18:13:47'),
(869,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,143,'2026-08-28 18:13:53'),
(870,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','7xDWcAIYBPX3oIvNXCQBhbZv5LcCnfu-',14,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 18:14:10'),
(871,3,'Willian Portilla Torriente','superadministrador','POST','/admin/menu/platillo-dia/crear','/admin/menu/platillo-dia/crear','Crear Platillo del día','Platillo del día',NULL,'Menú','ESCRITURA','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"tipo\":\"COMESTIBLES\",\"nombre\":\"Pizza Napolitana Especial\",\"descripcion\":\"Super rica!!\",\"precio\":\"1200\",\"precio_alt\":\"1400\",\"precio_usd\":\"4\"}}',780,'2026-08-28 18:15:28'),
(872,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,79,'2026-08-28 18:15:30'),
(873,3,'Willian Portilla Torriente','superadministrador','POST','/admin/menu/platillo-dia/crear','/admin/menu/platillo-dia/crear','Crear Platillo del día','Platillo del día',NULL,'Menú','ESCRITURA','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"tipo\":\"BEBIDAS\",\"nombre\":\"Trago lolita\",\"descripcion\":\"Un trago exotico!!\",\"precio\":\"500\",\"precio_alt\":\"650\",\"precio_usd\":\"3\"}}',173,'2026-08-28 18:16:51'),
(874,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,92,'2026-08-28 18:16:54'),
(875,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/16','Consultar Punto de venta','Punto de venta','16','Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"16\"}}',320,'2026-08-28 18:17:23'),
(876,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"16\",\"id_mesa\":27,\"items\":[{\"id\":\"4\",\"nombre\":\"Pizza Napolitana Especial\",\"precio\":1200,\"cantidad\":1,\"notas\":\"Para compartir\",\"es_platillo_dia\":true},{\"id\":\"5\",\"nombre\":\"Trago lolita\",\"precio\":500,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":true}]}}',274,'2026-08-28 18:17:52'),
(877,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/16','Registrar Punto de venta','Punto de venta','16','Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"16\"}}',435,'2026-08-28 18:18:06'),
(878,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,8,'2026-08-28 18:18:09'),
(879,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',4,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',17,'2026-08-28 18:18:20'),
(880,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/16','Cobrar y cerrar cuenta','Cuenta','16','Caja','CIERRE','CRITICO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":5000,\"monto_equivalente_local\":5000,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":0,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"16\"}}',240,'2026-08-28 18:18:35'),
(881,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,38,'2026-08-28 18:18:37'),
(882,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,129,'2026-08-28 18:18:53'),
(883,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,40,'2026-08-28 18:19:04'),
(884,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',38,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 18:19:10'),
(885,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket-pedido/16','/admin/cierre-dia/ticket-pedido/16','Consultar /admin/cierre-dia/ticket-pedido/16',NULL,'16','Otros','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,404,0,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',12,'2026-08-28 18:19:29'),
(886,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket','/admin/cierre-dia/ticket','Emitir ticket de cierre de día','Ticket de cierre',NULL,'Caja','IMPRESION','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,29,'2026-08-28 18:21:39'),
(887,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,33,'2026-08-28 18:21:59'),
(888,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,54,'2026-08-28 18:22:01'),
(889,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":28}}',184,'2026-08-28 18:22:16'),
(890,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/17','Consultar Punto de venta','Punto de venta','17','Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"17\"}}',160,'2026-08-28 18:22:16'),
(891,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"17\",\"id_mesa\":28,\"items\":[{\"id\":\"5\",\"nombre\":\"Trago lolita\",\"precio\":500,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":true},{\"id\":\"4\",\"nombre\":\"Pizza Napolitana Especial\",\"precio\":1200,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":true}]}}',153,'2026-08-28 18:22:24'),
(892,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/17','Registrar Punto de venta','Punto de venta','17','Punto de Venta','ESCRITURA','AVISO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"17\"}}',139,'2026-08-28 18:22:28'),
(893,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,9,'2026-08-28 18:22:45'),
(894,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/17','Cobrar y cerrar cuenta','Cuenta','17','Caja','CIERRE','CRITICO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":2000,\"monto_equivalente_local\":2000,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":250,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"17\"}}',268,'2026-08-28 18:23:53'),
(895,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,39,'2026-08-28 18:23:56'),
(896,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,58,'2026-08-28 18:24:01'),
(897,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',28,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 18:24:13'),
(898,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket-pedido/17','/admin/cierre-dia/ticket-pedido/17','Consultar /admin/cierre-dia/ticket-pedido/17',NULL,'17','Otros','LECTURA','INFO','Piia6DDm_sUBj97j9DdGZk0p9tSRdAYD',1,404,0,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',13,'2026-08-28 18:27:03'),
(899,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',14,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',106,'2026-08-28 18:29:13'),
(900,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aSVaunnpgJnudclGFjocRMFPsk_6sXSk',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-28 18:30:10'),
(901,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','eFZNSBBPL_m7uX8h-IgkjmpUvRYSU9t3',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',148,'2026-08-28 18:35:10'),
(902,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','aSVaunnpgJnudclGFjocRMFPsk_6sXSk',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',222,'2026-08-28 18:35:10'),
(903,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','eRFNCfOpaRL0T8JiJTtgLMM-MIYdv6zO',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',175,'2026-08-28 18:40:06'),
(904,NULL,NULL,NULL,'GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','eRFNCfOpaRL0T8JiJTtgLMM-MIYdv6zO',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,32,'2026-08-28 18:40:07'),
(905,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','eRFNCfOpaRL0T8JiJTtgLMM-MIYdv6zO',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,14,'2026-08-28 18:40:07'),
(906,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 18:40:20'),
(907,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 18:40:20'),
(908,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-28 18:40:20'),
(909,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,27,'2026-08-28 18:40:20'),
(910,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',19,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',16,'2026-08-28 18:40:21'),
(911,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":28}}',516,'2026-08-28 18:40:23'),
(912,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/18','Consultar Punto de venta','Punto de venta','18','Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"18\"}}',355,'2026-08-28 18:40:24'),
(913,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"18\",\"id_mesa\":28,\"items\":[{\"id\":\"4\",\"nombre\":\"Pizza Napolitana Especial\",\"precio\":1200,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":true},{\"id\":\"107\",\"nombre\":\"Agua Natural\",\"precio\":320,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',129,'2026-08-28 18:40:34'),
(914,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/18','Registrar Punto de venta','Punto de venta','18','Punto de Venta','ESCRITURA','AVISO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"18\"}}',67,'2026-08-28 18:40:39'),
(915,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,12,'2026-08-28 18:40:44'),
(916,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/18','Cobrar y cerrar cuenta','Cuenta','18','Caja','CIERRE','CRITICO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":2000,\"monto_equivalente_local\":2000,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":100,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"18\"}}',113,'2026-08-28 18:41:13'),
(917,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,33,'2026-08-28 18:41:15'),
(918,NULL,NULL,NULL,'GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','SFKDgIbgO5kb0XS32yDnd2zuXZQFM0tP',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,17,'2026-08-28 18:41:19'),
(919,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','SFKDgIbgO5kb0XS32yDnd2zuXZQFM0tP',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,6,'2026-08-28 18:41:19'),
(920,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 18:41:24'),
(921,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,82,'2026-08-28 18:41:24'),
(922,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',3,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',24,'2026-08-28 18:41:25'),
(923,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,40,'2026-08-28 18:41:26'),
(924,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,34,'2026-08-28 18:41:29'),
(925,3,'Willian Portilla Torriente','superadministrador','POST','/admin/turno/cierre','/admin/turno/cierre','Cerrar turno de servicio','Turno de servicio',NULL,'Turnos','CIERRE','CRITICO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"monto_cierre_real\":26300,\"observaciones_cierre\":\"\"}}',85,'2026-08-28 18:42:59'),
(926,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,40,'2026-08-28 18:43:02'),
(927,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,400,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 18:43:10'),
(928,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','-1TmNorq71Kw2IeMvmpDGXiNCqTh7cUc',1,400,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',4,'2026-08-28 18:43:10'),
(929,3,'Willian Portilla Torriente','superadministrador','POST','/admin/turno/apertura','/admin/turno/apertura','Abrir turno de servicio','Turno de servicio',NULL,'Turnos','ESCRITURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"monto_apertura\":8000,\"observaciones\":\"\",\"monedas_turno\":[{\"moneda_id\":1,\"factor_cambio_turno\":1},{\"moneda_id\":3,\"factor_cambio_turno\":443.16},{\"moneda_id\":5,\"factor_cambio_turno\":785},{\"moneda_id\":6,\"factor_cambio_turno\":780.23},{\"moneda_id\":4,\"factor_cambio_turno\":1.37},{\"moneda_id\":2,\"factor_cambio_turno\":660},{\"moneda_id\":7,\"factor_cambio_turno\":660}]}}',211,'2026-08-28 18:43:14'),
(930,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,35,'2026-08-28 18:43:16'),
(931,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,31,'2026-08-28 18:43:21'),
(932,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,22,'2026-08-28 18:43:27'),
(933,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierres-historico','/admin/cierres-historico','Consultar Cierre de día','Cierre de día',NULL,'Caja','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,108,'2026-08-28 18:43:29'),
(934,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/cierres-historico/:id','/admin/api/cierres-historico/6','Consultar /admin/api/cierres-historico/6',NULL,'6','Otros','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"6\"},\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',20,'2026-08-28 18:43:44'),
(935,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,36,'2026-08-28 18:44:12'),
(936,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,50,'2026-08-28 18:44:20'),
(937,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierres-historico','/admin/cierres-historico','Consultar Cierre de día','Cierre de día',NULL,'Caja','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,34,'2026-08-28 18:44:23'),
(938,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/cierres-historico/:id','/admin/api/cierres-historico/6','Consultar /admin/api/cierres-historico/6',NULL,'6','Otros','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"6\"},\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',13,'2026-08-28 18:44:29'),
(939,3,'Willian Portilla Torriente','superadministrador','GET','/admin/mesas','/admin/mesas','Consultar Mesa','Mesa',NULL,'Salón','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,51,'2026-08-28 18:44:57'),
(940,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,47,'2026-08-28 18:45:07'),
(941,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','-1TmNorq71Kw2IeMvmpDGXiNCqTh7cUc',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 18:45:10'),
(942,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,86,'2026-08-28 18:45:17'),
(943,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=1&categoria=ESCRITURA','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"1\",\"categoria\":\"ESCRITURA\"}}',167,'2026-08-28 18:45:27'),
(944,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',7,'2026-08-28 18:46:10'),
(945,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?accion=&categoria=ESCRITURA&severidad=&modulo=&entidad=Cuenta&usuarioId=&rol=&desde=&hasta=','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"accion\":\"\",\"categoria\":\"ESCRITURA\",\"severidad\":\"\",\"modulo\":\"\",\"entidad\":\"Cuenta\",\"usuarioId\":\"\",\"rol\":\"\",\"desde\":\"\",\"hasta\":\"\"}}',153,'2026-08-28 18:47:07'),
(946,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?accion=&categoria=&severidad=&modulo=&entidad=Cuenta&usuarioId=&rol=&desde=&hasta=','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"accion\":\"\",\"categoria\":\"\",\"severidad\":\"\",\"modulo\":\"\",\"entidad\":\"Cuenta\",\"usuarioId\":\"\",\"rol\":\"\",\"desde\":\"\",\"hasta\":\"\"}}',34,'2026-08-28 18:47:15'),
(947,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,42,'2026-08-28 18:48:15'),
(948,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,79,'2026-08-28 18:49:19'),
(949,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','-1TmNorq71Kw2IeMvmpDGXiNCqTh7cUc',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',6,'2026-08-28 18:50:10'),
(950,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',22,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',176,'2026-08-28 18:51:10'),
(951,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,92,'2026-08-28 18:53:06'),
(952,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/23','Consultar Producto','Producto','23','Inventario','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"23\"}}',47,'2026-08-28 18:53:23'),
(953,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','-1TmNorq71Kw2IeMvmpDGXiNCqTh7cUc',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',68,'2026-08-28 18:55:10'),
(954,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/editar/:id','/admin/productos/editar/23','Actualizar Producto','Producto','23','Inventario','ESCRITURA','AVISO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"193010008\",\"nombre\":\"Harina\",\"categoria_id\":\"6\",\"tipo\":\"materia_prima\",\"unidad_inventario_id\":\"3\",\"unidad_compra_id\":\"3\",\"unidad_consumo_id\":\"2\",\"stock_minimo\":\"25\",\"costo_promedio\":\"2500\",\"activo\":\"1\",\"permitida_venta\":\"0\"},\"parametros_ruta\":{\"id\":\"23\"}}',91,'2026-08-28 18:55:42'),
(955,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,43,'2026-08-28 18:55:45'),
(956,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/23','Consultar Producto','Producto','23','Inventario','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"23\"}}',10,'2026-08-28 18:55:58'),
(957,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',37,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',73,'2026-08-28 18:56:24'),
(958,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','-1TmNorq71Kw2IeMvmpDGXiNCqTh7cUc',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',238,'2026-08-28 19:00:10'),
(959,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','smDXMubDFJfNNfRtYy6Im4YPxafaCuUh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',5,'2026-08-28 19:02:10'),
(960,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','FnLvGyZ1VOPYsEIsl6UiLMk76v0pgHp5',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,110,'2026-08-28 19:03:32'),
(961,NULL,NULL,NULL,'GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','MJhRMXydYoOLiuBdDu3jqGMe4Zm1Wcoo',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,162,'2026-08-28 19:04:25'),
(962,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','MJhRMXydYoOLiuBdDu3jqGMe4Zm1Wcoo',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,19,'2026-08-28 19:04:25'),
(963,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 19:04:35'),
(964,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,89,'2026-08-28 19:04:35'),
(965,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',22,'2026-08-28 19:04:35'),
(966,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,60,'2026-08-28 19:04:39'),
(967,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9C5bLuh2plKaZKYQiZ71KADftS5AQsBS',10,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',18,'2026-08-28 19:05:10'),
(968,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9C5bLuh2plKaZKYQiZ71KADftS5AQsBS',11,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',120,'2026-08-28 19:10:10'),
(969,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/crear','/admin/productos/crear','Crear Producto','Producto',NULL,'Inventario','ESCRITURA','AVISO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"MAT-002\",\"nombre\":\"Levadura Seca\",\"categoria_id\":\"9\",\"tipo\":\"materia_prima\",\"unidad_inventario_id\":\"1\",\"unidad_compra_id\":\"1\",\"unidad_consumo_id\":\"2\",\"stock_minimo\":\"5\",\"costo_promedio\":\"1800\",\"activo\":\"1\",\"permitida_venta\":\"0\"}}',340,'2026-08-28 19:12:10'),
(970,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,46,'2026-08-28 19:12:12'),
(971,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/31','Consultar Producto','Producto','31','Inventario','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"31\"}}',11,'2026-08-28 19:12:45'),
(972,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sMoUNS-8s1YSvKILY8YABt0niQkXaPTb',11,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',96,'2026-08-28 19:15:10'),
(973,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sMoUNS-8s1YSvKILY8YABt0niQkXaPTb',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',251,'2026-08-28 19:21:10'),
(974,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/editar/:id','/admin/productos/editar/31','Actualizar Producto','Producto','31','Inventario','ESCRITURA','AVISO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"193050001\",\"nombre\":\"Sal\",\"categoria_id\":\"9\",\"tipo\":\"materia_prima\",\"unidad_inventario_id\":\"1\",\"unidad_compra_id\":\"1\",\"unidad_consumo_id\":\"2\",\"stock_minimo\":\"10\",\"costo_promedio\":\"350\",\"activo\":\"1\",\"permitida_venta\":\"0\"},\"parametros_ruta\":{\"id\":\"31\"}}',48,'2026-08-28 19:24:07'),
(975,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,36,'2026-08-28 19:24:09'),
(976,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC\",\"excludeId\":\"\"}}',9,'2026-08-28 19:25:11'),
(977,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-\",\"excludeId\":\"\"}}',6,'2026-08-28 19:25:12'),
(978,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-0&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-0\",\"excludeId\":\"\"}}',8,'2026-08-28 19:25:13'),
(979,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-02&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-02\",\"excludeId\":\"\"}}',3,'2026-08-28 19:25:15'),
(980,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-0&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-0\",\"excludeId\":\"\"}}',4,'2026-08-28 19:25:17'),
(981,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-01&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-01\",\"excludeId\":\"\"}}',5,'2026-08-28 19:25:17'),
(982,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-0&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-0\",\"excludeId\":\"\"}}',3,'2026-08-28 19:25:19'),
(983,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-01&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-01\",\"excludeId\":\"\"}}',4,'2026-08-28 19:25:21'),
(984,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/8','Consultar Receta / Ficha técnica','Receta / Ficha técnica','8','Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"8\"}}',13,'2026-08-28 19:25:29'),
(985,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=R&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"R\",\"excludeId\":\"\"}}',6,'2026-08-28 19:25:43'),
(986,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=RE&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"RE\",\"excludeId\":\"\"}}',5,'2026-08-28 19:25:43'),
(987,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC\",\"excludeId\":\"\"}}',4,'2026-08-28 19:25:45'),
(988,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-\",\"excludeId\":\"\"}}',3,'2026-08-28 19:25:46'),
(989,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-001&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-001\",\"excludeId\":\"\"}}',6,'2026-08-28 19:25:47'),
(990,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-00&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-00\",\"excludeId\":\"\"}}',6,'2026-08-28 19:25:49'),
(991,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-002&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-002\",\"excludeId\":\"\"}}',6,'2026-08-28 19:25:50'),
(992,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9C5bLuh2plKaZKYQiZ71KADftS5AQsBS',11,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',207,'2026-08-28 19:27:10'),
(993,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9C5bLuh2plKaZKYQiZ71KADftS5AQsBS',10,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',109,'2026-08-28 19:32:10'),
(994,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,85,'2026-08-28 19:35:05'),
(995,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC\",\"excludeId\":\"\"}}',195,'2026-08-28 19:35:16'),
(996,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-\",\"excludeId\":\"\"}}',4,'2026-08-28 19:35:16'),
(997,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-001&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-001\",\"excludeId\":\"\"}}',6,'2026-08-28 19:35:18'),
(998,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-00&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-00\",\"excludeId\":\"\"}}',5,'2026-08-28 19:35:19'),
(999,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-002&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-002\",\"excludeId\":\"\"}}',11,'2026-08-28 19:35:20'),
(1000,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,94,'2026-08-28 19:36:04'),
(1001,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sMoUNS-8s1YSvKILY8YABt0niQkXaPTb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',265,'2026-08-28 19:37:10'),
(1002,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-002&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-002\",\"excludeId\":\"\"}}',4,'2026-08-28 19:39:03'),
(1003,3,'Willian Portilla Torriente','superadministrador','POST','/admin/api/recetas','/admin/api/recetas','Registrar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','ESCRITURA','AVISO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"REC-002\",\"nombre\":\"Pizza Napolitana\",\"descripcion\":\"Pizza regular\",\"tipo\":\"PREPARACION_INTERNA\",\"platillo_id\":\"80\",\"rendimiento\":\"1.000\",\"unidad_rendimiento\":\"Unidad\",\"tiempo_preparacion_minutos\":\"15\",\"precio_sugerido\":\"1350\",\"detalles\":[{\"producto_id\":\"23\",\"cantidad_requerida\":\"590\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":1},{\"producto_id\":\"116\",\"cantidad_requerida\":\"1.75\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":2},{\"producto_id\":\"31\",\"cantidad_requerida\":\"12.5\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":3}],\"creada_por\":3}}',348,'2026-08-28 19:39:04'),
(1004,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,105,'2026-08-28 19:39:06'),
(1005,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/9','Consultar Receta / Ficha técnica','Receta / Ficha técnica','9','Recetas','LECTURA','INFO','dlIbMKajJ6kMArAK10W-PpDkBgwa_tzg',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"9\"}}',112,'2026-08-28 19:39:27'),
(1006,NULL,NULL,NULL,'GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/9','Consultar Receta / Ficha técnica','Receta / Ficha técnica','9','Recetas','LECTURA','INFO','7xXM8OVmw9siCCsMrkbf2ExA1ZuiaHBn',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"9\"}}',572,'2026-08-28 19:42:31'),
(1007,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','7xXM8OVmw9siCCsMrkbf2ExA1ZuiaHBn',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,25,'2026-08-28 19:42:31'),
(1008,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 19:42:39'),
(1009,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,135,'2026-08-28 19:42:39'),
(1010,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',2,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',35,'2026-08-28 19:42:39'),
(1011,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,85,'2026-08-28 19:42:51'),
(1012,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','WB2uVmxkkzFk9AM7-U0kjzluTLYqMyv_',11,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',40,'2026-08-28 19:43:10'),
(1013,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,105,'2026-08-28 19:43:15'),
(1014,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,285,'2026-08-28 19:43:42'),
(1015,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/8','Consultar Receta / Ficha técnica','Receta / Ficha técnica','8','Recetas','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"8\"}}',14,'2026-08-28 19:43:46'),
(1016,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/8','Consultar Receta / Ficha técnica','Receta / Ficha técnica','8','Recetas','LECTURA','INFO','csR9z3YG-mLuZyboKpAmqMBWi2-_BjJm',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"8\"}}',77,'2026-08-28 19:44:07'),
(1017,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','WB2uVmxkkzFk9AM7-U0kjzluTLYqMyv_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',8,'2026-08-28 19:48:10'),
(1018,NULL,NULL,NULL,'GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','tzORrcrUlGBIuwYUZrVDEZnBoI8NWod6',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,911,'2026-08-28 19:51:51'),
(1019,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','tzORrcrUlGBIuwYUZrVDEZnBoI8NWod6',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,26,'2026-08-28 19:51:52'),
(1020,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 19:51:58'),
(1021,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,126,'2026-08-28 19:51:58'),
(1022,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',41,'2026-08-28 19:51:59'),
(1023,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,68,'2026-08-28 19:52:07'),
(1024,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',11,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',41,'2026-08-28 19:52:10'),
(1025,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,43,'2026-08-28 19:52:34'),
(1026,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,68,'2026-08-28 19:52:46'),
(1027,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/8','Consultar Receta / Ficha técnica','Receta / Ficha técnica','8','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"8\"}}',1194,'2026-08-28 19:52:58'),
(1028,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/8','Consultar Receta / Ficha técnica','Receta / Ficha técnica','8','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"8\"}}',8,'2026-08-28 19:53:09'),
(1029,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9yZwbSF8SY23uoflVLDbMhp8W36f-6K6',9,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',24,'2026-08-28 19:57:10'),
(1030,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC\",\"excludeId\":\"\"}}',11,'2026-08-28 20:00:25'),
(1031,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-\",\"excludeId\":\"\"}}',7,'2026-08-28 20:00:26'),
(1032,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-001&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-001\",\"excludeId\":\"\"}}',7,'2026-08-28 20:00:28'),
(1033,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-002&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-002\",\"excludeId\":\"\"}}',8,'2026-08-28 20:00:30'),
(1034,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-00&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-00\",\"excludeId\":\"\"}}',5,'2026-08-28 20:00:30'),
(1035,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-003&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-003\",\"excludeId\":\"\"}}',8,'2026-08-28 20:00:32'),
(1036,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',1493,'2026-08-28 20:02:11'),
(1037,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,682,'2026-08-28 20:02:24'),
(1038,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC\",\"excludeId\":\"\"}}',11,'2026-08-28 20:02:40'),
(1039,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-\",\"excludeId\":\"\"}}',6,'2026-08-28 20:02:40'),
(1040,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-00&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-00\",\"excludeId\":\"\"}}',4,'2026-08-28 20:02:41'),
(1041,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-003&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-003\",\"excludeId\":\"\"}}',5,'2026-08-28 20:02:42'),
(1042,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-003&excludeId=','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-003\",\"excludeId\":\"\"}}',542,'2026-08-28 20:03:50'),
(1043,3,'Willian Portilla Torriente','superadministrador','POST','/admin/api/recetas','/admin/api/recetas','Registrar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','ESCRITURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"REC-003\",\"nombre\":\"Cafe Carajillo\",\"descripcion\":\"Cafe y brandy\",\"tipo\":\"VENTA\",\"platillo_id\":\"12\",\"rendimiento\":\"1.000\",\"unidad_rendimiento\":\"Unidad\",\"tiempo_preparacion_minutos\":\"5\",\"precio_sugerido\":\"350\",\"detalles\":[{\"producto_id\":\"73\",\"cantidad_requerida\":\"5\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":1},{\"producto_id\":\"70\",\"cantidad_requerida\":\"15\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":2}],\"creada_por\":3}}',451,'2026-08-28 20:03:51'),
(1044,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,57,'2026-08-28 20:03:53'),
(1045,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/crear','/admin/productos/crear','Crear Producto','Producto',NULL,'Inventario','ESCRITURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"PROD-003\",\"nombre\":\"Brandy\",\"categoria_id\":\"4\",\"tipo\":\"producto_venta\",\"unidad_inventario_id\":\"10\",\"unidad_compra_id\":\"10\",\"unidad_consumo_id\":\"5\",\"stock_minimo\":\"5\",\"costo_promedio\":\"8000\",\"activo\":\"1\",\"permitida_venta\":\"1\"}}',109,'2026-08-28 20:04:11'),
(1046,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,68,'2026-08-28 20:04:13'),
(1047,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,50,'2026-08-28 20:04:15'),
(1048,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',9,'2026-08-28 20:04:19'),
(1049,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/check-codigo','/admin/api/recetas/check-codigo?codigo=REC-003&excludeId=10','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"codigo\":\"REC-003\",\"excludeId\":\"10\"}}',12,'2026-08-28 20:04:44'),
(1050,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/recetas/:id','/admin/api/recetas/10','Actualizar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','ESCRITURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"REC-003\",\"nombre\":\"Cafe Carajillo\",\"descripcion\":\"Cafe y brandy\",\"tipo\":\"VENTA\",\"platillo_id\":\"12\",\"rendimiento\":\"1.000\",\"unidad_rendimiento\":\"Unidad\",\"tiempo_preparacion_minutos\":\"5\",\"precio_sugerido\":\"350.0000\",\"detalles\":[{\"producto_id\":\"73\",\"cantidad_requerida\":\"5.0000\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":1},{\"producto_id\":\"70\",\"cantidad_requerida\":\"15.0000\",\"unidad_medida\":\"Gramo\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":2},{\"producto_id\":\"117\",\"cantidad_requerida\":\"25\",\"unidad_medida\":\"Mililitro\",\"porcentaje_merma\":\"0.00\",\"es_opcional\":0,\"orden_preparacion\":3}]},\"parametros_ruta\":{\"id\":\"10\"}}',144,'2026-08-28 20:04:45'),
(1051,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,90,'2026-08-28 20:04:47'),
(1052,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',248,'2026-08-28 20:04:56'),
(1053,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,53,'2026-08-28 20:05:16'),
(1054,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/api/stock/:almacenId','/admin/inventario/api/stock/1','Consultar Inventario','Inventario','1','Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"almacenId\":\"1\"}}',25,'2026-08-28 20:05:23'),
(1055,3,'Willian Portilla Torriente','superadministrador','POST','/admin/almacenes/entradas/api','/admin/almacenes/entradas/api','Registrar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','ESCRITURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"almacen_id\":\"1\",\"producto_id\":\"73\",\"unidad_medida_id\":\"1\",\"fecha_ingreso\":\"2026-08-28\",\"fecha_vencimiento\":\"\",\"cantidad\":\"20\",\"costo_unitario\":\"1000\"}}',2020,'2026-08-28 20:06:13'),
(1056,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,185,'2026-08-28 20:06:15'),
(1057,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',78,'2026-08-28 20:06:24'),
(1058,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',178,'2026-08-28 20:08:10'),
(1059,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','9yZwbSF8SY23uoflVLDbMhp8W36f-6K6',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',235,'2026-08-28 20:14:10'),
(1060,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',63,'2026-08-28 20:14:33'),
(1061,3,'Willian Portilla Torriente','superadministrador','POST','/admin/almacenes/entradas/api','/admin/almacenes/entradas/api','Registrar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','ESCRITURA','AVISO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"almacen_id\":\"1\",\"producto_id\":\"117\",\"unidad_medida_id\":\"10\",\"fecha_ingreso\":\"2026-08-28\",\"fecha_vencimiento\":\"\",\"cantidad\":\"7\",\"costo_unitario\":\"6000\"}}',320,'2026-08-28 20:15:28'),
(1062,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,65,'2026-08-28 20:15:30'),
(1063,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','maW_Dl20Jk-jdMjXsgLrhPMns-sjxpOv',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',73,'2026-08-28 20:15:36'),
(1064,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',10,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-28 20:20:10'),
(1065,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',178,'2026-08-28 20:25:10'),
(1066,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',12,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',1367,'2026-08-28 20:31:11'),
(1067,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','DwVqM97ckagEJ_8UZaHHzA-U8UhaTqKu',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',183,'2026-08-28 20:37:10'),
(1068,NULL,NULL,NULL,'GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','DDzHnoKwOTPpeJWmYic-iusveJnCqSOz',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,228,'2026-08-28 20:41:39'),
(1069,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','DDzHnoKwOTPpeJWmYic-iusveJnCqSOz',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,30,'2026-08-28 20:41:39'),
(1070,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 20:41:46'),
(1071,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,90,'2026-08-28 20:41:46'),
(1072,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',40,'2026-08-28 20:41:47'),
(1073,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,62,'2026-08-28 20:41:56'),
(1074,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',225,'2026-08-28 20:42:03'),
(1075,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','--fDieStWbH-LkoAy1ao0lQdOJFuwhAh',10,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',17,'2026-08-28 20:42:10'),
(1076,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','--fDieStWbH-LkoAy1ao0lQdOJFuwhAh',9,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',116,'2026-08-28 20:47:10'),
(1077,NULL,NULL,NULL,'GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','--fDieStWbH-LkoAy1ao0lQdOJFuwhAh',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,11,'2026-08-28 20:47:53'),
(1078,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','--fDieStWbH-LkoAy1ao0lQdOJFuwhAh',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,6,'2026-08-28 20:47:53'),
(1079,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 20:48:00'),
(1080,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 20:48:00'),
(1081,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-28 20:48:00'),
(1082,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,21,'2026-08-28 20:48:00'),
(1083,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',18,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 20:48:01'),
(1084,3,'Willian Portilla Torriente','superadministrador','GET','/admin/mesas','/admin/mesas','Consultar Mesa','Mesa',NULL,'Salón','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,55,'2026-08-28 20:48:10'),
(1085,3,'Willian Portilla Torriente','superadministrador','POST','/admin/mesas/distribucion','/admin/mesas/distribucion','Registrar Mesa','Mesa',NULL,'Salón','ESCRITURA','AVISO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"asignaciones\":[{\"mesaId\":\"20\",\"dependienteId\":\"2\"},{\"mesaId\":\"22\",\"dependienteId\":\"2\"},{\"mesaId\":\"23\",\"dependienteId\":\"17\"},{\"mesaId\":\"24\",\"dependienteId\":\"17\"},{\"mesaId\":\"25\",\"dependienteId\":\"11\"},{\"mesaId\":\"26\",\"dependienteId\":\"11\"},{\"mesaId\":\"27\",\"dependienteId\":\"4\"},{\"mesaId\":\"28\",\"dependienteId\":\"4\"}]}}',261,'2026-08-28 20:48:59'),
(1086,3,'Willian Portilla Torriente','superadministrador','GET','/admin/mesas','/admin/mesas','Consultar Mesa','Mesa',NULL,'Salón','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,43,'2026-08-28 20:49:01'),
(1087,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,25,'2026-08-28 20:49:04'),
(1088,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":27}}',82,'2026-08-28 20:49:08'),
(1089,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',200,'2026-08-28 20:49:08'),
(1090,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','MofnwsetE626sKVqna71UCPUu-bxfO9p',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"19\",\"id_mesa\":27,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',188,'2026-08-28 20:49:32'),
(1091,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',18,'2026-08-28 20:50:10'),
(1092,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','b6l1YnwZacxvp8kKmNC71rsR9MqpxD6z',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',61,'2026-08-28 20:51:37'),
(1093,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sIjYOF7QoVnC-700Pgg-XOsQK_yr-ygs',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',59,'2026-08-28 20:53:10'),
(1094,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sIjYOF7QoVnC-700Pgg-XOsQK_yr-ygs',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',81,'2026-08-28 20:59:10'),
(1095,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','sIjYOF7QoVnC-700Pgg-XOsQK_yr-ygs',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',75,'2026-08-28 21:05:10'),
(1096,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','wVCG84y6U-yXeZnwJLcmVadIq-rUrxPd',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',173,'2026-08-28 21:09:10'),
(1097,NULL,NULL,NULL,'GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','qf6Wa4mBnU4vlr08dIhFtnneECmzhzBZ',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,26,'2026-08-28 21:09:50'),
(1098,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','qf6Wa4mBnU4vlr08dIhFtnneECmzhzBZ',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,21,'2026-08-28 21:09:50'),
(1099,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','QGH3zvujfGRlDnBUd-nE60UANPRBwnuV',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 21:09:55'),
(1100,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','QGH3zvujfGRlDnBUd-nE60UANPRBwnuV',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,103,'2026-08-28 21:09:55'),
(1101,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','QGH3zvujfGRlDnBUd-nE60UANPRBwnuV',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',31,'2026-08-28 21:09:55'),
(1102,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','QGH3zvujfGRlDnBUd-nE60UANPRBwnuV',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',132,'2026-08-28 21:10:07'),
(1103,NULL,NULL,NULL,'GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','R-U1EjXEUREkyT6Uky1omlbEnwAaOj9Z',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',111,'2026-08-28 21:10:13'),
(1104,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','R-U1EjXEUREkyT6Uky1omlbEnwAaOj9Z',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-28 21:10:13'),
(1105,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 21:10:28'),
(1106,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 21:10:28'),
(1107,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 21:10:28'),
(1108,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,24,'2026-08-28 21:10:28'),
(1109,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-28 21:10:29'),
(1110,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',150,'2026-08-28 21:10:31'),
(1111,4,'Maria Gonzalez Diaz','dependiente','PUT','/pos/cancelar-item/:id_detalle','/pos/cancelar-item/49','Cancelar ítem de la comanda','Ítem de comanda','49','Punto de Venta','ESCRITURA','CRITICO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"motivo\":\"se va\"},\"parametros_ruta\":{\"id_detalle\":\"49\"}}',63,'2026-08-28 21:10:43'),
(1112,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',4,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',40,'2026-08-28 21:10:57'),
(1113,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','wVCG84y6U-yXeZnwJLcmVadIq-rUrxPd',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',89,'2026-08-28 21:15:10'),
(1114,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','qszHlIpY0etP7XjdcHki7pjcHlx_d8he',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',103,'2026-08-28 21:20:20'),
(1115,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','wVCG84y6U-yXeZnwJLcmVadIq-rUrxPd',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',8,'2026-08-28 21:21:10'),
(1116,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','wVCG84y6U-yXeZnwJLcmVadIq-rUrxPd',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',77,'2026-08-28 21:26:10'),
(1117,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','z5RFOslpLNaOkeqnTcfe6sIMUWjs5raJ',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',209,'2026-08-28 21:31:10'),
(1118,NULL,NULL,NULL,'GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','GMOdAEijJIL5rMc4aPmOwBjlEdPBXZL1',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-28 21:31:43'),
(1119,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','GMOdAEijJIL5rMc4aPmOwBjlEdPBXZL1',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,18,'2026-08-28 21:31:43'),
(1120,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','GMOdAEijJIL5rMc4aPmOwBjlEdPBXZL1',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,17,'2026-08-28 21:31:45'),
(1121,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','GMOdAEijJIL5rMc4aPmOwBjlEdPBXZL1',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-28 21:31:45'),
(1122,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-28 21:31:51'),
(1123,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,115,'2026-08-28 21:31:51'),
(1124,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',17,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',29,'2026-08-28 21:31:51'),
(1125,NULL,NULL,NULL,'GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','n3YUSG1CrDF9nnvm2Z8YZN0VK4PFGzIl',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',46,'2026-08-28 21:33:18'),
(1126,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','n3YUSG1CrDF9nnvm2Z8YZN0VK4PFGzIl',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 21:33:18'),
(1127,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-28 21:33:25'),
(1128,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-28 21:33:25'),
(1129,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,2,'2026-08-28 21:33:25'),
(1130,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,28,'2026-08-28 21:33:25'),
(1131,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',24,'2026-08-28 21:33:26'),
(1132,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',164,'2026-08-28 21:33:27'),
(1133,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',50,'2026-08-28 21:33:41'),
(1134,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/70','Consultar Producto','Producto','70','Inventario','LECTURA','INFO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"70\"}}',74,'2026-08-28 21:35:42'),
(1135,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/editar/:id','/admin/productos/editar/70','Actualizar Producto','Producto','70','Inventario','ESCRITURA','AVISO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"193090004\",\"nombre\":\"Cafe\",\"categoria_id\":\"4\",\"tipo\":\"materia_prima\",\"unidad_inventario_id\":\"1\",\"unidad_compra_id\":\"8\",\"unidad_consumo_id\":\"2\",\"stock_minimo\":\"20\",\"costo_promedio\":\"1200\",\"activo\":\"1\",\"permitida_venta\":\"0\"},\"parametros_ruta\":{\"id\":\"70\"}}',154,'2026-08-28 21:37:00'),
(1136,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','gXxm3FRk9UoFU0VjNGQz8JZfpbEfOS3u',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,63,'2026-08-28 21:37:02'),
(1137,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',133,'2026-08-28 21:37:04'),
(1138,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','BPu3Mx3r83_WnOO38Z5aZSWQUjY6_Mc_',2,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',37,'2026-08-28 21:37:09'),
(1139,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','z5RFOslpLNaOkeqnTcfe6sIMUWjs5raJ',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',11,'2026-08-28 21:37:10'),
(1140,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','z5RFOslpLNaOkeqnTcfe6sIMUWjs5raJ',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/135.0.0.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',62,'2026-08-28 21:42:10'),
(1141,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','6miCsTOhdU9jGww-bhDbRc02Aburlvg6',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',616,'2026-08-29 01:25:46'),
(1142,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','6miCsTOhdU9jGww-bhDbRc02Aburlvg6',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,15,'2026-08-29 01:25:46'),
(1143,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','6miCsTOhdU9jGww-bhDbRc02Aburlvg6',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,232,'2026-08-29 01:25:46'),
(1144,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-29 01:25:54'),
(1145,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,662,'2026-08-29 01:25:55'),
(1146,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',23,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',28,'2026-08-29 01:25:55'),
(1147,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','R8E2RSh4Ww-jhS93JgYXKyvYsyrJ7aHv',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',6,'2026-08-29 01:26:34'),
(1148,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','R8E2RSh4Ww-jhS93JgYXKyvYsyrJ7aHv',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 01:26:35'),
(1149,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','R8E2RSh4Ww-jhS93JgYXKyvYsyrJ7aHv',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,7,'2026-08-29 01:26:35'),
(1150,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','11','Autenticación','AUTENTICACION','AVISO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-29 01:26:46'),
(1151,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,53,'2026-08-29 01:26:46'),
(1152,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 01:26:46'),
(1153,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,181,'2026-08-29 01:26:46'),
(1154,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',10,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',103,'2026-08-29 01:26:47'),
(1155,11,'Joaquin Urtaquio Valladares Lopez','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":25}}',104,'2026-08-29 01:27:25'),
(1156,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/20','Consultar Punto de venta','Punto de venta','20','Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"20\"}}',229,'2026-08-29 01:27:26'),
(1157,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',175,'2026-08-29 01:27:35'),
(1158,3,'Willian Portilla Torriente','superadministrador','GET','/admin/unidades-medida','/admin/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,126,'2026-08-29 01:29:44'),
(1159,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,19,'2026-08-29 01:29:45'),
(1160,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-29 01:29:45'),
(1161,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/conversiones-unidades/:id','/admin/api/conversiones-unidades/8','Actualizar Conversión de unidades','Conversión de unidades','8','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"producto_id\":null,\"unidad_origen_id\":\"5\",\"unidad_destino_id\":\"10\",\"factor\":\"0.700\",\"es_conversion_base\":0,\"activa\":1,\"observaciones\":\"Aplicable para todas las botellas de 700 ml\"},\"parametros_ruta\":{\"id\":\"8\"}}',157,'2026-08-29 01:31:25'),
(1162,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-29 01:31:25'),
(1163,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-29 01:31:25'),
(1164,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/conversiones-unidades/:id','/admin/api/conversiones-unidades/8','Actualizar Conversión de unidades','Conversión de unidades','8','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"producto_id\":null,\"unidad_origen_id\":\"5\",\"unidad_destino_id\":\"10\",\"factor\":\"0.007\",\"es_conversion_base\":0,\"activa\":1,\"observaciones\":\"Aplicable para todas las botellas de 700 ml\"},\"parametros_ruta\":{\"id\":\"8\"}}',114,'2026-08-29 01:32:30'),
(1165,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,10,'2026-08-29 01:32:30'),
(1166,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-29 01:32:30'),
(1167,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/20','Consultar Punto de venta','Punto de venta','20','Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"20\"}}',204,'2026-08-29 01:32:38'),
(1168,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',43,'2026-08-29 01:32:43'),
(1169,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,154,'2026-08-29 01:56:35'),
(1170,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/117','Consultar Producto','Producto','117','Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"117\"}}',12,'2026-08-29 01:56:53'),
(1171,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/117','Consultar Producto','Producto','117','Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"117\"}}',69,'2026-08-29 01:57:57'),
(1172,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/unidades-medida/:id','/admin/api/unidades-medida/10','Actualizar Unidad de medida','Unidad de medida','10','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"Bt\",\"abreviatura\":\"bt\",\"nombre\":\"Botella 700ml\",\"tipo\":\"VOLUMEN\",\"permite_decimales\":1,\"activa\":1},\"parametros_ruta\":{\"id\":\"10\"}}',132,'2026-08-29 01:59:52'),
(1173,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-29 01:59:52'),
(1174,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,4,'2026-08-29 01:59:52'),
(1175,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/conversiones-unidades/:id','/admin/api/conversiones-unidades/8','Actualizar Conversión de unidades','Conversión de unidades','8','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"producto_id\":null,\"unidad_origen_id\":\"10\",\"unidad_destino_id\":\"5\",\"factor\":\"700\",\"es_conversion_base\":0,\"activa\":1,\"observaciones\":\"Aplicable para todas las botellas de 700 ml\"},\"parametros_ruta\":{\"id\":\"8\"}}',54,'2026-08-29 02:00:37'),
(1176,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-29 02:00:37'),
(1177,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-29 02:00:37'),
(1178,3,'Willian Portilla Torriente','superadministrador','POST','/admin/productos/editar/:id','/admin/productos/editar/117','Actualizar Producto','Producto','117','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"codigo\":\"PROD-003\",\"nombre\":\"Brandy\",\"categoria_id\":\"4\",\"tipo\":\"producto_venta\",\"unidad_inventario_id\":\"10\",\"unidad_compra_id\":\"10\",\"unidad_consumo_id\":\"5\",\"stock_minimo\":\"5.000\",\"costo_promedio\":\"8000.0000\",\"activo\":\"1\",\"permitida_venta\":\"1\"},\"parametros_ruta\":{\"id\":\"117\"}}',91,'2026-08-29 02:01:15'),
(1179,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,47,'2026-08-29 02:01:17'),
(1180,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos/:id','/admin/productos/109','Consultar Producto','Producto','109','Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"109\"}}',8,'2026-08-29 02:01:34'),
(1181,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/pos/:id_pedido','/pos/20','Consultar Punto de venta','Punto de venta','20','Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"20\"}}',223,'2026-08-29 02:02:37'),
(1182,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',54,'2026-08-29 02:02:43'),
(1183,11,'Joaquin Urtaquio Valladares Lopez','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','n8Kw-5_k0IjEwGzxQCFsDT4Oc5k1c_hP',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',143,'2026-08-29 02:15:36'),
(1184,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,85,'2026-08-29 02:17:23'),
(1185,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',113,'2026-08-29 02:17:30'),
(1186,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,47,'2026-08-29 02:18:23'),
(1187,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,119,'2026-08-29 02:18:36'),
(1188,3,'Willian Portilla Torriente','superadministrador','POST','/admin/almacenes/entradas/api','/admin/almacenes/entradas/api','Registrar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"almacen_id\":\"1\",\"producto_id\":\"70\",\"unidad_medida_id\":\"1\",\"fecha_ingreso\":\"2026-08-29\",\"fecha_vencimiento\":\"\",\"cantidad\":\"20.5\",\"costo_unitario\":\"350\"}}',150,'2026-08-29 02:20:14'),
(1189,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,47,'2026-08-29 02:20:16'),
(1190,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',57,'2026-08-29 02:20:35'),
(1191,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,63,'2026-08-29 02:21:04'),
(1192,3,'Willian Portilla Torriente','superadministrador','POST','/admin/api/transferencias','/admin/api/transferencias','Registrar Transferencia','Transferencia',NULL,'Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,201,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"cuerpo\":{\"almacen_origen_id\":\"1\",\"almacen_destino_id\":\"5\",\"observaciones\":\"Solicitud de insumos para el servicio.\",\"detalles\":[{\"producto_id\":\"117\",\"cantidad\":\"2\",\"unidad_medida_id\":\"10\"},{\"producto_id\":\"70\",\"cantidad\":\"2\",\"unidad_medida_id\":\"1\"},{\"producto_id\":\"73\",\"cantidad\":\"1\",\"unidad_medida_id\":\"1\"}]}}',155,'2026-08-29 02:22:39'),
(1193,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,32,'2026-08-29 02:22:41'),
(1194,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/transferencias/:id/aprobar','/admin/api/transferencias/17/aprobar','Actualizar Transferencia','Transferencia','17','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"17\"}}',50,'2026-08-29 02:22:58'),
(1195,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,35,'2026-08-29 02:22:59'),
(1196,3,'Willian Portilla Torriente','superadministrador','PUT','/admin/api/transferencias/:id/completar','/admin/api/transferencias/17/completar','Actualizar Transferencia','Transferencia','17','Inventario','ESCRITURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id\":\"17\"}}',258,'2026-08-29 02:23:10'),
(1197,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,27,'2026-08-29 02:23:12'),
(1198,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,37,'2026-08-29 02:23:26'),
(1199,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',7,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',25,'2026-08-29 02:23:26'),
(1200,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,80,'2026-08-29 02:23:51'),
(1201,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=2','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"2\"}}',56,'2026-08-29 02:24:08'),
(1202,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=1&categoria=SEGURIDAD','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"1\",\"categoria\":\"SEGURIDAD\"}}',41,'2026-08-29 02:24:31'),
(1203,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,335,'2026-08-29 02:25:07'),
(1204,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=1&categoria=SISTEMA','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"1\",\"categoria\":\"SISTEMA\"}}',55,'2026-08-29 02:25:10'),
(1205,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,40,'2026-08-29 02:25:18'),
(1206,3,'Willian Portilla Torriente','superadministrador','GET','/admin/auditoria','/admin/auditoria?pagina=1&categoria=CIERRE','Consultar registro de auditoría','Registro de auditoría',NULL,'Auditoría','LECTURA','AVISO','sau4DYwMxfAjv16_hFhc4kPo2uJpZ87_',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_consulta\":{\"pagina\":\"1\",\"categoria\":\"CIERRE\"}}',49,'2026-08-29 02:25:27'),
(1207,NULL,NULL,NULL,'GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','urwCqmc1kEFwDcoUgSvi7K_P5UX3Khe3',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,81,'2026-08-29 02:26:10'),
(1208,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','urwCqmc1kEFwDcoUgSvi7K_P5UX3Khe3',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,12,'2026-08-29 02:26:10'),
(1209,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-29 02:26:15'),
(1210,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,31,'2026-08-29 02:26:15'),
(1211,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,37,'2026-08-29 02:26:23'),
(1212,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,86,'2026-08-29 02:26:49'),
(1213,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/api/stock/:almacenId','/admin/inventario/api/stock/1','Consultar Inventario','Inventario','1','Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"almacenId\":\"1\"}}',10,'2026-08-29 02:26:52'),
(1214,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,146,'2026-08-29 02:27:40'),
(1215,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',70,'2026-08-29 02:27:45'),
(1216,NULL,NULL,NULL,'GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',2,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',38,'2026-08-29 02:29:18'),
(1217,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-29 02:29:18'),
(1218,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 02:29:21'),
(1219,NULL,NULL,NULL,'POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"20\",\"id_mesa\":25,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',5,'2026-08-29 02:29:34'),
(1220,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,9,'2026-08-29 02:29:34'),
(1221,NULL,NULL,NULL,'POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"20\",\"id_mesa\":25,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',4,'2026-08-29 02:29:55'),
(1222,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-29 02:29:55'),
(1223,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',58,'2026-08-29 02:30:05'),
(1224,NULL,NULL,NULL,'GET','/.well-known/appspecific/com.chrome.devtools.json','/.well-known/appspecific/com.chrome.devtools.json','Consultar /.well-known/appspecific/com.chrome.devtools.json',NULL,NULL,'Otros','LECTURA','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,404,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',110,'2026-08-29 02:30:20'),
(1225,NULL,NULL,NULL,'POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"20\",\"id_mesa\":25,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',3,'2026-08-29 02:30:54'),
(1226,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 02:30:54'),
(1227,NULL,NULL,NULL,'GET','/pos/:id_pedido','/pos/20','Consultar Punto de venta','Punto de venta','20','Punto de Venta','LECTURA','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"20\"}}',4,'2026-08-29 02:31:05'),
(1228,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-29 02:31:05'),
(1229,NULL,NULL,NULL,'GET','/.well-known/appspecific/com.chrome.devtools.json','/.well-known/appspecific/com.chrome.devtools.json','Consultar /.well-known/appspecific/com.chrome.devtools.json',NULL,NULL,'Otros','LECTURA','INFO','QD1SNMzlov2Z9vXQhrHYv9a4WVtLdgsb',1,404,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',15,'2026-08-29 02:31:06'),
(1230,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-29 02:31:16'),
(1231,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,5,'2026-08-29 02:31:16'),
(1232,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 02:31:16'),
(1233,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,36,'2026-08-29 02:31:16'),
(1234,4,'Maria Gonzalez Diaz','dependiente','GET','/.well-known/appspecific/com.chrome.devtools.json','/.well-known/appspecific/com.chrome.devtools.json','Consultar /.well-known/appspecific/com.chrome.devtools.json',NULL,NULL,'Otros','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,404,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',9,'2026-08-29 02:31:17'),
(1235,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',15,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-29 02:31:17'),
(1236,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',182,'2026-08-29 02:31:19'),
(1237,4,'Maria Gonzalez Diaz','dependiente','GET','/.well-known/appspecific/com.chrome.devtools.json','/.well-known/appspecific/com.chrome.devtools.json','Consultar /.well-known/appspecific/com.chrome.devtools.json',NULL,NULL,'Otros','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,404,0,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',9,'2026-08-29 02:31:19'),
(1238,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',2,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',1154,'2026-08-29 02:31:26'),
(1239,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"19\",\"id_mesa\":27,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":2,\"notas\":\"\",\"es_platillo_dia\":false}]}}',148,'2026-08-29 02:31:40'),
(1240,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/item-estado','/api/pos/item-estado','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_detalle\":\"50\",\"nuevo_estado\":\"entregado\"}}',129,'2026-08-29 02:32:35'),
(1241,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/precuenta/:id_pedido','/pos/precuenta/19','Emitir pre-cuenta para impresión','Pre-cuenta','19','Punto de Venta','IMPRESION','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',453,'2026-08-29 02:32:52'),
(1242,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/19','Consultar Punto de venta','Punto de venta','19','Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"19\"}}',105,'2026-08-29 02:32:59'),
(1243,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,21,'2026-08-29 02:33:11'),
(1244,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/19','Cobrar y cerrar cuenta','Cuenta','19','Caja','CIERRE','CRITICO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":800,\"monto_equivalente_local\":800,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":50,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"19\"}}',273,'2026-08-29 02:33:53'),
(1245,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,32,'2026-08-29 02:33:55'),
(1246,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',65,'2026-08-29 02:34:02'),
(1247,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":27}}',110,'2026-08-29 02:34:49'),
(1248,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/21','Consultar Punto de venta','Punto de venta','21','Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"21\"}}',140,'2026-08-29 02:34:49'),
(1249,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',3,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',116,'2026-08-29 02:34:55'),
(1250,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',67,'2026-08-29 02:35:13'),
(1251,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/recetas/platillo/:platilloId','/admin/api/recetas/platillo/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',14,'2026-08-29 02:35:41'),
(1252,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',310,'2026-08-29 02:35:59'),
(1253,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,29,'2026-08-29 02:36:23'),
(1254,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"21\",\"id_mesa\":27,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":3,\"notas\":\"\",\"es_platillo_dia\":false}]}}',258,'2026-08-29 02:37:12'),
(1255,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/21','Registrar Punto de venta','Punto de venta','21','Punto de Venta','ESCRITURA','AVISO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"21\"}}',77,'2026-08-29 02:37:16'),
(1256,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,19,'2026-08-29 02:37:19'),
(1257,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',53,'2026-08-29 02:37:23'),
(1258,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/21','Cobrar y cerrar cuenta','Cuenta','21','Caja','CIERRE','CRITICO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":1200,\"monto_equivalente_local\":1200,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":70,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"21\"}}',162,'2026-08-29 02:38:07'),
(1259,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,25,'2026-08-29 02:38:09'),
(1260,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',20,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-29 02:38:10'),
(1261,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',62,'2026-08-29 02:38:25'),
(1262,3,'Willian Portilla Torriente','superadministrador','GET','/admin/licencia','/admin/licencia','Consultar /admin/licencia',NULL,NULL,'Otros','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',135,'2026-08-29 02:39:38'),
(1263,3,'Willian Portilla Torriente','superadministrador','GET','/admin/fichas-costo','/admin/fichas-costo','Consultar /admin/fichas-costo',NULL,NULL,'Otros','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',1314,'2026-08-29 02:42:39'),
(1264,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',15,'2026-08-29 02:43:27'),
(1265,3,'Willian Portilla Torriente','superadministrador','GET','/admin/fichas-costo/rentabilidad','/admin/fichas-costo/rentabilidad','Consultar /admin/fichas-costo/rentabilidad',NULL,NULL,'Otros','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',125,'2026-08-29 02:43:30'),
(1266,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,123,'2026-08-29 02:45:36'),
(1267,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',3,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-29 02:45:36'),
(1268,3,'Willian Portilla Torriente','superadministrador','GET','/admin/usuarios','/admin/usuarios','Consultar Usuario','Usuario',NULL,'Usuarios','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,86,'2026-08-29 02:46:04'),
(1269,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,212,'2026-08-29 02:46:48'),
(1270,3,'Willian Portilla Torriente','superadministrador','GET','/admin/mesas','/admin/mesas','Consultar Mesa','Mesa',NULL,'Salón','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,69,'2026-08-29 02:47:18'),
(1271,3,'Willian Portilla Torriente','superadministrador','GET','/admin/menu','/admin/menu','Consultar Platillo del menú','Platillo del menú',NULL,'Menú','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,107,'2026-08-29 02:47:36'),
(1272,3,'Willian Portilla Torriente','superadministrador','GET','/admin/pedidos','/admin/pedidos','Consultar Pedido','Pedido',NULL,'Pedidos','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,125,'2026-08-29 02:48:08'),
(1273,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-29 02:48:27'),
(1274,3,'Willian Portilla Torriente','superadministrador','GET','/monitor/:area','/monitor/cocina','Consultar Monitor de producción','Monitor de producción','cocina','Producción','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"area\":\"cocina\"}}',257,'2026-08-29 02:49:19'),
(1275,3,'Willian Portilla Torriente','superadministrador','GET','/monitor/:area','/monitor/bar','Consultar Monitor de producción','Monitor de producción','bar','Producción','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"area\":\"bar\"}}',37,'2026-08-29 02:49:33'),
(1276,3,'Willian Portilla Torriente','superadministrador','GET','/monitor/:area','/monitor/cocina','Consultar Monitor de producción','Monitor de producción','cocina','Producción','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"area\":\"cocina\"}}',94,'2026-08-29 02:50:04'),
(1277,3,'Willian Portilla Torriente','superadministrador','GET','/monitor/:area','/monitor/bar','Consultar Monitor de producción','Monitor de producción','bar','Producción','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"area\":\"bar\"}}',26,'2026-08-29 02:50:10'),
(1278,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes','/admin/almacenes','Consultar Almacén','Almacén',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,39,'2026-08-29 02:50:16'),
(1279,3,'Willian Portilla Torriente','superadministrador','GET','/admin/productos','/admin/productos','Consultar Producto','Producto',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,52,'2026-08-29 02:50:35'),
(1280,3,'Willian Portilla Torriente','superadministrador','GET','/admin/almacenes/entradas','/admin/almacenes/entradas','Consultar Entrada de mercancía','Entrada de mercancía',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,55,'2026-08-29 02:51:20'),
(1281,3,'Willian Portilla Torriente','superadministrador','GET','/admin/configuracion','/admin/configuracion','Consultar Configuración','Configuración',NULL,'Sistema','SISTEMA','AVISO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,135,'2026-08-29 02:52:30'),
(1282,3,'Willian Portilla Torriente','superadministrador','GET','/monitor/:area','/monitor/bar','Consultar Monitor de producción','Monitor de producción','bar','Producción','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"area\":\"bar\"}}',20,'2026-08-29 02:52:38'),
(1283,3,'Willian Portilla Torriente','superadministrador','GET','/admin/monedas','/admin/monedas','Consultar Moneda','Moneda',NULL,'Caja','LECTURA','AVISO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,32,'2026-08-29 02:53:08'),
(1284,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,123,'2026-08-29 02:53:29'),
(1285,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','OCrxY1_SQmJKG8d9gDrTLrQpr9jKOxWb',7,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',14,'2026-08-29 02:54:27'),
(1286,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/api/stock/:almacenId','/admin/inventario/api/stock/5','Consultar Inventario','Inventario','5','Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"almacenId\":\"5\"}}',11,'2026-08-29 02:55:59'),
(1287,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/valorizacion','/admin/inventario/valorizacion','Consultar valorización de inventario','Valorización de inventario',NULL,'Inventario','LECTURA','AVISO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,37,'2026-08-29 02:56:10'),
(1288,3,'Willian Portilla Torriente','superadministrador','GET','/admin/inventario/stock','/admin/inventario/stock','Consultar Inventario','Inventario',NULL,'Inventario','LECTURA','INFO','OKG02n_Elcz69FBPlPw57LR61acBzeBE',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,112,'2026-08-29 02:56:32'),
(1289,3,'Willian Portilla Torriente','superadministrador','GET','/logout','/logout','Cierre de sesión','Sesión','3','Autenticación','AUTENTICACION','INFO','BASRHNpztU175bJBgHTzrhWKlihaf2Ji',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"sesion_recordada_revocada\":false}',NULL,'2026-08-29 02:56:37'),
(1290,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','BASRHNpztU175bJBgHTzrhWKlihaf2Ji',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,11,'2026-08-29 02:56:37'),
(1291,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','g64XoqCD3EARuRH7ODlAao-MNYOMUGiB',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',551,'2026-08-29 12:05:43'),
(1292,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','g64XoqCD3EARuRH7ODlAao-MNYOMUGiB',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,379,'2026-08-29 12:05:43'),
(1293,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','g64XoqCD3EARuRH7ODlAao-MNYOMUGiB',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,7,'2026-08-29 12:05:43'),
(1294,4,'Maria Gonzalez Diaz','dependiente','POST','/login','/login','Inicio de sesión correcto','Sesión','4','Autenticación','AUTENTICACION','AVISO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"rol\":\"dependiente\",\"recordarme\":false}',NULL,'2026-08-29 12:05:51'),
(1295,4,'Maria Gonzalez Diaz','dependiente','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,4,'2026-08-29 12:05:51'),
(1296,4,'Maria Gonzalez Diaz','dependiente','GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,302,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,3,'2026-08-29 12:05:51'),
(1297,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,301,'2026-08-29 12:05:51'),
(1298,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',28,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',95,'2026-08-29 12:05:52'),
(1299,NULL,NULL,NULL,'GET','/','/','Consultar /',NULL,NULL,'Otros','LECTURA','INFO','uiqsMbhz-S-ZcYTz8_KtnRnnCxjQ97Ld',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',6,'2026-08-29 12:06:21'),
(1300,NULL,NULL,NULL,'GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','uiqsMbhz-S-ZcYTz8_KtnRnnCxjQ97Ld',1,302,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,7,'2026-08-29 12:06:23'),
(1301,NULL,NULL,NULL,'GET','/login','/login','Ver pantalla de acceso','Sesión',NULL,'Autenticación','AUTENTICACION','INFO','uiqsMbhz-S-ZcYTz8_KtnRnnCxjQ97Ld',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,8,'2026-08-29 12:06:24'),
(1302,3,'Willian Portilla Torriente','superadministrador','POST','/login','/login','Inicio de sesión correcto','Sesión','3','Autenticación','AUTENTICACION','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"rol\":\"superadministrador\",\"recordarme\":false}',NULL,'2026-08-29 12:06:39'),
(1303,3,'Willian Portilla Torriente','superadministrador','GET','/admin/dashboard','/admin/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,1894,'2026-08-29 12:06:41'),
(1304,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/dashboard/metrics','/admin/api/dashboard/metrics','Refresco de métricas','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',2,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',139,'2026-08-29 12:06:44'),
(1305,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas','/admin/recetas','Consultar Receta / Ficha técnica','Receta / Ficha técnica',NULL,'Recetas','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,486,'2026-08-29 12:07:00'),
(1306,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',299,'2026-08-29 12:07:10'),
(1307,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/init-manual','/pos/init-manual','Registrar Punto de venta','Punto de venta',NULL,'Punto de Venta','ESCRITURA','AVISO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_mesa\":28}}',204,'2026-08-29 12:09:27'),
(1308,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/:id_pedido','/pos/22','Consultar Punto de venta','Punto de venta','22','Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"22\"}}',204,'2026-08-29 12:09:27'),
(1309,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/verify-stock','/api/pos/verify-stock?platillo_id=12&cantidad=1','Verificar disponibilidad de insumos','Stock',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 120s. El campo \\\"repeticiones\\\" indica cuántas fueron.\",\"parametros_consulta\":{\"platillo_id\":\"12\",\"cantidad\":\"1\"}}',52,'2026-08-29 12:09:35'),
(1310,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/save','/api/pos/save','Enviar comanda a producción','Comanda',NULL,'Punto de Venta','ESCRITURA','AVISO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"id_pedido\":\"22\",\"id_mesa\":28,\"items\":[{\"id\":\"12\",\"nombre\":\"Cafè Carajillo\",\"precio\":350,\"cantidad\":1,\"notas\":\"\",\"es_platillo_dia\":false}]}}',1899,'2026-08-29 12:09:57'),
(1311,4,'Maria Gonzalez Diaz','dependiente','POST','/api/pos/entregar-todos/:id_pedido','/api/pos/entregar-todos/22','Registrar Punto de venta','Punto de venta','22','Punto de Venta','ESCRITURA','AVISO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"parametros_ruta\":{\"id_pedido\":\"22\"}}',85,'2026-08-29 12:10:04'),
(1312,4,'Maria Gonzalez Diaz','dependiente','GET','/api/pos/monedas-turno-activo','/api/pos/monedas-turno-activo','Consultar Punto de venta','Punto de venta',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,9,'2026-08-29 12:10:07'),
(1313,4,'Maria Gonzalez Diaz','dependiente','POST','/pos/cobrar/:id_pedido','/pos/cobrar/22','Cobrar y cerrar cuenta','Cuenta','22','Caja','CIERRE','CRITICO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"cuerpo\":{\"pagos\":[{\"metodo_pago\":\"efectivo\",\"moneda_id\":1,\"codigo_moneda\":\"CUP\",\"factor_cambio_aplicado\":1,\"monto_moneda_origen\":350,\"monto_equivalente_local\":350,\"referencia_transaccion\":\"\",\"simbolo\":\"$\"}],\"es_cortesia\":false,\"es_factura_credito\":false,\"es_pendiente_pago\":false,\"descuento\":0,\"recargo\":0,\"propina\":0,\"motivo_ajuste\":\"\"},\"parametros_ruta\":{\"id_pedido\":\"22\"}}',978,'2026-08-29 12:10:18'),
(1314,4,'Maria Gonzalez Diaz','dependiente','GET','/dependiente/dashboard','/dependiente/dashboard','Abrir cuadro de mando','Cuadro de mando',NULL,'Dashboard','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',NULL,47,'2026-08-29 12:10:20'),
(1315,3,'Willian Portilla Torriente','superadministrador','GET','/admin/recetas/configurar/:platilloId','/admin/recetas/configurar/10','Consultar Receta / Ficha técnica','Receta / Ficha técnica','10','Recetas','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"platilloId\":\"10\"}}',64,'2026-08-29 12:10:27'),
(1316,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,107,'2026-08-29 12:10:37'),
(1317,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',13,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',9,'2026-08-29 12:10:53'),
(1318,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,63,'2026-08-29 12:11:22'),
(1319,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket-pedido/:id_pedido','/admin/cierre-dia/ticket-pedido/22','Consultar /admin/cierre-dia/ticket-pedido/22',NULL,'22','Otros','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0','{\"parametros_ruta\":{\"id_pedido\":\"22\"},\"aviso_catalogo\":\"Ruta sin regla específica en config/auditoriaCatalogo.js\"}',26,'2026-08-29 12:12:21'),
(1320,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,40,'2026-08-29 12:12:27'),
(1321,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia/ticket','/admin/cierre-dia/ticket','Emitir ticket de cierre de día','Ticket de cierre',NULL,'Caja','IMPRESION','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,107,'2026-08-29 12:13:10'),
(1322,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,36,'2026-08-29 12:13:21'),
(1323,3,'Willian Portilla Torriente','superadministrador','GET','/admin/cierre-dia','/admin/cierre-dia','Consultar cierre de día','Cierre de día',NULL,'Caja','LECTURA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,39,'2026-08-29 12:13:56'),
(1324,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,74,'2026-08-29 12:14:16'),
(1325,3,'Willian Portilla Torriente','superadministrador','GET','/admin/transferencias','/admin/transferencias','Consultar Transferencia','Transferencia',NULL,'Inventario','LECTURA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,60,'2026-08-29 12:14:29'),
(1326,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',12,'2026-08-29 12:16:51'),
(1327,3,'Willian Portilla Torriente','superadministrador','GET','/admin/configuracion','/admin/configuracion','Consultar Configuración','Configuración',NULL,'Sistema','SISTEMA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,204,'2026-08-29 12:20:04'),
(1328,3,'Willian Portilla Torriente','superadministrador','GET','/admin/unidades-medida','/admin/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,39,'2026-08-29 12:20:50'),
(1329,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/unidades-medida','/admin/api/unidades-medida','Consultar Unidad de medida','Unidad de medida',NULL,'Inventario','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,19,'2026-08-29 12:20:50'),
(1330,3,'Willian Portilla Torriente','superadministrador','GET','/admin/api/conversiones-unidades','/admin/api/conversiones-unidades','Consultar Conversión de unidades','Conversión de unidades',NULL,'Inventario','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,21,'2026-08-29 12:20:50'),
(1331,3,'Willian Portilla Torriente','superadministrador','GET','/admin/monedas','/admin/monedas','Consultar Moneda','Moneda',NULL,'Caja','LECTURA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,200,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,239,'2026-08-29 12:21:02'),
(1332,3,'Willian Portilla Torriente','superadministrador','GET','/admin/usuarios','/admin/usuarios','Consultar Usuario','Usuario',NULL,'Usuarios','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,30,'2026-08-29 12:21:16'),
(1333,3,'Willian Portilla Torriente','superadministrador','GET','/admin/turnos-servicio','/admin/turnos-servicio','Consultar Turno de servicio','Turno de servicio',NULL,'Turnos','LECTURA','INFO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,134,'2026-08-29 12:21:22'),
(1334,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',10,'2026-08-29 12:21:51'),
(1335,3,'Willian Portilla Torriente','superadministrador','GET','/admin/configuracion','/admin/configuracion','Consultar Configuración','Configuración',NULL,'Sistema','SISTEMA','AVISO','yEugXJpxbuup12mnyBmIIjbiAexFZ-Wj',1,304,1,'::ffff:127.0.0.1','Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',NULL,381,'2026-08-29 12:23:06'),
(1336,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',714,'2026-08-29 12:26:52'),
(1337,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',1364,'2026-08-29 12:32:53'),
(1338,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',22,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',109,'2026-08-29 12:38:51'),
(1339,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',8,'2026-08-29 12:44:51'),
(1340,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',145,'2026-08-29 12:49:51'),
(1341,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',73,'2026-08-29 12:55:51'),
(1342,4,'Maria Gonzalez Diaz','dependiente','GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','bIwD_gXe0ckSdF-hGl54leDP4Habfw3q',4,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',105,'2026-08-29 13:01:51'),
(1343,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','FwlnLH3a-lmfW40YDdT72xBZcTjHEefz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',71,'2026-08-29 13:05:51'),
(1344,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','FwlnLH3a-lmfW40YDdT72xBZcTjHEefz',5,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',85,'2026-08-29 13:11:51'),
(1345,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','FwlnLH3a-lmfW40YDdT72xBZcTjHEefz',6,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',622,'2026-08-29 13:16:52'),
(1346,NULL,NULL,NULL,'GET','/pos/alertas-pendientes','/pos/alertas-pendientes','Sondeo de alertas pendientes','Alertas',NULL,'Punto de Venta','LECTURA','INFO','FwlnLH3a-lmfW40YDdT72xBZcTjHEefz',1,200,1,'::1','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','{\"nota_agrupacion\":\"Endpoint de sondeo: este asiento representa todas las peticiones equivalentes de una ventana de 300s. El campo \\\"repeticiones\\\" indica cuántas fueron.\"}',128,'2026-08-29 13:22:51');
/*!40000 ALTER TABLE `auditoria_usuarios` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `auto_creacion_orden`
--

DROP TABLE IF EXISTS `auto_creacion_orden`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `auto_creacion_orden` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `auto_hash` varchar(64) NOT NULL,
  `id_mesa` int(11) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hash_unico` (`auto_hash`),
  KEY `fk_aco_mesa` (`id_mesa`),
  CONSTRAINT `fk_aco_mesa` FOREIGN KEY (`id_mesa`) REFERENCES `mesas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auto_creacion_orden`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `auto_creacion_orden` WRITE;
/*!40000 ALTER TABLE `auto_creacion_orden` DISABLE KEYS */;
/*!40000 ALTER TABLE `auto_creacion_orden` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria_padre_id` int(10) unsigned DEFAULT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `tipo` enum('materia_prima','producto_preparado','producto_venta','material_operativo') NOT NULL DEFAULT 'materia_prima',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_categorias_nombre` (`nombre`),
  KEY `idx_categorias_tipo` (`tipo`),
  KEY `idx_categorias_padre` (`categoria_padre_id`),
  KEY `idx_categorias_almacen` (`almacen_id`),
  CONSTRAINT `fk_categoria_padre` FOREIGN KEY (`categoria_padre_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_categorias_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES
(1,'Carnes',NULL,NULL,NULL,'materia_prima',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(2,'Vegetales',NULL,NULL,NULL,'materia_prima',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(3,'Lácteos',NULL,NULL,NULL,'materia_prima',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(4,'Bebidas',NULL,NULL,NULL,'producto_venta',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(5,'Entrantes',NULL,NULL,NULL,'producto_venta',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(6,'Platos Fuertes',NULL,NULL,NULL,'producto_venta',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(7,'Postres',NULL,NULL,NULL,'producto_venta',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(8,'Limpieza',NULL,NULL,NULL,'material_operativo',1,'2026-06-08 00:12:02','2026-06-08 00:12:02'),
(9,'Condimentos','Especias, sal, sazonadores y elementos para el sazón de la cocina.',NULL,NULL,'materia_prima',1,'2026-06-20 08:11:14','2026-06-20 08:11:14');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `categorias_platillos`
--

DROP TABLE IF EXISTS `categorias_platillos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias_platillos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `tipo` enum('BEBIDAS','COMESTIBLES') NOT NULL DEFAULT 'COMESTIBLES',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_cat_platillos_nombre` (`nombre`) USING BTREE,
  KEY `idx_cat_platillos_almacen` (`almacen_id`) USING BTREE,
  CONSTRAINT `fk_cat_platillos_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias_platillos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `categorias_platillos` WRITE;
/*!40000 ALTER TABLE `categorias_platillos` DISABLE KEYS */;
INSERT INTO `categorias_platillos` VALUES
(1,'Aperitivos','Aperitivos',2,'COMESTIBLES',1,'2026-08-09 18:16:17','2026-08-09 19:10:12'),
(2,'Entrantes Fríos','Entrantes que requieren congelación para su conservación',2,'COMESTIBLES',1,'2026-08-09 18:16:17','2026-08-09 19:06:24'),
(3,'Entrantes Calientes','Entrantes a base de aperitivos fritos ',2,'COMESTIBLES',1,'2026-08-09 18:16:17','2026-08-09 19:09:36'),
(4,'Sopas y Cremas',NULL,2,'COMESTIBLES',1,'2026-08-09 18:16:17','2026-08-09 19:11:20'),
(8,'Pescados y Mariscos',NULL,2,'COMESTIBLES',1,'2026-08-09 19:11:01','2026-08-09 19:11:01'),
(9,'Carnes',NULL,2,'COMESTIBLES',1,'2026-08-09 19:11:39','2026-08-09 19:11:39'),
(10,'Aves',NULL,2,'COMESTIBLES',1,'2026-08-09 19:11:54','2026-08-09 19:11:54'),
(11,'Especialidades Asiaticas',NULL,2,'COMESTIBLES',1,'2026-08-09 19:12:21','2026-08-09 19:12:21'),
(12,'Guarniciones',NULL,2,'COMESTIBLES',1,'2026-08-09 19:12:44','2026-08-09 19:12:44'),
(13,'Especialidades Italianas',NULL,2,'COMESTIBLES',1,'2026-08-09 19:13:00','2026-08-09 19:13:00'),
(14,'Infusiones y Bebidas','En esta categoria estaran localizados todos los platillos relacionados con el Bar (tragos,cocteles,cafes,jugos,cervezas,etc)',5,'BEBIDAS',1,'2026-08-09 19:13:26','2026-08-10 14:03:10'),
(15,'Postres',NULL,2,'COMESTIBLES',1,'2026-08-09 19:13:55','2026-08-09 19:13:55');
/*!40000 ALTER TABLE `categorias_platillos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `centros_costo`
--

DROP TABLE IF EXISTS `centros_costo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `centros_costo` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `centros_costo`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `centros_costo` WRITE;
/*!40000 ALTER TABLE `centros_costo` DISABLE KEYS */;
/*!40000 ALTER TABLE `centros_costo` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `cierres_servicio`
--

DROP TABLE IF EXISTS `cierres_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cierres_servicio` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `turno_servicio_id` bigint(20) unsigned NOT NULL,
  `fecha_cierre` datetime NOT NULL DEFAULT current_timestamp(),
  `usuario_cierre_id` int(11) NOT NULL,
  `fondo_apertura` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cobrado_caja` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_propinas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cxc_facturas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_pendiente_pago` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cortesias` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_descuentos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_recargos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monto_esperado_caja` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monto_real_entregado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `diferencia` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance_estado` enum('cuadrado','sobrante','faltante') NOT NULL DEFAULT 'cuadrado',
  `total_pedidos` int(11) NOT NULL DEFAULT 0,
  `pedidos_pagados` int(11) NOT NULL DEFAULT 0,
  `pedidos_facturados` int(11) NOT NULL DEFAULT 0,
  `pedidos_pendientes` int(11) NOT NULL DEFAULT 0,
  `desglose_monedas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cierre_turno` (`turno_servicio_id`),
  KEY `fk_cs_usuario_cierre` (`usuario_cierre_id`),
  CONSTRAINT `fk_cs_turno` FOREIGN KEY (`turno_servicio_id`) REFERENCES `turnos_servicio` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_usuario_cierre` FOREIGN KEY (`usuario_cierre_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cierres_servicio`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cierres_servicio` WRITE;
/*!40000 ALTER TABLE `cierres_servicio` DISABLE KEYS */;
INSERT INTO `cierres_servicio` VALUES
(6,3,'2026-08-28 14:42:59',3,5500.00,26300.00,100.00,0.00,0.00,0.00,0.00,0.00,31900.00,26300.00,-5600.00,'faltante',6,6,0,0,'[{\"metodo_pago\":\"efectivo\",\"codigo_moneda\":\"CUP\",\"nombre_moneda\":\"Peso Cubano (Moneda Local)\",\"simbolo\":\"$\",\"total_origen\":23000,\"total_local\":23000,\"total_transacciones\":5,\"es_zelle\":0,\"es_efectivo_caja\":1},{\"metodo_pago\":\"efectivo\",\"codigo_moneda\":\"USD\",\"nombre_moneda\":\"Dolar Estadounidense\",\"simbolo\":\"$\",\"total_origen\":5,\"total_local\":3300,\"total_transacciones\":1,\"es_zelle\":0,\"es_efectivo_caja\":1}]',NULL,'2026-08-28 18:42:59');
/*!40000 ALTER TABLE `cierres_servicio` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `clasificaciones_abc`
--

DROP TABLE IF EXISTS `clasificaciones_abc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `clasificaciones_abc` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `clasificacion` enum('A','B','C') NOT NULL,
  `porcentaje_consumo` decimal(10,2) NOT NULL,
  `fecha_calculo` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `clasificaciones_abc_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clasificaciones_abc`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `clasificaciones_abc` WRITE;
/*!40000 ALTER TABLE `clasificaciones_abc` DISABLE KEYS */;
/*!40000 ALTER TABLE `clasificaciones_abc` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `configuraciones`
--

DROP TABLE IF EXISTS `configuraciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuraciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` longtext DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `grupo` varchar(50) DEFAULT 'general',
  `tipo` varchar(20) DEFAULT 'boolean',
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=4073 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuraciones`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `configuraciones` WRITE;
/*!40000 ALTER TABLE `configuraciones` DISABLE KEYS */;
INSERT INTO `configuraciones` VALUES
(1,'habilitar_monitores_elaboracion','0','','general','boolean','2026-08-27 16:37:38'),
(2,'cliente_permite_prepedido','0','','general','boolean','2026-08-26 21:45:08'),
(3,'app_nombre','Restaurante Bahía','Nombre Comercial del Restaurante','identidad','string','2026-08-24 15:48:47'),
(4,'app_moneda','$','Símbolo Monetario Predeterminado','identidad','string','2026-08-24 15:48:47'),
(5,'salon_areas','Salon Principal, Terraza, Barra','Áreas y Ubicaciones del Establecimiento','salon','string','2026-08-24 15:48:47'),
(6,'factura_impuesto','0','Impuesto General aplicado a Ventas (%)','finanzas','number','2026-08-24 15:48:47'),
(7,'factura_propina','0','Porcentaje de Propina Sugerida (%)','finanzas','number','2026-08-24 15:48:47'),
(8,'inventario_unidades','Uds, Kg, Lts, Oz','Unidades de Medida Permitidas (Stock)','inventario','string','2026-08-24 15:48:47'),
(2731,'costo_food_cost_objetivo','30','Food cost objetivo (%) para sugerir el precio de venta','costeo','number','2026-08-28 12:53:09'),
(2732,'costo_imprevistos_default','5','Porcentaje de imprevistos por defecto en la ficha de costo','costeo','number','2026-08-28 12:53:09'),
(2733,'costo_redondeo_cup','5','Múltiplo al que se redondea el precio sugerido en la carta CUP (0 = sin redondeo)','costeo','number','2026-08-28 12:53:09'),
(2734,'costo_umbral_aviso_variacion','10','Variación (%) del costo a partir de la cual se avisa para revisar los precios de carta','costeo','number','2026-08-28 12:53:09'),
(2735,'carta_precio_derivado','1','Si un platillo no tiene precio propio en la carta Comisión o Zelle, derivarlo del precio CUP en lugar de ocultarlo','precios','boolean','2026-08-28 12:53:28'),
(2736,'carta_comision_factor','1.10','Factor aplicado al precio CUP para derivar el precio de la carta Comisión','precios','number','2026-08-28 12:53:28');
/*!40000 ALTER TABLE `configuraciones` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `configuraciones_sistema`
--

DROP TABLE IF EXISTS `configuraciones_sistema`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuraciones_sistema` (
  `clave` varchar(50) NOT NULL,
  `valor` text DEFAULT NULL,
  `categoria` varchar(30) NOT NULL DEFAULT 'general',
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuraciones_sistema`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `configuraciones_sistema` WRITE;
/*!40000 ALTER TABLE `configuraciones_sistema` DISABLE KEYS */;
INSERT INTO `configuraciones_sistema` VALUES
('app_logo','/img/logo_bahia.png','identidad','Logotipo','Ruta del logotipo principal','2026-06-25 21:27:41'),
('app_moneda','$','finanzas','Simbolo de Moneda','Símbolo de la moneda del sistema','2026-06-25 21:27:41'),
('app_nombre','Restaurante Bahía','identidad','Nombre de la App','Nombre comercial de la aplicación','2026-06-25 21:27:41'),
('categoria_productos','Bebidas,Carnes,Condimentos,Entrantes,Lacteos,Limpieza,Platos Fuertes,Postres,Vegetales','inventario','Categoria Producto','Categorias de organizativas de los productos de inventarios','2026-06-25 21:27:41'),
('cliente_permite_prepedido','0','general','',NULL,'2026-08-19 15:43:45'),
('factura_impuesto','16','finanzas','Impuesto a Ventas','Porcentaje de impuesto general aplicado a las ventas','2026-06-25 21:27:41'),
('factura_propina','10','finanzas','Porciento por Propinas','Porcentaje sugerido para el servicio de mesa','2026-06-25 21:27:41'),
('inventario_unidades','Caja,Uds,Gr,Kg,Lb,Lts,Ml,Paq,Oz,Porciones','inventario','Unidades M. Inventario','Unidades de medida separadas por comas','2026-06-25 21:27:41'),
('salon_areas','Salón Principal,Terraza,Barra,Balcón,Patio','general','',NULL,'2026-08-09 18:51:36'),
('tipo_insumo','Materia Prima / Insumo,Producto Preparado(subproducción),Producto de Venta Directa,Material Operativo / Suministro','inventario','Tipo Insumo','Tipos de Insumos para los productos de inventarios','2026-06-25 21:27:41');
/*!40000 ALTER TABLE `configuraciones_sistema` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `conteo_fisico_detalles`
--

DROP TABLE IF EXISTS `conteo_fisico_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `conteo_fisico_detalles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `conteo_fisico_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `stock_sistema` decimal(18,3) NOT NULL,
  `stock_fisico` decimal(18,3) NOT NULL,
  `diferencia` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `impacto_financiero` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `observaciones` text DEFAULT NULL,
  `contado_por` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cfd_conteo_producto_lote` (`conteo_fisico_id`,`producto_id`,`lote_id`),
  KEY `idx_cfd_conteo` (`conteo_fisico_id`),
  KEY `idx_cfd_producto` (`producto_id`),
  KEY `idx_cfd_lote` (`lote_id`),
  KEY `idx_cfd_usuario` (`contado_por`),
  KEY `idx_cfd_conteo_producto` (`conteo_fisico_id`,`producto_id`),
  CONSTRAINT `fk_cfd_conteo` FOREIGN KEY (`conteo_fisico_id`) REFERENCES `conteos_fisicos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cfd_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cfd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_cfd_usuario` FOREIGN KEY (`contado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conteo_fisico_detalles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `conteo_fisico_detalles` WRITE;
/*!40000 ALTER TABLE `conteo_fisico_detalles` DISABLE KEYS */;
/*!40000 ALTER TABLE `conteo_fisico_detalles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `conteos_fisicos`
--

DROP TABLE IF EXISTS `conteos_fisicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `conteos_fisicos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_conteo` varchar(50) NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `fecha_conteo` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo_conteo` enum('GENERAL','CICLICO','SELECTIVO','AUDITORIA') NOT NULL DEFAULT 'GENERAL',
  `estado` enum('BORRADOR','EN_PROCESO','FINALIZADO','AJUSTADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  `observaciones` text DEFAULT NULL,
  `responsable_usuario_id` int(11) NOT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_conteo` (`numero_conteo`),
  KEY `fk_cf_usuario` (`responsable_usuario_id`),
  KEY `idx_cf_numero` (`numero_conteo`),
  KEY `idx_cf_almacen` (`almacen_id`),
  KEY `idx_cf_fecha` (`fecha_conteo`),
  KEY `idx_cf_estado` (`estado`),
  KEY `idx_cf_tipo` (`tipo_conteo`),
  CONSTRAINT `fk_cf_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_cf_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conteos_fisicos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `conteos_fisicos` WRITE;
/*!40000 ALTER TABLE `conteos_fisicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `conteos_fisicos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `contratos_proveedores`
--

DROP TABLE IF EXISTS `contratos_proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `contratos_proveedores` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint(20) unsigned NOT NULL,
  `numero_contrato` varchar(100) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_cp_proveedor` (`proveedor_id`),
  CONSTRAINT `fk_cp_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contratos_proveedores`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `contratos_proveedores` WRITE;
/*!40000 ALTER TABLE `contratos_proveedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `contratos_proveedores` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `conversiones_unidades`
--

DROP TABLE IF EXISTS `conversiones_unidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversiones_unidades` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned DEFAULT NULL,
  `unidad_origen_id` bigint(20) unsigned NOT NULL,
  `unidad_destino_id` bigint(20) unsigned NOT NULL,
  `factor` decimal(18,8) NOT NULL DEFAULT 1.00000000,
  `es_conversion_base` tinyint(1) DEFAULT 0,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conv_producto_unidades` (`producto_id`,`unidad_origen_id`,`unidad_destino_id`),
  KEY `idx_conv_producto` (`producto_id`),
  KEY `idx_conv_origen` (`unidad_origen_id`),
  KEY `idx_conv_destino` (`unidad_destino_id`),
  CONSTRAINT `fk_conv_destino` FOREIGN KEY (`unidad_destino_id`) REFERENCES `unidades_medida` (`id`),
  CONSTRAINT `fk_conv_origen` FOREIGN KEY (`unidad_origen_id`) REFERENCES `unidades_medida` (`id`),
  CONSTRAINT `fk_conv_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversiones_unidades`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `conversiones_unidades` WRITE;
/*!40000 ALTER TABLE `conversiones_unidades` DISABLE KEYS */;
INSERT INTO `conversiones_unidades` VALUES
(1,NULL,1,2,1000.00000000,0,1,'Global estándar (masa)','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(2,NULL,2,1,0.00100000,1,1,'Global estándar (masa) — base: todo PESO conviene expresarlo en kg','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(3,NULL,3,1,0.45359237,1,1,'Global estándar (masa)','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(4,NULL,1,3,2.20462262,0,1,'Global estándar (masa)','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(5,NULL,5,4,0.00100000,1,1,'Global estándar (volumen) — base: todo VOLUMEN conviene expresarlo en l','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(6,NULL,4,5,1000.00000000,0,1,'Global estándar (volumen)','2026-08-25 21:01:44','2026-08-25 21:01:44'),
(7,94,4,5,1000.00000000,0,1,'Cambio de litro a mililitro','2026-08-26 03:10:50','2026-08-26 03:10:50'),
(8,NULL,10,5,700.00000000,0,1,'Aplicable para todas las botellas de 700 ml','2026-08-27 17:38:14','2026-08-29 02:00:37');
/*!40000 ALTER TABLE `conversiones_unidades` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `costos_historicos`
--

DROP TABLE IF EXISTS `costos_historicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_historicos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `fecha_vigencia` datetime NOT NULL,
  `costo_anterior` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `costo_nuevo` decimal(18,4) NOT NULL,
  `tipo_costo` enum('ULTIMO_COSTO','PROMEDIO_PONDERADO','FIFO','LIFO','MANUAL') NOT NULL DEFAULT 'ULTIMO_COSTO',
  `origen_tipo` enum('COMPRA','RECEPCION','AJUSTE','ACTUALIZACION_MANUAL','MIGRACION') NOT NULL,
  `origen_id` bigint(20) unsigned DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ch_usuario` (`creado_por`),
  KEY `idx_ch_producto` (`producto_id`),
  KEY `idx_ch_fecha` (`fecha_vigencia`),
  KEY `idx_ch_tipo` (`tipo_costo`),
  KEY `idx_ch_origen` (`origen_tipo`),
  KEY `idx_ch_producto_fecha` (`producto_id`,`fecha_vigencia`),
  CONSTRAINT `fk_ch_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ch_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costos_historicos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `costos_historicos` WRITE;
/*!40000 ALTER TABLE `costos_historicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `costos_historicos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `dashboard_resumen_diario`
--

DROP TABLE IF EXISTS `dashboard_resumen_diario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_resumen_diario` (
  `fecha` date NOT NULL,
  `valor_inventario` decimal(18,2) DEFAULT NULL,
  `costo_mermas` decimal(18,2) DEFAULT NULL,
  `compras_mes` decimal(18,2) DEFAULT NULL,
  `productos_bajo_minimo` int(11) DEFAULT NULL,
  `productos_vencidos` int(11) DEFAULT NULL,
  `exactitud_inventario` decimal(10,2) DEFAULT NULL,
  `cumplimiento_proveedor` decimal(10,2) DEFAULT NULL,
  `ejecucion_presupuesto` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_resumen_diario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `dashboard_resumen_diario` WRITE;
/*!40000 ALTER TABLE `dashboard_resumen_diario` DISABLE KEYS */;
/*!40000 ALTER TABLE `dashboard_resumen_diario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `dashboard_widgets`
--

DROP TABLE IF EXISTS `dashboard_widgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_widgets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` bigint(20) unsigned NOT NULL,
  `kpi_id` bigint(20) unsigned DEFAULT NULL,
  `tipo` enum('TARJETA','GRAFICA_LINEA','GRAFICA_BARRAS','PIE','TABLA','GAUGE') NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `posicion_x` int(11) NOT NULL DEFAULT 0,
  `posicion_y` int(11) NOT NULL DEFAULT 0,
  `ancho` int(11) NOT NULL DEFAULT 4,
  `alto` int(11) NOT NULL DEFAULT 3,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_dw_dashboard` (`dashboard_id`),
  KEY `fk_dw_kpi` (`kpi_id`),
  CONSTRAINT `fk_dw_dashboard` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dw_kpi` FOREIGN KEY (`kpi_id`) REFERENCES `kpis` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_widgets`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `dashboard_widgets` WRITE;
/*!40000 ALTER TABLE `dashboard_widgets` DISABLE KEYS */;
/*!40000 ALTER TABLE `dashboard_widgets` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `dashboards`
--

DROP TABLE IF EXISTS `dashboards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboards` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `publico` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboards`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `dashboards` WRITE;
/*!40000 ALTER TABLE `dashboards` DISABLE KEYS */;
/*!40000 ALTER TABLE `dashboards` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalle_asignacion_mesa`
--

DROP TABLE IF EXISTS `detalle_asignacion_mesa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_asignacion_mesa` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asignacion_diaria_id` int(11) NOT NULL,
  `mesa_id` int(11) NOT NULL,
  `dependiente_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asignacion_mesa` (`asignacion_diaria_id`,`mesa_id`),
  KEY `mesa_id` (`mesa_id`),
  KEY `dependiente_id` (`dependiente_id`),
  CONSTRAINT `detalle_asignacion_mesa_ibfk_1` FOREIGN KEY (`asignacion_diaria_id`) REFERENCES `asignaciones_diarias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalle_asignacion_mesa_ibfk_2` FOREIGN KEY (`mesa_id`) REFERENCES `mesas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalle_asignacion_mesa_ibfk_3` FOREIGN KEY (`dependiente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_asignacion_mesa`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalle_asignacion_mesa` WRITE;
/*!40000 ALTER TABLE `detalle_asignacion_mesa` DISABLE KEYS */;
INSERT INTO `detalle_asignacion_mesa` VALUES
(101,15,20,2),
(102,15,22,2),
(103,15,23,17),
(104,15,27,4),
(105,16,24,17),
(106,16,25,11),
(107,16,28,4),
(108,17,26,11),
(109,18,20,2),
(110,18,22,2),
(111,18,23,17),
(112,18,27,4),
(113,19,24,17),
(114,19,25,11),
(115,19,28,4),
(116,20,26,11);
/*!40000 ALTER TABLE `detalle_asignacion_mesa` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalle_orden_compra`
--

DROP TABLE IF EXISTS `detalle_orden_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_orden_compra` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `orden_compra_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `cantidad_solicitada` decimal(18,3) NOT NULL,
  `cantidad_recibida` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_unitario` decimal(18,4) NOT NULL,
  `porcentaje_impuesto` decimal(5,2) NOT NULL DEFAULT 0.00,
  `porcentaje_descuento` decimal(5,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(18,2) NOT NULL,
  `impuesto_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `descuento_total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_linea` decimal(18,2) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_doc_orden` (`orden_compra_id`),
  KEY `idx_doc_producto` (`producto_id`),
  KEY `idx_doc_orden_producto` (`orden_compra_id`,`producto_id`),
  CONSTRAINT `fk_doc_orden` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_orden_compra`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalle_orden_compra` WRITE;
/*!40000 ALTER TABLE `detalle_orden_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_orden_compra` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalle_recepcion`
--

DROP TABLE IF EXISTS `detalle_recepcion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_recepcion` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `recepcion_id` bigint(20) unsigned NOT NULL,
  `detalle_orden_compra_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `cantidad_recibida` decimal(18,3) NOT NULL,
  `cantidad_rechazada` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_unitario` decimal(18,4) NOT NULL,
  `subtotal` decimal(18,2) NOT NULL,
  `motivo_rechazo` varchar(255) DEFAULT NULL,
  `requiere_lote` tinyint(1) NOT NULL DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_dr_recepcion` (`recepcion_id`),
  KEY `idx_dr_producto` (`producto_id`),
  KEY `idx_dr_detalle_oc` (`detalle_orden_compra_id`),
  CONSTRAINT `fk_dr_detalle_oc` FOREIGN KEY (`detalle_orden_compra_id`) REFERENCES `detalle_orden_compra` (`id`),
  CONSTRAINT `fk_dr_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_dr_recepcion` FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_recepcion`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalle_recepcion` WRITE;
/*!40000 ALTER TABLE `detalle_recepcion` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_recepcion` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalle_transferencia`
--

DROP TABLE IF EXISTS `detalle_transferencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_transferencia` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transferencia_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad_solicitada` decimal(18,3) NOT NULL,
  `cantidad_enviada` decimal(18,3) NOT NULL DEFAULT 0.000,
  `cantidad_recibida` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_unitario` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_dt_transferencia` (`transferencia_id`),
  KEY `idx_dt_producto` (`producto_id`),
  KEY `idx_dt_lote` (`lote_id`),
  KEY `idx_dt_transferencia_producto` (`transferencia_id`,`producto_id`),
  CONSTRAINT `fk_dt_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dt_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_dt_transferencia` FOREIGN KEY (`transferencia_id`) REFERENCES `transferencias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_transferencia`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalle_transferencia` WRITE;
/*!40000 ALTER TABLE `detalle_transferencia` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_transferencia` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalles_pedido`
--

DROP TABLE IF EXISTS `detalles_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_pedido` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_pedido` bigint(20) unsigned NOT NULL,
  `id_platillo` bigint(20) unsigned NOT NULL,
  `es_platillo_dia` tinyint(1) NOT NULL DEFAULT 0,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `notas_especiales` varchar(255) DEFAULT NULL,
  `estado_item` enum('en_espera','en_cocina','en_bar','listo','entregado','cancelado') DEFAULT 'en_espera',
  `afecta_inventario` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_dp_pedido` (`id_pedido`),
  KEY `fk_dp_platillo` (`id_platillo`),
  KEY `idx_dp_estado_item` (`estado_item`,`afecta_inventario`),
  CONSTRAINT `fk_dp_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_pedido`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalles_pedido` WRITE;
/*!40000 ALTER TABLE `detalles_pedido` DISABLE KEYS */;
INSERT INTO `detalles_pedido` VALUES
(34,13,107,0,2,320.00,NULL,'entregado',1),
(35,13,65,0,1,4100.00,NULL,'entregado',1),
(36,15,107,0,2,320.00,NULL,'entregado',1),
(37,15,89,0,1,2550.00,NULL,'entregado',1),
(38,13,65,0,1,4100.00,NULL,'entregado',1),
(39,14,65,0,1,4100.00,NULL,'entregado',1),
(40,14,158,0,1,1.00,NULL,'entregado',1),
(41,14,107,0,1,320.00,NULL,'entregado',1),
(42,14,91,0,1,300.00,NULL,'entregado',1),
(43,16,4,1,1,1200.00,'Para compartir','entregado',1),
(44,16,5,1,2,500.00,NULL,'entregado',1),
(45,17,5,1,1,500.00,NULL,'entregado',1),
(46,17,4,1,1,1200.00,NULL,'entregado',1),
(47,18,4,1,1,1200.00,NULL,'entregado',1),
(48,18,107,0,2,320.00,NULL,'entregado',1),
(49,19,12,0,2,350.00,'CANCELADO: se va','cancelado',0),
(50,19,12,0,2,350.00,NULL,'entregado',1),
(51,21,12,0,3,350.00,NULL,'entregado',1),
(52,22,12,0,1,350.00,NULL,'entregado',1);
/*!40000 ALTER TABLE `detalles_pedido` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `detalles_pedido_modificadores`
--

DROP TABLE IF EXISTS `detalles_pedido_modificadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_pedido_modificadores` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `detalle_pedido_id` bigint(20) unsigned NOT NULL,
  `modificador_id` bigint(20) unsigned NOT NULL,
  `precio_cobrado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_dpm_detalle` (`detalle_pedido_id`),
  KEY `fk_dpm_modificador` (`modificador_id`),
  CONSTRAINT `fk_dpm_detalle` FOREIGN KEY (`detalle_pedido_id`) REFERENCES `detalles_pedido` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dpm_modificador` FOREIGN KEY (`modificador_id`) REFERENCES `modificadores_menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_pedido_modificadores`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalles_pedido_modificadores` WRITE;
/*!40000 ALTER TABLE `detalles_pedido_modificadores` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalles_pedido_modificadores` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `eventos_demanda`
--

DROP TABLE IF EXISTS `eventos_demanda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_demanda` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `factor_demanda` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_demanda`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `eventos_demanda` WRITE;
/*!40000 ALTER TABLE `eventos_demanda` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_demanda` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `eventos_demanda_productos`
--

DROP TABLE IF EXISTS `eventos_demanda_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos_demanda_productos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `evento_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `factor_demanda` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_edp_evento` (`evento_id`),
  KEY `fk_edp_producto` (`producto_id`),
  CONSTRAINT `fk_edp_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_demanda` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_edp_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos_demanda_productos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `eventos_demanda_productos` WRITE;
/*!40000 ALTER TABLE `eventos_demanda_productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `eventos_demanda_productos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `factura_pedidos`
--

DROP TABLE IF EXISTS `factura_pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura_pedidos` (
  `factura_id` bigint(20) unsigned NOT NULL,
  `pedido_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`factura_id`,`pedido_id`),
  KEY `fk_fp_pedido` (`pedido_id`),
  CONSTRAINT `fk_fp_factura` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fp_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factura_pedidos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `factura_pedidos` WRITE;
/*!40000 ALTER TABLE `factura_pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `factura_pedidos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `facturas`
--

DROP TABLE IF EXISTS `facturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `facturas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_factura` varchar(50) NOT NULL,
  `cliente_empresa` varchar(150) NOT NULL,
  `rnc_identificacion` varchar(50) DEFAULT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('pendiente','pagado_parcial','pagado','anulado') NOT NULL DEFAULT 'pendiente',
  `fecha_emision` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_vencimiento` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_numero_factura` (`numero_factura`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facturas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `facturas` WRITE;
/*!40000 ALTER TABLE `facturas` DISABLE KEYS */;
/*!40000 ALTER TABLE `facturas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `fichas_costo_conceptos`
--

DROP TABLE IF EXISTS `fichas_costo_conceptos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichas_costo_conceptos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ficha_id` int(10) unsigned NOT NULL,
  `concepto` varchar(120) NOT NULL,
  `tipo` enum('FIJO','PORCENTAJE') NOT NULL DEFAULT 'FIJO' COMMENT 'FIJO: importe sobre la presentación. PORCENTAJE: % sobre el costo con merma',
  `valor` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `orden` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_concepto_ficha` (`ficha_id`),
  CONSTRAINT `fk_concepto_ficha` FOREIGN KEY (`ficha_id`) REFERENCES `fichas_costo_producto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fichas_costo_conceptos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `fichas_costo_conceptos` WRITE;
/*!40000 ALTER TABLE `fichas_costo_conceptos` DISABLE KEYS */;
/*!40000 ALTER TABLE `fichas_costo_conceptos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `fichas_costo_producto`
--

DROP TABLE IF EXISTS `fichas_costo_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichas_costo_producto` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` int(11) NOT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  `vigente` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Solo una ficha vigente por producto; las anteriores quedan como histórico',
  `precio_compra` decimal(14,4) NOT NULL DEFAULT 0.0000 COMMENT 'Precio pagado por la presentación completa (saco, caja, litro...)',
  `cantidad_presentacion` decimal(14,4) NOT NULL DEFAULT 1.0000 COMMENT 'Cuántas unidades de inventario trae la presentación comprada',
  `unidad_compra_id` int(11) DEFAULT NULL,
  `unidad_inventario_id` int(11) DEFAULT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `porcentaje_merma` decimal(6,3) NOT NULL DEFAULT 0.000 COMMENT 'Merma de limpieza/preparación en % (0-99.9)',
  `costo_flete` decimal(14,4) NOT NULL DEFAULT 0.0000 COMMENT 'Transporte imputable a la presentación completa',
  `costo_envase` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `costo_mano_obra` decimal(14,4) NOT NULL DEFAULT 0.0000 COMMENT 'Limpieza, porcionado o preparación previa',
  `otros_costos` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `porcentaje_imprevistos` decimal(6,3) NOT NULL DEFAULT 5.000 COMMENT 'Colchón estándar de la industria: 5%',
  `costo_unitario_bruto` decimal(14,6) NOT NULL DEFAULT 0.000000 COMMENT 'Precio de compra / cantidad de la presentación',
  `costo_unitario_neto` decimal(14,6) NOT NULL DEFAULT 0.000000 COMMENT 'Costo bruto ajustado por merma',
  `costo_final_unitario` decimal(14,6) NOT NULL DEFAULT 0.000000 COMMENT 'Costo real por unidad de inventario, con todos los conceptos',
  `rendimiento_porcentaje` decimal(6,3) NOT NULL DEFAULT 100.000,
  `factor_rendimiento` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `observaciones` text DEFAULT NULL,
  `creada_por` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ficha_producto` (`producto_id`,`vigente`),
  KEY `idx_ficha_vigente` (`vigente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fichas_costo_producto`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `fichas_costo_producto` WRITE;
/*!40000 ALTER TABLE `fichas_costo_producto` DISABLE KEYS */;
INSERT INTO `fichas_costo_producto` VALUES
(1,28,1,1,1200.0000,1.0000,4,4,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,1200.000000,1200.000000,1200.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09'),
(2,73,1,1,1000.0000,1.0000,1,1,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,1000.000000,1000.000000,1000.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09'),
(3,106,1,1,3000.0000,1.0000,10,10,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,3000.000000,3000.000000,3000.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09'),
(4,113,1,1,400.0000,1.0000,8,8,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,400.000000,400.000000,400.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09'),
(5,114,1,1,8500.0000,1.0000,7,6,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,8500.000000,8500.000000,8500.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09'),
(6,115,1,1,100.0000,1.0000,7,8,NULL,0.000,0.0000,0.0000,0.0000,0.0000,0.000,100.000000,100.000000,100.000000,100.000,1.0000,'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.',NULL,'2026-08-28 12:53:09','2026-08-28 12:53:09');
/*!40000 ALTER TABLE `fichas_costo_producto` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `historial_precios_platillo`
--

DROP TABLE IF EXISTS `historial_precios_platillo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_precios_platillo` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `platillo_id` int(11) NOT NULL,
  `es_platillo_dia` tinyint(1) NOT NULL DEFAULT 0,
  `origen_producto_id` int(11) DEFAULT NULL COMMENT 'Insumo cuyo cambio de precio disparó la revisión',
  `carta` enum('CUP','COMISION','ZELLE') NOT NULL,
  `precio_anterior` decimal(14,4) DEFAULT NULL,
  `precio_nuevo` decimal(14,4) NOT NULL,
  `costo_platillo` decimal(14,4) DEFAULT NULL,
  `food_cost_anterior` decimal(8,3) DEFAULT NULL,
  `food_cost_nuevo` decimal(8,3) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_histp_platillo` (`platillo_id`,`creado_en`),
  KEY `idx_histp_origen` (`origen_producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_precios_platillo`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `historial_precios_platillo` WRITE;
/*!40000 ALTER TABLE `historial_precios_platillo` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_precios_platillo` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `historial_precios_producto`
--

DROP TABLE IF EXISTS `historial_precios_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_precios_producto` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` int(11) NOT NULL,
  `ficha_id` int(10) unsigned DEFAULT NULL,
  `costo_anterior` decimal(14,6) DEFAULT NULL,
  `costo_nuevo` decimal(14,6) NOT NULL,
  `variacion_porcentaje` decimal(10,3) DEFAULT NULL,
  `platillos_afectados` int(10) unsigned NOT NULL DEFAULT 0,
  `precios_actualizados` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Cuántos platillos vieron su precio de carta modificado a raíz de este cambio',
  `motivo` varchar(255) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_hist_producto` (`producto_id`,`creado_en`),
  KEY `idx_hist_fecha` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_precios_producto`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `historial_precios_producto` WRITE;
/*!40000 ALTER TABLE `historial_precios_producto` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_precios_producto` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `stock_actual` decimal(18,3) NOT NULL DEFAULT 0.000,
  `stock_reservado` decimal(18,3) NOT NULL DEFAULT 0.000,
  `ultimo_movimiento` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ubicacion_id` bigint(20) unsigned DEFAULT NULL,
  `version_row` bigint(20) NOT NULL DEFAULT 1,
  `stock_disponible` decimal(18,3) GENERATED ALWAYS AS (`stock_actual` - `stock_reservado`) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_producto_almacen` (`producto_id`,`almacen_id`),
  KEY `idx_inventario_producto` (`producto_id`),
  KEY `idx_inventario_almacen` (`almacen_id`),
  KEY `idx_inventario_movimiento` (`ultimo_movimiento`),
  KEY `fk_inv_ubicacion` (`ubicacion_id`),
  KEY `idx_inv_producto_ubicacion` (`producto_id`,`ubicacion_id`),
  CONSTRAINT `fk_inv_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventario_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventario_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inventario` WRITE;
/*!40000 ALTER TABLE `inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `inventario_lotes`
--

DROP TABLE IF EXISTS `inventario_lotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_lotes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned NOT NULL,
  `stock_actual` decimal(18,3) NOT NULL DEFAULT 0.000,
  `stock_reservado` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_unitario` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_producto_almacen_lote` (`producto_id`,`almacen_id`,`lote_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario_lotes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inventario_lotes` WRITE;
/*!40000 ALTER TABLE `inventario_lotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventario_lotes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `inventario_reservado`
--

DROP TABLE IF EXISTS `inventario_reservado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_reservado` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `ubicacion_id` bigint(20) unsigned DEFAULT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad_reservada` decimal(18,3) NOT NULL,
  `origen_tipo` enum('PRODUCCION','TRANSFERENCIA','EVENTO','CATERING','PEDIDO','REQUISICION_COCINA','OTRO') NOT NULL,
  `origen_id` bigint(20) unsigned NOT NULL,
  `fecha_reserva` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_expiracion` datetime DEFAULT NULL,
  `estado` enum('ACTIVA','CONSUMIDA','LIBERADA','CANCELADA') NOT NULL DEFAULT 'ACTIVA',
  `observaciones` text DEFAULT NULL,
  `creado_por` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ir_ubicacion` (`ubicacion_id`),
  KEY `fk_ir_usuario` (`creado_por`),
  KEY `idx_ir_producto` (`producto_id`),
  KEY `idx_ir_almacen` (`almacen_id`),
  KEY `idx_ir_lote` (`lote_id`),
  KEY `idx_ir_estado` (`estado`),
  KEY `idx_ir_origen` (`origen_tipo`,`origen_id`),
  KEY `idx_ir_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_ir_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_ir_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ir_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_ir_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ir_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario_reservado`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `inventario_reservado` WRITE;
/*!40000 ALTER TABLE `inventario_reservado` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventario_reservado` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `kpi_categorias`
--

DROP TABLE IF EXISTS `kpi_categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_categorias` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_categorias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `kpi_categorias` WRITE;
/*!40000 ALTER TABLE `kpi_categorias` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_categorias` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `kpi_objetivos`
--

DROP TABLE IF EXISTS `kpi_objetivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_objetivos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `kpi_id` bigint(20) unsigned NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `valor_objetivo` decimal(18,4) NOT NULL,
  `valor_minimo` decimal(18,4) DEFAULT NULL,
  `valor_maximo` decimal(18,4) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_kpi_objetivo_kpi` (`kpi_id`),
  CONSTRAINT `fk_kpi_objetivo_kpi` FOREIGN KEY (`kpi_id`) REFERENCES `kpis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_objetivos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `kpi_objetivos` WRITE;
/*!40000 ALTER TABLE `kpi_objetivos` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_objetivos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `kpi_resultados`
--

DROP TABLE IF EXISTS `kpi_resultados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_resultados` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `kpi_id` bigint(20) unsigned NOT NULL,
  `fecha_calculo` date NOT NULL,
  `valor` decimal(18,4) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_kpi_resultado` (`kpi_id`),
  CONSTRAINT `fk_kpi_resultado` FOREIGN KEY (`kpi_id`) REFERENCES `kpis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_resultados`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `kpi_resultados` WRITE;
/*!40000 ALTER TABLE `kpi_resultados` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_resultados` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `kpis`
--

DROP TABLE IF EXISTS `kpis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpis` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `categoria_id` bigint(20) unsigned NOT NULL,
  `codigo` varchar(100) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `unidad_medida` varchar(50) DEFAULT NULL,
  `formula` text DEFAULT NULL,
  `frecuencia` enum('DIARIO','SEMANAL','MENSUAL','TRIMESTRAL','ANUAL') NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_kpi_categoria` (`categoria_id`),
  CONSTRAINT `fk_kpi_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `kpi_categorias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpis`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `kpis` WRITE;
/*!40000 ALTER TABLE `kpis` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpis` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `licencia_dias`
--

DROP TABLE IF EXISTS `licencia_dias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `licencia_dias` (
  `dia` char(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `primera_actividad` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`dia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licencia_dias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `licencia_dias` WRITE;
/*!40000 ALTER TABLE `licencia_dias` DISABLE KEYS */;
/*!40000 ALTER TABLE `licencia_dias` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `licencia_estado`
--

DROP TABLE IF EXISTS `licencia_estado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `licencia_estado` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `instalacion_uuid` char(36) NOT NULL COMMENT 'Identidad de esta instalación; la licencia se emite contra ella',
  `licencia_id` varchar(40) DEFAULT NULL,
  `trinquete_ms` bigint(20) unsigned NOT NULL DEFAULT 0 COMMENT 'Máximo instante jamás observado: solo avanza, nunca retrocede',
  `dias_consumidos` int(10) unsigned NOT NULL DEFAULT 0,
  `ultimo_dia` char(10) DEFAULT NULL COMMENT 'Último día natural con actividad (YYYY-MM-DD)',
  `secuencia` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Número de arranques',
  `cadena` char(64) DEFAULT NULL COMMENT 'Cadena de hash de los arranques',
  `estado` varchar(20) DEFAULT NULL,
  `gracia_desde_ms` bigint(20) unsigned DEFAULT NULL,
  `sello` char(64) DEFAULT NULL COMMENT 'HMAC del contenido: detecta ediciones manuales',
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licencia_estado`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `licencia_estado` WRITE;
/*!40000 ALTER TABLE `licencia_estado` DISABLE KEYS */;
INSERT INTO `licencia_estado` VALUES
(1,'732496aa-f5d8-4e53-b38a-6d1d54e55b2f',NULL,1788009771806,2,'2026-08-29',496,'41038809a949c5858b866b8c63e567fdf43905a864bafde4936c50dade4b67a7','NO_CONFIGURADA',NULL,'7437c80e5527e96f064603df7702c44324a6483df6cdb74147596c680882dd52','2026-08-29 13:22:51');
/*!40000 ALTER TABLE `licencia_estado` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `licencia_eventos`
--

DROP TABLE IF EXISTS `licencia_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `licencia_eventos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tipo` varchar(60) NOT NULL,
  `gravedad` varchar(10) NOT NULL DEFAULT 'INFO',
  `detalle` text DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_lic_ev_fecha` (`creado_en`),
  KEY `idx_lic_ev_tipo` (`tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licencia_eventos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `licencia_eventos` WRITE;
/*!40000 ALTER TABLE `licencia_eventos` DISABLE KEYS */;
INSERT INTO `licencia_eventos` VALUES
(1,'INSTALACION_CREADA','INFO','{\"instalacion\":\"732496aa-f5d8-4e53-b38a-6d1d54e55b2f\"}','2026-08-28 13:37:22');
/*!40000 ALTER TABLE `licencia_eventos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `lotes`
--

DROP TABLE IF EXISTS `lotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lotes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `numero_lote` varchar(100) NOT NULL,
  `lote_proveedor` varchar(100) DEFAULT NULL,
  `fecha_fabricacion` date DEFAULT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `cantidad_inicial` decimal(18,3) NOT NULL,
  `cantidad_actual` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `proveedor_id` bigint(20) unsigned DEFAULT NULL,
  `estado` enum('ACTIVO','AGOTADO','VENCIDO','BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ubicacion_id` bigint(20) unsigned DEFAULT NULL,
  `unidad_medida_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad_ingresada` decimal(18,3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lote_producto` (`producto_id`,`numero_lote`),
  KEY `fk_lote_proveedor` (`proveedor_id`),
  KEY `idx_lotes_producto` (`producto_id`),
  KEY `idx_lotes_almacen` (`almacen_id`),
  KEY `idx_lotes_vencimiento` (`fecha_vencimiento`),
  KEY `idx_lotes_estado` (`estado`),
  KEY `idx_lotes_numero` (`numero_lote`),
  KEY `idx_lotes_producto_vencimiento` (`producto_id`,`fecha_vencimiento`),
  KEY `fk_lote_ubicacion` (`ubicacion_id`),
  KEY `idx_lote_producto_almacen` (`producto_id`,`almacen_id`),
  CONSTRAINT `fk_lote_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_lote_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_lote_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lote_ubicacion` FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lotes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `lotes` WRITE;
/*!40000 ALTER TABLE `lotes` DISABLE KEYS */;
INSERT INTO `lotes` VALUES
(17,106,1,'LOT-2026-001',NULL,NULL,'2026-08-27',NULL,20.000,20.000,3000.0000,NULL,'ACTIVO',NULL,'2026-08-27 17:49:40','2026-08-27 17:49:40',NULL,10,20.000),
(18,73,1,'LOT-2026-003',NULL,NULL,'2026-08-28',NULL,20.000,19.000,1000.0000,NULL,'ACTIVO',NULL,'2026-08-28 20:06:12','2026-08-29 02:23:10',NULL,1,20.000),
(19,117,1,'LOT-2026-004',NULL,NULL,'2026-08-28',NULL,7.000,5.000,6000.0000,NULL,'ACTIVO',NULL,'2026-08-28 20:15:28','2026-08-29 02:23:10',NULL,10,7.000),
(20,70,1,'LOT-2026-005',NULL,NULL,'2026-08-29',NULL,20.500,18.500,350.0000,NULL,'ACTIVO',NULL,'2026-08-29 02:20:14','2026-08-29 02:23:10',NULL,1,20.500),
(21,117,5,'LOT-2026-004-TR5',NULL,NULL,'2026-08-28',NULL,2.000,1.786,6000.0000,NULL,'ACTIVO',NULL,'2026-08-29 02:23:10','2026-08-29 12:10:18',NULL,10,2.000),
(22,70,5,'LOT-2026-005-TR5',NULL,NULL,'2026-08-28',NULL,2.000,1.910,350.0000,NULL,'ACTIVO',NULL,'2026-08-29 02:23:10','2026-08-29 12:10:18',NULL,1,2.000),
(23,73,5,'LOT-2026-003-TR5',NULL,NULL,'2026-08-28',NULL,1.000,0.970,1000.0000,NULL,'ACTIVO',NULL,'2026-08-29 02:23:10','2026-08-29 12:10:18',NULL,1,1.000);
/*!40000 ALTER TABLE `lotes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `mermas`
--

DROP TABLE IF EXISTS `mermas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mermas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_merma` varchar(50) NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `fecha_merma` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo_merma` enum('VENCIMIENTO','DANO','ROBO','DERRAME','CONTAMINACION','ERROR_PRODUCCION','DESCOMPOSICION','AJUSTE_OPERATIVO','OTRO') NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL,
  `costo_total` decimal(18,4) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `reportado_por` int(11) NOT NULL,
  `autorizado_por` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_merma` (`numero_merma`),
  KEY `fk_merma_autorizado` (`autorizado_por`),
  KEY `idx_merma_fecha` (`fecha_merma`),
  KEY `idx_merma_producto` (`producto_id`),
  KEY `idx_merma_almacen` (`almacen_id`),
  KEY `idx_merma_lote` (`lote_id`),
  KEY `idx_merma_tipo` (`tipo_merma`),
  KEY `idx_merma_reportado` (`reportado_por`),
  CONSTRAINT `fk_merma_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_merma_autorizado` FOREIGN KEY (`autorizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_merma_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_merma_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_merma_reportado` FOREIGN KEY (`reportado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mermas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `mermas` WRITE;
/*!40000 ALTER TABLE `mermas` DISABLE KEYS */;
/*!40000 ALTER TABLE `mermas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `mesas`
--

DROP TABLE IF EXISTS `mesas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mesas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(100) NOT NULL,
  `capacidad` int(11) NOT NULL,
  `estado` enum('libre','ocupada','reservada','desocupandose','mantenimiento') NOT NULL DEFAULT 'libre',
  `ubicacion` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `carta` enum('CUP','COMISION','ZELLE') DEFAULT 'CUP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero` (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mesas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `mesas` WRITE;
/*!40000 ALTER TABLE `mesas` DISABLE KEYS */;
INSERT INTO `mesas` VALUES
(20,'Nro 1',2,'libre','Salon Principal','2026-08-27 14:05:53','2026-08-27 14:05:53','CUP'),
(22,'Nro 2',4,'libre','Salon Principal','2026-08-27 14:06:20','2026-08-27 14:06:20','CUP'),
(23,'Nro 3',6,'libre','Salon Principal','2026-08-27 14:06:37','2026-08-27 14:06:37','CUP'),
(24,'Nro 4',4,'libre','Terraza','2026-08-27 14:06:56','2026-08-27 14:06:56','CUP'),
(25,'Nro 5',8,'ocupada','Terraza','2026-08-27 14:07:21','2026-08-29 01:27:25','CUP'),
(26,'Nro 6',2,'libre','Balcon','2026-08-27 14:07:39','2026-08-28 17:12:56','CUP'),
(27,'Nro 7',4,'libre','Salon Principal','2026-08-27 14:08:27','2026-08-29 02:38:07','CUP'),
(28,'Nro 8',6,'libre','Terraza','2026-08-27 14:08:48','2026-08-29 12:10:18','CUP');
/*!40000 ALTER TABLE `mesas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `modificadores_menu`
--

DROP TABLE IF EXISTS `modificadores_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `modificadores_menu` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('ADICION','EXCLUSION','SUSTITUCION') NOT NULL DEFAULT 'ADICION',
  `precio_adicional` decimal(10,2) NOT NULL DEFAULT 0.00,
  `producto_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad_insumo` decimal(18,4) DEFAULT 0.0000,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_mod_producto` (`producto_id`),
  CONSTRAINT `fk_mod_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modificadores_menu`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `modificadores_menu` WRITE;
/*!40000 ALTER TABLE `modificadores_menu` DISABLE KEYS */;
/*!40000 ALTER TABLE `modificadores_menu` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `monedas`
--

DROP TABLE IF EXISTS `monedas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `monedas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(5) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `simbolo` varchar(5) NOT NULL DEFAULT '$',
  `factor_cambio` decimal(12,4) NOT NULL DEFAULT 1.0000,
  `es_moneda_base` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monedas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `monedas` WRITE;
/*!40000 ALTER TABLE `monedas` DISABLE KEYS */;
INSERT INTO `monedas` VALUES
(1,'CUP','Peso Cubano (Moneda Local)','$',1.0000,1,1),
(2,'USD','Dolar Estadounidense','$',660.0000,0,1),
(3,'CUSD','Dolar Canadiense','$',443.1600,0,1),
(4,'MEX','Peso Mexicano','$',1.3700,0,1),
(5,'EUR','Euro','€',785.0000,0,1),
(6,'LSD','Libra Esterlina','£',780.2300,0,1),
(7,'ZELLE','Zelle (Dólar estadounidense)','$',660.0000,0,1);
/*!40000 ALTER TABLE `monedas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `monedas_turno`
--

DROP TABLE IF EXISTS `monedas_turno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `monedas_turno` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `turno_servicio_id` bigint(20) unsigned NOT NULL,
  `moneda_id` int(11) NOT NULL,
  `factor_cambio_turno` decimal(12,4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_mt_turno` (`turno_servicio_id`),
  KEY `fk_mt_moneda` (`moneda_id`),
  CONSTRAINT `fk_mt_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_mt_turno` FOREIGN KEY (`turno_servicio_id`) REFERENCES `turnos_servicio` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monedas_turno`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `monedas_turno` WRITE;
/*!40000 ALTER TABLE `monedas_turno` DISABLE KEYS */;
INSERT INTO `monedas_turno` VALUES
(19,5,1,1.0000),
(20,5,3,443.1600),
(21,5,5,785.0000),
(22,5,6,780.2300),
(23,5,4,1.3700),
(24,5,2,660.0000),
(25,6,1,1.0000),
(26,6,3,443.1600),
(27,6,5,785.0000),
(28,6,6,780.2300),
(29,6,4,1.3700),
(30,6,2,660.0000),
(31,7,1,1.0000),
(32,7,3,443.1600),
(33,7,5,785.0000),
(34,7,6,780.2300),
(35,7,4,1.3700),
(36,7,2,670.0000),
(49,3,1,1.0000),
(50,3,3,443.1600),
(51,3,5,785.0000),
(52,3,6,780.2300),
(53,3,4,1.3700),
(54,3,2,660.0000),
(55,3,7,660.0000),
(56,4,1,1.0000),
(57,4,3,443.1600),
(58,4,5,785.0000),
(59,4,6,780.2300),
(60,4,4,1.3700),
(61,4,2,660.0000),
(62,4,7,660.0000);
/*!40000 ALTER TABLE `monedas_turno` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `fecha_movimiento` datetime NOT NULL DEFAULT current_timestamp(),
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `tipo_movimiento` enum('COMPRA','RECEPCION','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_SALIDA','VENTA','CONSUMO_RECETA','PRODUCCION_ENTRADA','PRODUCCION_SALIDA','MERMA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','DEVOLUCION_PROVEEDOR','DEVOLUCION_CLIENTE','CONTEO_FISICO') NOT NULL,
  `referencia_tipo` varchar(50) DEFAULT NULL,
  `referencia_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `costo_total` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `stock_anterior` decimal(18,3) NOT NULL DEFAULT 0.000,
  `stock_nuevo` decimal(18,3) NOT NULL DEFAULT 0.000,
  `observaciones` text DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `documento_numero` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mov_fecha` (`fecha_movimiento`),
  KEY `idx_mov_producto` (`producto_id`),
  KEY `idx_mov_almacen` (`almacen_id`),
  KEY `idx_mov_tipo` (`tipo_movimiento`),
  KEY `idx_mov_referencia` (`referencia_tipo`,`referencia_id`),
  KEY `idx_mov_usuario` (`usuario_id`),
  KEY `idx_mov_producto_fecha` (`producto_id`,`fecha_movimiento`),
  KEY `fk_mov_lote` (`lote_id`),
  CONSTRAINT `fk_mov_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_mov_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_inventario`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
INSERT INTO `movimientos_inventario` VALUES
(1,'2026-08-25 13:26:02',113,1,NULL,'AJUSTE_POSITIVO','entrada_almacen',12,8.000,400.0000,3200.0000,0.000,8.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-25 17:26:02','LOT-2026-003'),
(2,'2026-08-25 13:26:34',106,1,NULL,'AJUSTE_POSITIVO','entrada_almacen',13,10.000,1500.0000,15000.0000,0.000,10.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-25 17:26:34','LOT-2026-004'),
(3,'2026-08-25 13:27:10',73,1,NULL,'AJUSTE_POSITIVO','entrada_almacen',14,200.000,500.0000,100000.0000,0.000,200.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-25 17:27:10','LOT-2026-005'),
(4,'2026-08-25 13:27:47',28,1,NULL,'AJUSTE_POSITIVO','entrada_almacen',15,5.000,1000.0000,5000.0000,0.000,5.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-25 17:27:47','LOT-2026-006'),
(5,'2026-08-25 13:29:46',68,1,NULL,'TRANSFERENCIA_SALIDA','transferencia',14,5.000,250.0000,1250.0000,15.000,10.000,'Transferencia TRF-000014 hacia almacén destino',3,'2026-08-25 17:29:46','TRF-000014'),
(6,'2026-08-25 13:29:46',68,2,NULL,'TRANSFERENCIA_ENTRADA','transferencia',14,5.000,250.0000,1250.0000,0.000,5.000,'Transferencia TRF-000014 desde almacén origen',3,'2026-08-25 17:29:46','TRF-000014'),
(7,'2026-08-27 13:49:40',106,1,17,'AJUSTE_POSITIVO','entrada_almacen',17,20.000,3000.0000,60000.0000,0.000,20.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-27 17:49:40','LOT-2026-001'),
(8,'2026-08-28 16:06:12',73,1,18,'AJUSTE_POSITIVO','entrada_almacen',18,20.000,1000.0000,20000.0000,0.000,20.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-28 20:06:12','LOT-2026-003'),
(9,'2026-08-28 16:15:28',117,1,19,'AJUSTE_POSITIVO','entrada_almacen',19,7.000,6000.0000,42000.0000,0.000,7.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-28 20:15:28','LOT-2026-004'),
(10,'2026-08-28 22:20:14',70,1,20,'AJUSTE_POSITIVO','entrada_almacen',20,20.500,350.0000,7175.0000,0.000,20.500,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-29 02:20:14','LOT-2026-005'),
(11,'2026-08-28 22:23:10',117,1,19,'TRANSFERENCIA_SALIDA','transferencia',17,2.000,6000.0000,12000.0000,7.000,5.000,'Transferencia TRF-000017 hacia almacén destino',3,'2026-08-29 02:23:10','TRF-000017'),
(12,'2026-08-28 22:23:10',117,5,21,'TRANSFERENCIA_ENTRADA','transferencia',17,2.000,6000.0000,12000.0000,0.000,2.000,'Transferencia TRF-000017 desde almacén origen',3,'2026-08-29 02:23:10','TRF-000017'),
(13,'2026-08-28 22:23:10',70,1,20,'TRANSFERENCIA_SALIDA','transferencia',17,2.000,350.0000,700.0000,20.500,18.500,'Transferencia TRF-000017 hacia almacén destino',3,'2026-08-29 02:23:10','TRF-000017'),
(14,'2026-08-28 22:23:10',70,5,22,'TRANSFERENCIA_ENTRADA','transferencia',17,2.000,350.0000,700.0000,0.000,2.000,'Transferencia TRF-000017 desde almacén origen',3,'2026-08-29 02:23:10','TRF-000017'),
(15,'2026-08-28 22:23:10',73,1,18,'TRANSFERENCIA_SALIDA','transferencia',17,1.000,1000.0000,1000.0000,20.000,19.000,'Transferencia TRF-000017 hacia almacén destino',3,'2026-08-29 02:23:10','TRF-000017'),
(16,'2026-08-28 22:23:10',73,5,23,'TRANSFERENCIA_ENTRADA','transferencia',17,1.000,1000.0000,1000.0000,0.000,1.000,'Transferencia TRF-000017 desde almacén origen',3,'2026-08-29 02:23:10','TRF-000017'),
(17,'2026-08-28 22:33:53',70,5,22,'VENTA','pedido',19,0.030,350.0000,10.5000,2.000,1.970,'Deducción automática por receta (venta)',4,'2026-08-29 02:33:53','PED-000019'),
(18,'2026-08-28 22:33:53',73,5,23,'VENTA','pedido',19,0.010,1000.0000,10.0000,1.000,0.990,'Deducción automática por receta (venta)',4,'2026-08-29 02:33:53','PED-000019'),
(19,'2026-08-28 22:33:53',117,5,21,'VENTA','pedido',19,0.071,6000.0000,428.5714,2.000,1.929,'Deducción automática por receta (venta)',4,'2026-08-29 02:33:53','PED-000019'),
(20,'2026-08-28 22:38:07',70,5,22,'VENTA','pedido',21,0.045,350.0000,15.7500,1.970,1.925,'Deducción automática por receta (venta)',4,'2026-08-29 02:38:07','PED-000021'),
(21,'2026-08-28 22:38:07',73,5,23,'VENTA','pedido',21,0.015,1000.0000,15.0000,0.990,0.975,'Deducción automática por receta (venta)',4,'2026-08-29 02:38:07','PED-000021'),
(22,'2026-08-28 22:38:07',117,5,21,'VENTA','pedido',21,0.107,6000.0000,642.8571,1.929,1.822,'Deducción automática por receta (venta)',4,'2026-08-29 02:38:07','PED-000021'),
(23,'2026-08-29 08:10:18',70,5,22,'VENTA','pedido',22,0.015,350.0000,5.2500,1.925,1.910,'Deducción automática por receta (venta)',4,'2026-08-29 12:10:18','PED-000022'),
(24,'2026-08-29 08:10:18',73,5,23,'VENTA','pedido',22,0.005,1000.0000,5.0000,0.975,0.970,'Deducción automática por receta (venta)',4,'2026-08-29 12:10:18','PED-000022'),
(25,'2026-08-29 08:10:18',117,5,21,'VENTA','pedido',22,0.036,6000.0000,214.2857,1.822,1.786,'Deducción automática por receta (venta)',4,'2026-08-29 12:10:18','PED-000022');
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`restaurante_user`@`localhost`*/ /*!50003 TRIGGER `trg_bloquea_consumo_venta_en_logistico`
BEFORE INSERT ON `movimientos_inventario`
FOR EACH ROW
BEGIN
    DECLARE v_categoria VARCHAR(20);
    DECLARE v_nombre VARCHAR(100);
    
    
    
    DECLARE v_mensaje VARCHAR(128);

    IF NEW.tipo_movimiento IN ('CONSUMO_RECETA', 'VENTA') THEN

        SELECT a.categoria, a.nombre
          INTO v_categoria, v_nombre
          FROM almacenes a
         WHERE a.id = NEW.almacen_id
         LIMIT 1;

        IF v_categoria = 'logistico' THEN
            SET v_mensaje = CONCAT(
                'BLOQUEADO: consumo por venta en almacen logistico "',
                LEFT(IFNULL(v_nombre, NEW.almacen_id), 30),
                '". Transfiere el insumo a produccion primero.'
            );
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_mensaje;
        END IF;

    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `notificaciones_mesero`
--

DROP TABLE IF EXISTS `notificaciones_mesero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_mesero` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_mesa` int(11) NOT NULL,
  `id_pedido` bigint(20) unsigned DEFAULT NULL,
  `tipo` enum('LLAMADA_SERVICIO','SOLICITUD_CIERRE','PRE_PEDIDO') NOT NULL DEFAULT 'LLAMADA_SERVICIO',
  `mensaje` varchar(255) NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT 0,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_notif_mesa` (`id_mesa`) USING BTREE,
  KEY `fk_notif_pedido` (`id_pedido`) USING BTREE,
  KEY `idx_notif_estado` (`id_mesa`,`leido`) USING BTREE,
  CONSTRAINT `fk_notif_mesa` FOREIGN KEY (`id_mesa`) REFERENCES `mesas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones_mesero`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `notificaciones_mesero` WRITE;
/*!40000 ALTER TABLE `notificaciones_mesero` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones_mesero` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ordenes_compra`
--

DROP TABLE IF EXISTS `ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_compra` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_orden` varchar(50) NOT NULL,
  `proveedor_id` bigint(20) unsigned NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_entrega_estimada` date DEFAULT NULL,
  `estado` enum('BORRADOR','PENDIENTE_APROBACION','APROBADA','PARCIALMENTE_RECIBIDA','RECIBIDA','CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  `subtotal` decimal(18,2) NOT NULL DEFAULT 0.00,
  `impuestos` decimal(18,2) NOT NULL DEFAULT 0.00,
  `descuentos` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `creada_por` int(11) NOT NULL,
  `aprobada_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_orden` (`numero_orden`),
  KEY `fk_oc_creada_por` (`creada_por`),
  KEY `fk_oc_aprobada_por` (`aprobada_por`),
  KEY `idx_oc_proveedor` (`proveedor_id`),
  KEY `idx_oc_estado` (`estado`),
  KEY `idx_oc_fecha` (`fecha_emision`),
  KEY `idx_oc_numero` (`numero_orden`),
  CONSTRAINT `fk_oc_aprobada_por` FOREIGN KEY (`aprobada_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_oc_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_oc_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordenes_compra`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ordenes_compra` WRITE;
/*!40000 ALTER TABLE `ordenes_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordenes_compra` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pagos_pedido`
--

DROP TABLE IF EXISTS `pagos_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos_pedido` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pedido_id` bigint(20) unsigned NOT NULL,
  `metodo_pago` enum('efectivo','tarjeta','transferencia','factura','pendiente') NOT NULL,
  `moneda_id` int(11) DEFAULT NULL,
  `factor_cambio_aplicado` decimal(12,4) NOT NULL DEFAULT 1.0000,
  `monto_moneda_origen` decimal(10,2) NOT NULL,
  `monto_equivalente_local` decimal(10,2) NOT NULL,
  `referencia_transaccion` varchar(100) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pagos_pedido_id` (`pedido_id`),
  KEY `idx_pagos_moneda_id` (`moneda_id`),
  CONSTRAINT `fk_pp_moneda_id` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_pp_pedido_id` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos_pedido`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pagos_pedido` WRITE;
/*!40000 ALTER TABLE `pagos_pedido` DISABLE KEYS */;
INSERT INTO `pagos_pedido` VALUES
(11,13,'efectivo',1,1.0000,9000.00,9000.00,NULL,'2026-08-28 17:12:56'),
(12,15,'efectivo',2,660.0000,5.00,3300.00,NULL,'2026-08-28 17:28:27'),
(13,14,'efectivo',1,1.0000,5000.00,5000.00,NULL,'2026-08-28 17:34:51'),
(14,16,'efectivo',1,1.0000,5000.00,5000.00,NULL,'2026-08-28 18:18:35'),
(15,17,'efectivo',1,1.0000,2000.00,2000.00,NULL,'2026-08-28 18:23:53'),
(16,18,'efectivo',1,1.0000,2000.00,2000.00,NULL,'2026-08-28 18:41:13'),
(17,19,'efectivo',1,1.0000,800.00,800.00,NULL,'2026-08-29 02:33:53'),
(18,21,'efectivo',1,1.0000,1200.00,1200.00,NULL,'2026-08-29 02:38:07'),
(19,22,'efectivo',1,1.0000,350.00,350.00,NULL,'2026-08-29 12:10:17');
/*!40000 ALTER TABLE `pagos_pedido` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pagos_pedidos`
--

DROP TABLE IF EXISTS `pagos_pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos_pedidos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_pedido` bigint(20) unsigned NOT NULL,
  `metodo_pago` enum('efectivo','tarjeta','transferencia') NOT NULL DEFAULT 'efectivo',
  `monto_recibido` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monto_pagado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `cambio_entregado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fecha_pago` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pagos_pedido` (`id_pedido`),
  CONSTRAINT `fk_pagos_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos_pedidos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pagos_pedidos` WRITE;
/*!40000 ALTER TABLE `pagos_pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagos_pedidos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_mesa` int(11) NOT NULL,
  `cliente_nombre` varchar(100) DEFAULT NULL,
  `comensales` int(11) NOT NULL DEFAULT 1,
  `estado_pedido` enum('pendiente','preparando','listo','entregado','cancelado') DEFAULT 'pendiente',
  `fecha_precuenta` datetime DEFAULT NULL,
  `impresiones_precuenta` int(10) unsigned NOT NULL DEFAULT 0,
  `estado_pago` enum('pendiente','pagado','cortesia','facturado','pendiente_pago') NOT NULL DEFAULT 'pendiente',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(10,2) NOT NULL DEFAULT 0.00,
  `impuesto` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `propina` decimal(10,2) NOT NULL DEFAULT 0.00,
  `id_usuario_mesero` int(11) NOT NULL,
  `id_usuario_cajero` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  `turno_servicio_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pedidos_mesa` (`id_mesa`),
  KEY `fk_pedidos_mesero` (`id_usuario_mesero`),
  KEY `fk_pedidos_cajero` (`id_usuario_cajero`),
  KEY `fk_pedidos_turno` (`turno_servicio_id`),
  KEY `idx_pedidos_mesa_estado` (`id_mesa`,`estado_pedido`,`estado_pago`),
  CONSTRAINT `fk_pedidos_cajero` FOREIGN KEY (`id_usuario_cajero`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_pedidos_mesa` FOREIGN KEY (`id_mesa`) REFERENCES `mesas` (`id`),
  CONSTRAINT `fk_pedidos_mesero` FOREIGN KEY (`id_usuario_mesero`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_pedidos_turno` FOREIGN KEY (`turno_servicio_id`) REFERENCES `turnos_servicio` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES
(13,26,NULL,1,'entregado',NULL,0,'pagado',8840.00,0.00,0.00,8840.00,0.00,11,11,'2026-08-28 14:29:08','2026-08-28 17:12:56','2026-08-28 13:12:56',3),
(14,27,NULL,1,'entregado',NULL,0,'pagado',4721.00,0.00,0.00,4721.00,0.00,4,4,'2026-08-28 14:44:42','2026-08-28 17:34:51','2026-08-28 13:34:51',3),
(15,25,NULL,1,'entregado',NULL,0,'pagado',3190.00,0.00,0.00,3190.00,0.00,11,11,'2026-08-28 16:09:59','2026-08-28 17:28:27','2026-08-28 13:28:27',3),
(16,27,NULL,1,'entregado',NULL,0,'pagado',2200.00,0.00,0.00,2200.00,0.00,4,4,'2026-08-28 18:13:04','2026-08-28 18:18:35','2026-08-28 14:18:35',3),
(17,28,NULL,1,'entregado',NULL,0,'pagado',1700.00,0.00,0.00,1700.00,0.00,4,4,'2026-08-28 18:22:16','2026-08-28 18:23:53','2026-08-28 14:23:53',3),
(18,28,NULL,1,'entregado',NULL,0,'pagado',1840.00,0.00,0.00,1840.00,100.00,4,4,'2026-08-28 18:40:23','2026-08-28 18:41:13','2026-08-28 14:41:13',3),
(19,27,NULL,1,'entregado',NULL,0,'pagado',700.00,0.00,0.00,700.00,50.00,4,4,'2026-08-28 20:49:08','2026-08-29 02:33:53','2026-08-28 22:33:53',4),
(20,25,NULL,1,'pendiente',NULL,0,'pendiente',0.00,0.00,0.00,0.00,0.00,11,NULL,'2026-08-29 01:27:25','2026-08-29 01:27:25',NULL,4),
(21,27,NULL,1,'entregado',NULL,0,'pagado',1050.00,0.00,0.00,1050.00,70.00,4,4,'2026-08-29 02:34:49','2026-08-29 02:38:07','2026-08-28 22:38:07',4),
(22,28,NULL,1,'entregado',NULL,0,'pagado',350.00,0.00,0.00,350.00,0.00,4,4,'2026-08-29 12:09:27','2026-08-29 12:10:17','2026-08-29 08:10:17',4);
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `platillos_dia`
--

DROP TABLE IF EXISTS `platillos_dia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `platillos_dia` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `turno_servicio_id` bigint(20) unsigned NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `precio_alt` decimal(10,2) DEFAULT NULL,
  `precio_usd` decimal(10,2) DEFAULT NULL,
  `tipo` enum('COMESTIBLES','BEBIDAS') NOT NULL DEFAULT 'COMESTIBLES',
  `foto` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `usuario_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pd_turno` (`turno_servicio_id`),
  KEY `fk_pd_usuario` (`usuario_id`),
  CONSTRAINT `fk_pd_turno` FOREIGN KEY (`turno_servicio_id`) REFERENCES `turnos_servicio` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platillos_dia`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `platillos_dia` WRITE;
/*!40000 ALTER TABLE `platillos_dia` DISABLE KEYS */;
INSERT INTO `platillos_dia` VALUES
(4,3,'Pizza Napolitana Especial','Super rica!!',1200.00,1400.00,4.00,'COMESTIBLES','foto-1787940927944-354884592.jpg',1,'2026-08-28 18:15:28',3),
(5,3,'Trago lolita','Un trago exotico!!',500.00,650.00,3.00,'BEBIDAS','foto-1787941011896-872821822.jpg',1,'2026-08-28 18:16:51',3);
/*!40000 ALTER TABLE `platillos_dia` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `platillos_menu`
--

DROP TABLE IF EXISTS `platillos_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `platillos_menu` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `categoria` int(10) unsigned DEFAULT NULL,
  `precio_alt` decimal(10,2) DEFAULT NULL,
  `precio_usd` decimal(10,2) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_platillos_categoria` (`categoria`),
  KEY `idx_platillos_activo` (`activo`),
  CONSTRAINT `fk_platillos_categorias_platillos` FOREIGN KEY (`categoria`) REFERENCES `categorias_platillos` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platillos_menu`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `platillos_menu` WRITE;
/*!40000 ALTER TABLE `platillos_menu` DISABLE KEYS */;
INSERT INTO `platillos_menu` VALUES
(2,'Crema de Queso','Es una Crema de queso',500.00,NULL,900.00,NULL,'foto-1781960850051-540603996.png','2026-06-20 12:55:12',1),
(4,'Cordon Blue','Es un Cordon Blue',1500.00,NULL,2000.00,NULL,'foto-1781969997408-518049239.jpg','2026-06-20 15:39:57',1),
(5,'Croquetas al plato','Croqueta de las clasicas',150.00,NULL,250.00,NULL,'foto-1782843259737-194481420.png','2026-06-30 18:14:19',1),
(6,'Pechuga de Pollo al Gratin','Pechuga de pollo al gration (con queso)',1500.00,NULL,1600.00,NULL,'foto-1782843413873-272534888.jpg','2026-06-30 18:16:53',1),
(8,'Mayonesa - Aderezo','Porcion de mayonesa para sub-producccion interna o acompañamiento',50.00,NULL,50.00,NULL,'foto-1783691269573-891748389.png','2026-07-10 13:47:49',1),
(9,'Cafe Expreso','Express Coffe',180.00,14,180.00,NULL,'foto-1785869752955-73232764.jpg','2026-07-09 02:55:45',1),
(10,'Cafè Americano','American Coffe',180.00,14,1.00,NULL,'foto-1785869436495-215925479.jpg','2026-07-09 02:57:19',1),
(11,'Cafè Cortadito','coffe with milk',300.00,14,1.00,NULL,'foto-1785869671792-213526075.jpg','2026-07-09 02:58:02',1),
(12,'Cafè Carajillo','Coffe with Rum',350.00,14,1.00,NULL,'foto-1785869624169-839633529.jpg','2026-07-09 03:00:11',1),
(13,'Tè Negro','Black Tea',150.00,14,1.00,NULL,NULL,'2026-07-09 03:01:04',1),
(14,'Filete de Pescado','Grilled fish filet with shrimp and cheese on it',4450.00,NULL,12.00,NULL,NULL,'2026-07-09 03:03:45',1),
(15,'Caldereta de Mariscos','Shrimp and fish in tomatoes sauce',4800.00,11,17.00,NULL,NULL,'2026-07-09 03:05:21',1),
(16,'Paella Especial Bahia','Ric with shrimp, pork, chiken  and fish added',4400.00,NULL,16.00,NULL,NULL,'2026-07-09 03:06:49',1),
(17,'Risotto de Mariscos con Queso','Rise, shrimps and seafood with chesse',4250.00,NULL,4250.00,NULL,NULL,'2026-07-09 03:08:47',1),
(18,'Paella de Mariscos Sureña','Rice with fish and shrimps',4300.00,NULL,4300.00,NULL,NULL,'2026-07-09 03:10:13',1),
(19,'Filete de Pescado Canciller','Grill fish filet topped with shrimps in chili sauce',4350.00,NULL,4350.00,NULL,NULL,'2026-07-09 03:11:51',1),
(20,'Salteado de Ambos Mundos','Grill fish, shrimps,chicken,pork',4400.00,NULL,16.00,NULL,NULL,'2026-07-09 03:13:34',1),
(21,'Jugo de Frutas','Natural Fruit Juice',300.00,NULL,1.00,NULL,NULL,'2026-07-09 03:16:06',1),
(22,'Ensaladas Frutas Naturales','Natural Fruit Salad',1000.00,NULL,2.00,NULL,NULL,'2026-07-09 03:17:11',1),
(23,'Coctel de Pescado con Salsa Golf','Fish Cocktail with Golf Sauce',1500.00,NULL,3.00,NULL,NULL,'2026-07-09 03:18:41',1),
(24,'Coctel de Camarones en Salsa Rosa','Shrimps Cocktail with Rose Sauce',2300.00,NULL,3.50,NULL,NULL,'2026-07-09 03:20:25',1),
(25,'Canapes de Atùn','Tuna Canapes',1900.00,NULL,1900.00,NULL,NULL,'2026-07-09 03:21:40',1),
(26,'Ensalada Frìa a la Italiana','Italian Style Cold Salad',1350.00,NULL,2.00,NULL,NULL,'2026-07-09 03:23:03',1),
(27,'Ceviche Perla del Sur','Fish, shrimps in lemon and vinagre',2300.00,NULL,2300.00,NULL,NULL,'2026-07-09 03:24:22',1),
(28,'Croquetas de la casa','House Croquetta',700.00,NULL,700.00,NULL,NULL,'2026-07-09 03:25:11',1),
(29,'Tostones Rellenos del Mar','',1300.00,NULL,1300.00,NULL,NULL,'2026-07-09 03:26:07',1),
(30,'Bolitas de Carne con Queso','Chesse meat balls',1500.00,3,1500.00,NULL,NULL,'2026-07-09 03:27:01',1),
(31,'Filetillos de Pescado Esperlan','',1700.00,NULL,1700.00,NULL,NULL,'2026-07-09 03:27:37',1),
(32,'Garbanzos Fritos','Fried Chickpea',1700.00,NULL,1700.00,NULL,NULL,'2026-07-09 03:28:30',1),
(33,'Picadera Bahìa','Esperlan, croquetas, queso,tostones',2100.00,NULL,2100.00,NULL,NULL,'2026-07-09 03:29:40',1),
(34,'Sopa Crema Aurora','Tomatoes Soup Cream',750.00,NULL,2.00,NULL,NULL,'2026-07-09 03:30:48',1),
(35,'Sopa Crema de Queso','Cheese Soup Cream',1200.00,NULL,2.50,NULL,NULL,'2026-07-09 03:31:39',1),
(36,'Sopa Crema de Jamòn','Ham Soup Cream',1200.00,NULL,2.50,NULL,NULL,'2026-07-09 03:32:31',1),
(37,'Sopa Crema de Jamòn y Queso','Ham and Cheese Soup Cream',1350.00,NULL,3.00,NULL,NULL,'2026-07-09 03:33:37',1),
(38,'Sopa Crema Bahìa','Tomatoes, Ham and Cheese Soup Cream',1450.00,NULL,1450.00,NULL,NULL,'2026-07-09 03:34:51',1),
(39,'Sopa Crema de Mariscos','Shrimps Soup Cream',1600.00,NULL,1600.00,NULL,NULL,'2026-07-09 03:35:55',1),
(40,'Sopa de Marisco Sureña','Shrimp Soup',1350.00,NULL,3.00,NULL,NULL,'2026-07-09 03:37:14',1),
(41,'Sopa de Pollo','Chicken soup',1100.00,NULL,2.00,NULL,NULL,'2026-07-09 03:38:19',1),
(42,'Filete de Pescado Grille Maitre D\' Hotel','Grilled fish in Maitr D\' Hotel sauce',3400.00,NULL,13.00,NULL,NULL,'2026-07-09 03:43:02',1),
(43,'Filete de Pescado en Salsa de Limòn','Grilled fish in lemon sauce',3400.00,NULL,3400.00,NULL,NULL,'2026-07-09 03:44:24',1),
(44,'Filete de Pescado a la Española','fish filet with some vegetable on it',3450.00,NULL,13.00,NULL,NULL,'2026-07-09 03:46:33',1),
(45,'Masas de Pescado Enchilada','Fish in tomatoes sauce',3450.00,NULL,3450.00,NULL,NULL,'2026-07-09 03:47:50',1),
(46,'Filete de Pescado a la Napolitana','Grilled fish with tomatoes , garlic, onion, pepper and some cheese onit',3450.00,NULL,13.00,NULL,NULL,'2026-07-09 03:50:06',1),
(47,'Filete de Pescado Empanado','Breaded fish filet',3550.00,NULL,3550.00,NULL,NULL,'2026-07-09 03:51:37',1),
(48,'Camarones Grille al Ajillo','Grilled shrimps in garlic sauce',3900.00,NULL,14.00,NULL,NULL,'2026-07-09 03:56:32',1),
(49,'Camarones Salteados al Curry','Grilled shrimps in garlic sauce',3900.00,NULL,14.00,NULL,NULL,'2026-07-09 03:58:21',1),
(50,'Camarones Flameados al Ron Añejo','Flamed shrimps with old rum',3900.00,8,4000.00,9.00,NULL,'2026-07-09 04:08:18',1),
(51,'Camarones Rebosados a la Francesa','French butted shrimps',3950.00,NULL,3950.00,NULL,NULL,'2026-07-09 04:10:08',1),
(52,'Camarones Gratinados a la Crema','Shrimps in cheese cream',4300.00,NULL,15.00,NULL,NULL,'2026-07-09 04:11:36',1),
(53,'Camarones Enchilado Bahìa','Shrimps in tomatoes sauce',4000.00,8,14.00,NULL,NULL,'2026-07-09 04:13:16',1),
(54,'Camarones Salteados con Vegetales y Piña','Shrimps with peneaple and vegetable',3950.00,NULL,14.00,NULL,NULL,'2026-07-09 04:14:52',1),
(55,'Camarones Empanado','Breaded Shrimps',4100.00,8,15.00,NULL,NULL,'2026-07-09 04:16:01',1),
(56,'Salteado del Mar y la Tierra','Grilled shrimps, fish,pork and chicken with some beer and vegetable sauce added',4100.00,NULL,4100.00,NULL,NULL,'2026-07-09 04:18:02',1),
(57,'Escalope de Cerdo Grille','Grill pork steak',3100.00,NULL,12.00,NULL,NULL,'2026-07-09 21:07:49',1),
(58,'Juliana de Cerdo con Pimiento y Cebolla','Pork slice with onions and pepper',3250.00,NULL,3250.00,NULL,NULL,'2026-07-09 21:17:40',1),
(59,'Escalope de Cerdo Gratinado','Porks steak in tomatoes sauce',3500.00,NULL,13.00,NULL,NULL,'2026-07-09 21:24:06',1),
(60,'Solomillo de Cerdo a la Española','Spanish style pork sirloin',3800.00,NULL,3800.00,NULL,NULL,'2026-07-09 21:29:28',1),
(61,'Escalope de Cerdo Empanado','Breaded Pork sirloin',3800.00,NULL,3800.00,NULL,NULL,'2026-07-09 21:34:43',1),
(62,'Uruguayo de Cerdo','Breaded Pork steak filled with ham and cheese',4250.00,9,14.00,NULL,NULL,'2026-07-09 21:37:06',1),
(63,'Masas de Cerdo Fritas','Fried Pork',4250.00,NULL,14.00,NULL,NULL,'2026-07-09 21:52:11',1),
(64,'Ropa Vieja de Res','Shredded beef',3950.00,NULL,14.00,NULL,NULL,'2026-07-09 21:54:47',1),
(65,'Aporreado de Ternera','Beef with tomatoes sauce',4100.00,9,4100.00,NULL,NULL,'2026-07-09 21:55:52',1),
(66,'Pollo Grille al Ajillo','Grilled chicken with garlic sauce over',2850.00,NULL,11.00,NULL,NULL,'2026-07-09 22:00:16',1),
(67,'Juliana de Pollo Salteado con Mantequilla y Frutas Tropicales','Chicken slices with Butter and Tropical Fruits',2900.00,NULL,12.00,NULL,NULL,'2026-07-09 22:02:18',1),
(68,'Dedos de Pollo en Salsa de Miel y Ajo','Breaded chicken pieces with honey and garlic sauce',3100.00,NULL,12.00,NULL,NULL,'2026-07-09 22:03:57',1),
(69,'Pollo Guisado a la Criolla','Chicken in tomatoes sauce',3100.00,NULL,12.00,NULL,NULL,'2026-07-09 22:10:30',1),
(70,'Pollo Frito a la Criolla','Creole fried chicken',3200.00,NULL,3200.00,NULL,NULL,'2026-07-09 22:11:43',1),
(71,'Pollo Empanado','Breadded chicken',3200.00,NULL,3200.00,NULL,NULL,'2026-07-09 22:13:53',1),
(72,'Suprema de Pollo al Camaròn','Grilled chicken with shrimps and vegetable',3900.00,NULL,14.00,NULL,NULL,'2026-07-09 22:15:51',1),
(73,'Pollo a la Cordon Bleu','Chicken Cordon Bleu',4000.00,NULL,14.00,NULL,NULL,'2026-07-09 22:19:03',1),
(74,'Arroz con Pollo a la Chorrera','Rice with Chicken',2950.00,10,12.00,NULL,NULL,'2026-07-09 22:20:00',1),
(75,'Spaguetti a la Napolitana','Spaguetti with butter tomatoes sauce and cheese',1450.00,NULL,1450.00,NULL,NULL,'2026-07-09 22:22:23',1),
(76,'Spaguetti Carbonara','Spaguetti with bacon, onion , egges and cheese',2200.00,NULL,2200.00,NULL,NULL,'2026-07-09 22:25:04',1),
(77,'Spaguetti con Jamon a la Vodka','Spaguetti with onion,ham,tomatoes sauce milk, vodka and cheese',2100.00,NULL,2100.00,NULL,NULL,'2026-07-09 22:27:28',1),
(78,'Spaguetti Alfredo con Camarones','Spaguetti with shrimps ,garlic cream sauce and cheese',2950.00,NULL,2950.00,NULL,NULL,'2026-07-09 22:29:28',1),
(79,'Macarrones a la Boloñesa','Bolognese short paste',2400.00,NULL,2400.00,NULL,NULL,'2026-07-09 22:30:51',1),
(80,'Pizza Napolitana','Pizza with tomatoes sauce and cheese',1350.00,NULL,1350.00,NULL,NULL,'2026-07-09 22:33:28',1),
(81,'Pizza de Jamòn','Pizza with tomatoes sauce , ham and cheese',1850.00,NULL,1850.00,NULL,NULL,'2026-07-09 22:35:41',1),
(82,'Pizza de Atùn','Pizza with tomatoes sauce ,tuna and cheese',2100.00,NULL,2100.00,NULL,NULL,'2026-07-09 22:45:05',1),
(83,'Pizza con Camarones','Pizza with tomatoes sauce hrimps and cheese',2400.00,NULL,2400.00,NULL,NULL,'2026-07-09 22:47:33',1),
(84,'Lasaña a la Boloñesa','Bolognese Lasagna',2150.00,NULL,2150.00,NULL,NULL,'2026-07-09 22:49:02',1),
(85,'Filete de Pescado Agridulce','Fish filetin sweet and sours sauce',3300.00,NULL,3300.00,NULL,NULL,'2026-07-09 22:50:51',1),
(86,'Camarones a la Tailandesa','Sauteed shrimps with pineaple, curry and coconut milk',3900.00,11,3900.00,NULL,NULL,'2026-07-09 22:52:52',1),
(87,'Pollo en Salsa Teriyaki','Chicken with garlic , sugar,gringer,vinegar and soja sauce',3100.00,NULL,3100.00,NULL,NULL,'2026-07-09 22:55:17',1),
(88,'Arroz Frito Natural','Rice, garlic,onion, cabbage,ham,egg and soja sauce',1950.00,13,1950.00,NULL,NULL,'2026-07-09 23:13:05',1),
(89,'Arroz Frito Especial','Rice,garlic, onion,cabbage,ham,shrimp,egg and soja sauce',2550.00,11,8.00,4.00,NULL,'2026-07-09 23:14:59',1),
(90,'Maripositas China en Salsa Agridulce','Won Tan',950.00,NULL,2.00,NULL,NULL,'2026-07-09 23:17:13',1),
(91,'Arroz Blanco','',300.00,12,1.00,NULL,NULL,'2026-07-09 23:17:47',1),
(92,'Moros y Cristianos','',450.00,NULL,1.50,NULL,NULL,'2026-07-09 23:18:13',1),
(93,'Arroz Pilaff','',650.00,13,1.50,NULL,NULL,'2026-07-09 23:18:47',1),
(94,'Arroz Salteados con Vegetables','',650.00,11,1.50,NULL,NULL,'2026-07-09 23:19:25',1),
(95,'Mariquitas de Plàtanos','',450.00,NULL,1.50,NULL,NULL,'2026-07-09 23:20:20',1),
(96,'Mariquitas de Boniatos','',450.00,NULL,450.00,NULL,NULL,'2026-07-09 23:20:50',1),
(97,'Tostones Natural','',450.00,NULL,450.00,NULL,NULL,'2026-07-09 23:21:27',1),
(98,'Tostones al Ajillo','',480.00,NULL,480.00,NULL,NULL,'2026-07-09 23:21:58',1),
(99,'Ensalada Mixta de Verduras','',650.00,NULL,1.50,NULL,NULL,'2026-07-09 23:22:40',1),
(100,'Selva Negra','',850.00,NULL,3.00,NULL,NULL,'2026-07-09 23:23:34',1),
(101,'Cake Bombòn de Chocalate','',850.00,14,850.00,NULL,NULL,'2026-07-09 23:24:31',1),
(102,'Cake 3 Leche','',950.00,14,950.00,NULL,NULL,'2026-07-09 23:25:21',1),
(103,'Flan de Caramelo','',800.00,NULL,1.50,NULL,NULL,'2026-07-09 23:26:11',1),
(104,'Cerveza Nacional','',630.00,NULL,630.00,NULL,'foto-1785870529779-712220550.jpg','2026-07-09 23:28:53',1),
(105,'Cerveza Importada','',520.00,NULL,520.00,NULL,'foto-1785869901530-82508522.jpg','2026-07-09 23:29:34',1),
(106,'Refresco Enlatado','',450.00,NULL,450.00,NULL,NULL,'2026-07-09 23:30:24',1),
(107,'Agua Natural','',320.00,14,320.00,NULL,'foto-1785868393054-355010813.jpeg','2026-07-09 23:31:01',1),
(108,'Batidos','',750.00,14,750.00,NULL,'foto-1785868669807-917476625.jpg','2026-07-09 23:32:14',1),
(109,'Malta','',550.00,NULL,550.00,NULL,NULL,'2026-07-09 23:32:48',1),
(110,'Kermato','',750.00,NULL,750.00,NULL,NULL,'2026-07-09 23:33:26',1),
(111,'Chelada/Cerveza Importada','',780.00,NULL,780.00,NULL,'foto-1785870581509-593571091.jpg','2026-07-09 23:35:28',1),
(112,'Chelada/Cerveza Nacional','',880.00,NULL,880.00,NULL,NULL,'2026-07-09 23:36:18',1),
(113,'Mojito','El clasico mojito cubano',750.00,14,900.00,13.00,'foto-1787849194675-310451322.png','2026-07-09 23:36:52',1),
(114,'Cubalibre','',750.00,NULL,750.00,NULL,NULL,'2026-07-09 23:37:42',1),
(115,'Piña Colada','',1000.00,NULL,1000.00,NULL,NULL,'2026-07-09 23:38:35',1),
(116,'Sangria','',1000.00,NULL,1000.00,NULL,NULL,'2026-07-09 23:40:12',1),
(117,'Copa de Vino','',1100.00,NULL,1100.00,NULL,NULL,'2026-07-09 23:40:51',1),
(118,'Limonada Frapè','',550.00,NULL,550.00,NULL,NULL,'2026-07-09 23:41:34',1),
(119,'Havana Club Smokie','',500.00,NULL,500.00,NULL,NULL,'2026-07-09 23:42:22',1),
(120,'Black& White','',650.00,14,650.00,NULL,'foto-1785868773358-668838175.png','2026-07-09 23:43:02',1),
(121,'Clan Campbell','',650.00,NULL,650.00,NULL,NULL,'2026-07-09 23:43:41',1),
(122,'Rua Vieja','',600.00,NULL,600.00,NULL,NULL,'2026-07-09 23:44:22',1),
(123,'Santiago','',500.00,NULL,500.00,NULL,NULL,'2026-07-09 23:44:50',1),
(124,'Pacto Navio','',1100.00,NULL,1100.00,NULL,NULL,'2026-07-09 23:45:38',1),
(125,'Havana Club Selecciòn de Maestros','',1600.00,NULL,1600.00,NULL,NULL,'2026-07-09 23:46:35',1),
(126,'Jameson','',750.00,NULL,750.00,NULL,NULL,'2026-07-09 23:47:13',1),
(127,'Ballantine','',750.00,14,750.00,NULL,'foto-1785868613732-161655502.png','2026-07-09 23:48:16',1),
(128,'Brugal R. Dominicana','',950.00,14,950.00,NULL,'foto-1785869371129-659554325.png','2026-07-09 23:49:07',1),
(129,'Chiva Regal 12','',850.00,NULL,850.00,NULL,NULL,'2026-07-09 23:49:51',1),
(130,'Tequila','',750.00,14,750.00,NULL,NULL,'2026-07-09 23:50:53',1),
(131,'Cafè puro Cubano','',1.00,14,1.00,NULL,'foto-1785869854254-637745920.webp','2026-07-10 20:43:53',1),
(132,'Copa de Helado','',1.50,NULL,1.50,NULL,NULL,'2026-07-10 20:46:42',1),
(133,'Sensacion Bahìa','',2.00,NULL,2.00,NULL,NULL,'2026-07-10 20:47:35',1),
(134,'Copa Lolita','',3.00,NULL,3.00,NULL,NULL,'2026-07-10 20:48:19',1),
(135,'Pollo Agridulce','Chicken in fruit sauce with vegetable',12.00,NULL,12.00,NULL,NULL,'2026-07-10 20:53:00',1),
(136,'Lonjas de Cerdo Salteadas Chinas','Pork saute with garlic, onion, orange juice and soya sauce',12.00,NULL,12.00,NULL,NULL,'2026-07-10 20:55:23',1),
(137,'Juliana de Pollo Salteado Salteado con Piña y Vino Blanco','Chicken saute in butter, pineaple and white wine',12.00,NULL,12.00,NULL,NULL,'2026-07-10 20:59:55',1),
(138,'Escalope de Cerdo en Salsa de Frutas','Pork steak with cheese',12.00,NULL,12.00,NULL,NULL,'2026-07-10 21:14:13',1),
(139,'Juliana de Cerdo Salteado con Vegetales Piña','Pork filet soate with vegetable and pineaple',13.00,NULL,13.00,NULL,NULL,'2026-07-10 21:18:06',1),
(140,'Grillada Mixta Cubana','Fish, pork and shrimp grill with garlic sauce over',14.00,NULL,14.00,NULL,NULL,'2026-07-10 21:20:22',1),
(141,'Lomo de Cerdo al Camaròn','Pork with shrimp',14.00,NULL,14.00,NULL,NULL,'2026-07-10 21:22:54',1),
(142,'Langosta Grille Natural','Grill Lobster',16.00,NULL,16.00,NULL,NULL,'2026-07-10 21:56:14',1),
(143,'Langosta Grille al Ajillo','Grill Lobster with garlie',16.00,NULL,16.00,NULL,NULL,'2026-07-10 21:57:25',1),
(144,'Langosta en Salsa Limòn','Lobster in lemon sauce',16.00,NULL,16.00,NULL,NULL,'2026-07-10 21:58:35',1),
(145,'Enchilado de Langosta','Lobster in tomatoes sauce',16.00,NULL,16.00,NULL,NULL,'2026-07-10 21:59:36',1),
(146,'Langosta a la Piña','Lobster with Peneaple',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:00:37',1),
(147,'Langosta a la Crema','Lobster with Bechamel sauce',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:02:04',1),
(148,'Langosta en Salsa Agridulce','Lobster in Fruit sauce',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:03:30',1),
(149,'Grillada Mixta del Mar','Lobster,shrimp and fish grill',17.00,NULL,17.00,NULL,NULL,'2026-07-10 22:05:06',1),
(150,'Filete de Pescado al Vapor','Vapor fish filet',12.00,NULL,12.00,NULL,NULL,'2026-07-10 22:09:58',1),
(151,'Fileticos de Pescado con Hiervas Aromàticas y Salsa de limòn','Fish filet with lemon sauce',13.00,NULL,13.00,NULL,NULL,'2026-07-10 22:13:11',1),
(152,'Filete de Pescado al Camaròn','Grilled fish with shrimps and red sauce on it',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:16:47',1),
(153,'Sopa Crema Floridita','Shrimp a cream',3.50,NULL,3.50,NULL,NULL,'2026-07-10 22:31:07',1),
(154,'Filete de Pescado en Salsa de Frutas','Fish filet in tropical fruits sauce',15.00,NULL,15.00,NULL,NULL,'2026-07-10 22:34:44',1),
(155,'Filete de Pescado Cienfueguero','Grilled fish filet with shrimp and cheese on it',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:37:52',1),
(156,'Filete de Pescado Costa Azul','fish filet with lobster in tomatoes sauce',16.00,NULL,16.00,NULL,NULL,'2026-07-10 22:39:38',1),
(157,'queso','',1.00,NULL,1.00,NULL,NULL,'2026-07-10 22:42:10',1),
(158,'Aceituna,Cebolla y Pimiento','',1.00,12,1.00,NULL,NULL,'2026-07-10 22:42:47',1),
(159,'Jamon','',1.50,NULL,1.50,NULL,NULL,'2026-07-10 22:43:32',1),
(160,'Atùn','',1.50,12,1.50,NULL,NULL,'2026-07-10 22:44:26',1),
(161,'Camarones','',1.50,8,1.50,NULL,NULL,'2026-07-10 22:45:02',1);
/*!40000 ALTER TABLE `platillos_menu` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pre_pedidos`
--

DROP TABLE IF EXISTS `pre_pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pre_pedidos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id_mesa` int(11) NOT NULL,
  `id_platillo` bigint(20) unsigned NOT NULL,
  `es_platillo_dia` tinyint(1) NOT NULL DEFAULT 0,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `notas_especiales` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`) USING BTREE,
  KEY `fk_prepedidos_mesa` (`id_mesa`) USING BTREE,
  KEY `fk_prepedidos_platillo` (`id_platillo`) USING BTREE,
  CONSTRAINT `fk_prepedidos_mesa` FOREIGN KEY (`id_mesa`) REFERENCES `mesas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pre_pedidos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pre_pedidos` WRITE;
/*!40000 ALTER TABLE `pre_pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pre_pedidos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `presupuestos_compras`
--

DROP TABLE IF EXISTS `presupuestos_compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `presupuestos_compras` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `estado` enum('BORRADOR','APROBADO','EN_EJECUCION','CERRADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  `moneda` varchar(10) NOT NULL DEFAULT 'USD',
  `monto_presupuestado` decimal(18,2) NOT NULL,
  `monto_comprometido` decimal(18,2) NOT NULL DEFAULT 0.00,
  `monto_ejecutado` decimal(18,2) NOT NULL DEFAULT 0.00,
  `monto_disponible` decimal(18,2) NOT NULL,
  `responsable_id` int(11) NOT NULL,
  `aprobado_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_pc_responsable` (`responsable_id`),
  KEY `fk_pc_aprobador` (`aprobado_por`),
  KEY `idx_pc_estado` (`estado`),
  KEY `idx_pc_fechas` (`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `fk_pc_aprobador` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pc_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presupuestos_compras`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `presupuestos_compras` WRITE;
/*!40000 ALTER TABLE `presupuestos_compras` DISABLE KEYS */;
/*!40000 ALTER TABLE `presupuestos_compras` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `presupuestos_compras_detalle`
--

DROP TABLE IF EXISTS `presupuestos_compras_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `presupuestos_compras_detalle` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `presupuesto_id` bigint(20) unsigned NOT NULL,
  `categoria_id` int(10) unsigned DEFAULT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `proveedor_id` bigint(20) unsigned DEFAULT NULL,
  `monto_presupuestado` decimal(18,2) NOT NULL,
  `monto_comprometido` decimal(18,2) NOT NULL DEFAULT 0.00,
  `monto_ejecutado` decimal(18,2) NOT NULL DEFAULT 0.00,
  `monto_disponible` decimal(18,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `centro_costo_id` bigint(20) unsigned DEFAULT NULL,
  `tolerancia_porcentaje` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_presupuesto_det_presupuesto` (`presupuesto_id`),
  KEY `fk_presupuesto_det_categoria` (`categoria_id`),
  KEY `fk_presupuesto_det_almacen` (`almacen_id`),
  KEY `fk_presupuesto_det_proveedor` (`proveedor_id`),
  KEY `fk_pcd_centro_costo` (`centro_costo_id`),
  CONSTRAINT `fk_pcd_centro_costo` FOREIGN KEY (`centro_costo_id`) REFERENCES `centros_costo` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_presupuesto_det_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_presupuesto_det_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_presupuesto_det_presupuesto` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuestos_compras` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_presupuesto_det_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presupuestos_compras_detalle`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `presupuestos_compras_detalle` WRITE;
/*!40000 ALTER TABLE `presupuestos_compras_detalle` DISABLE KEYS */;
/*!40000 ALTER TABLE `presupuestos_compras_detalle` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `produccion_detalles`
--

DROP TABLE IF EXISTS `produccion_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `produccion_detalles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `produccion_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `cantidad_teorica` decimal(18,4) NOT NULL,
  `cantidad_real` decimal(18,4) NOT NULL,
  `costo_unitario` decimal(18,4) NOT NULL,
  `costo_total` decimal(18,4) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pd_produccion` (`produccion_id`),
  KEY `idx_pd_producto` (`producto_id`),
  KEY `idx_pd_lote` (`lote_id`),
  KEY `idx_pd_produccion_producto` (`produccion_id`,`producto_id`),
  CONSTRAINT `fk_pd_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pd_produccion` FOREIGN KEY (`produccion_id`) REFERENCES `producciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produccion_detalles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `produccion_detalles` WRITE;
/*!40000 ALTER TABLE `produccion_detalles` DISABLE KEYS */;
/*!40000 ALTER TABLE `produccion_detalles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `producciones`
--

DROP TABLE IF EXISTS `producciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `producciones` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_produccion` varchar(50) NOT NULL,
  `receta_id` bigint(20) unsigned NOT NULL,
  `producto_resultante_id` bigint(20) unsigned NOT NULL,
  `almacen_origen_id` bigint(20) unsigned NOT NULL,
  `almacen_destino_id` bigint(20) unsigned NOT NULL,
  `fecha_produccion` datetime NOT NULL DEFAULT current_timestamp(),
  `cantidad_planificada` decimal(18,3) NOT NULL,
  `cantidad_producida` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_total_produccion` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `estado` enum('BORRADOR','PLANIFICADA','EN_PROCESO','FINALIZADA','CANCELADA') NOT NULL DEFAULT 'BORRADOR',
  `lote_generado_id` bigint(20) unsigned DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `responsable_usuario_id` int(11) NOT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `rendimiento_esperado` decimal(18,4) DEFAULT NULL,
  `rendimiento_real` decimal(18,4) DEFAULT NULL,
  `receta_version_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_produccion` (`numero_produccion`),
  KEY `fk_prod_almacen_origen` (`almacen_origen_id`),
  KEY `fk_prod_almacen_destino` (`almacen_destino_id`),
  KEY `fk_prod_lote_generado` (`lote_generado_id`),
  KEY `idx_prod_numero` (`numero_produccion`),
  KEY `idx_prod_receta` (`receta_id`),
  KEY `idx_prod_producto` (`producto_resultante_id`),
  KEY `idx_prod_estado` (`estado`),
  KEY `idx_prod_fecha` (`fecha_produccion`),
  KEY `idx_prod_responsable` (`responsable_usuario_id`),
  KEY `fk_prod_receta_version` (`receta_version_id`),
  CONSTRAINT `fk_prod_almacen_destino` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_prod_almacen_origen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_prod_lote_generado` FOREIGN KEY (`lote_generado_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prod_producto` FOREIGN KEY (`producto_resultante_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_prod_receta` FOREIGN KEY (`receta_id`) REFERENCES `recetas` (`id`),
  CONSTRAINT `fk_prod_receta_version` FOREIGN KEY (`receta_version_id`) REFERENCES `recetas_versiones` (`id`),
  CONSTRAINT `fk_prod_usuario` FOREIGN KEY (`responsable_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `producciones`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `producciones` WRITE;
/*!40000 ALTER TABLE `producciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `producciones` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria_id` int(10) unsigned NOT NULL,
  `tipo` enum('materia_prima','producto_preparado','producto_venta','material_operativo') NOT NULL,
  `unidad_compra_id` bigint(20) unsigned NOT NULL,
  `unidad_inventario_id` bigint(20) unsigned NOT NULL,
  `unidad_consumo_id` bigint(20) unsigned DEFAULT NULL,
  `costo_promedio` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `costo_ultimo` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `stock_minimo` decimal(18,3) NOT NULL DEFAULT 0.000,
  `stock_maximo` decimal(18,3) DEFAULT NULL,
  `requiere_lote` tinyint(1) NOT NULL DEFAULT 0,
  `controla_vencimiento` tinyint(1) NOT NULL DEFAULT 0,
  `foto` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sku` varchar(100) DEFAULT NULL,
  `codigo_barras` varchar(100) DEFAULT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `pais_origen` varchar(100) DEFAULT NULL,
  `peso_neto` decimal(18,3) DEFAULT NULL,
  `peso_bruto` decimal(18,3) DEFAULT NULL,
  `volumen` decimal(18,3) DEFAULT NULL,
  `punto_reorden` decimal(18,3) DEFAULT NULL,
  `dias_cobertura` int(11) DEFAULT NULL,
  `dias_vida_util` int(11) DEFAULT NULL,
  `permitida_venta` tinyint(1) DEFAULT 0,
  `foto_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_productos_nombre` (`nombre`),
  KEY `idx_productos_categoria` (`categoria_id`),
  KEY `idx_productos_tipo` (`tipo`),
  KEY `idx_productos_activo` (`activo`),
  KEY `idx_productos_codigo` (`codigo`),
  KEY `fk_producto_unidad_compra` (`unidad_compra_id`),
  KEY `fk_producto_unidad_inventario` (`unidad_inventario_id`),
  KEY `fk_producto_unidad_consumo` (`unidad_consumo_id`),
  CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `fk_producto_unidad_compra` FOREIGN KEY (`unidad_compra_id`) REFERENCES `unidades_medida` (`id`),
  CONSTRAINT `fk_producto_unidad_consumo` FOREIGN KEY (`unidad_consumo_id`) REFERENCES `unidades_medida` (`id`),
  CONSTRAINT `fk_producto_unidad_inventario` FOREIGN KEY (`unidad_inventario_id`) REFERENCES `unidades_medida` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES
(12,'193010001','Arroz Blanco',NULL,6,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:24:52','2026-07-10 23:27:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(13,'193010002','Frijol Negro',NULL,6,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:25:41','2026-07-10 23:27:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(14,'193050005','Pasta de Tomate',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:26:46','2026-07-10 23:26:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(15,'193010005','Spaguetti ',NULL,6,'materia_prima',8,8,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:28:30','2026-07-10 23:28:30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(16,'193010007','Macarrones ',NULL,6,'materia_prima',8,8,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:29:14','2026-07-10 23:29:14',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(18,'193010009','Fideos',NULL,6,'materia_prima',8,8,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:30:24','2026-07-10 23:30:24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(19,'193060006','Crema de Leche',NULL,3,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:32:09','2026-07-10 23:32:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(20,'193020002','Manteca de Cerdo',NULL,6,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:32:56','2026-07-10 23:32:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(21,'193020023','Aceite',NULL,9,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:33:56','2026-07-13 21:57:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(22,'193060001','Mantequilla',NULL,3,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:34:39','2026-07-10 23:34:39',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(23,'193010008','Harina',NULL,6,'materia_prima',3,3,2,2500.0000,0.0000,25.000,NULL,0,0,NULL,1,'2026-07-10 23:35:25','2026-08-28 18:55:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787943342850-946907869.png'),
(24,'193050004','Caldo de Pollo',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:36:04','2026-07-10 23:36:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(25,'193050003','Caldo de Res',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:36:56','2026-07-10 23:36:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(26,'193050002','Caldo de Camaron',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:37:41','2026-07-10 23:37:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(27,'193060002','Leche liquida',NULL,3,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:38:46','2026-07-10 23:38:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(28,'193090001','Jugo de limòn',NULL,4,'materia_prima',4,4,5,1200.0000,0.0000,12.000,NULL,0,0,NULL,1,'2026-07-10 23:39:28','2026-08-27 17:32:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787850127605-111727608.png'),
(29,'193090002','Vinagre',NULL,9,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:40:06','2026-07-10 23:40:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(30,'193090003','Vino Seco',NULL,9,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:40:43','2026-07-10 23:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(31,'193050001','Sal',NULL,9,'materia_prima',1,1,2,350.0000,0.0000,10.000,NULL,0,0,NULL,1,'2026-07-10 23:41:42','2026-08-28 19:24:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787945047119-299079924.jpg'),
(32,'193050008','Pimienta Negra',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:43:54','2026-07-10 23:43:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(33,'193050012','Comino',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:44:27','2026-07-10 23:44:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(34,'193050009','Sazon Completo',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:45:33','2026-07-10 23:45:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(35,'193090005','Miel',NULL,5,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:46:47','2026-07-10 23:46:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(36,'193050010','Curry',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:47:28','2026-07-10 23:47:28',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(37,'193090006','Mostaza',NULL,5,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:48:39','2026-07-10 23:48:39',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(38,'193050011','Laurel',NULL,9,'materia_prima',8,8,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:49:31','2026-07-10 23:49:31',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(39,'193090007','Salsa China',NULL,5,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:50:17','2026-07-10 23:50:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(40,'193050013','Colorante Aliemntario',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:51:06','2026-07-10 23:51:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(41,'193050006','Ajo',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:52:38','2026-07-10 23:52:38',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(42,'193050007','Cebolla Morada',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:53:21','2026-07-10 23:53:21',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(43,'193050014','Cebolla Blanca',NULL,9,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:54:08','2026-07-10 23:54:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(44,'193050015','Aji Pimiento',NULL,9,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:54:48','2026-07-10 23:54:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(45,'193050016','Aji cachucha',NULL,9,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:55:20','2026-07-10 23:55:20',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(46,'193070003','Vodka',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:56:12','2026-07-10 23:56:12',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(47,'193040003','Calabaza',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:57:05','2026-07-10 23:57:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(48,'193040001','Malanga',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:57:34','2026-07-10 23:57:34',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(49,'193040002','Papa',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:58:32','2026-07-10 23:58:32',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(50,'193040004','Yuka',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:59:10','2026-07-10 23:59:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(51,'193040005','Maiz',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:01:33','2026-07-11 00:01:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(52,'193020001','Hueso de Cerdo',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:02:41','2026-07-11 00:02:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(53,'183010001','Detergente',NULL,8,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:03:15','2026-07-11 00:03:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(54,'183010002','Esponja de Fregar',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:03:57','2026-07-11 00:03:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(55,'183010003','Estropajo de Alambre',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:06:16','2026-07-11 00:06:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(56,'193090008','Pan Rayado',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:08:52','2026-07-11 00:08:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(57,'193020011','Huevos',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:09:34','2026-07-11 00:09:34',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(58,'193020003','Cerdo',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:10:52','2026-07-11 00:11:47',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(59,'193020004','Lomo',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:11:25','2026-07-11 00:11:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(60,'193020005','Bacon',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:13:15','2026-07-11 00:13:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(61,'193020006','Costilla de Cerdo',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:14:05','2026-07-11 00:14:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(62,'193020007','Res',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:14:42','2026-07-11 00:14:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(63,'193020008','Pescado',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:15:27','2026-07-11 00:15:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(64,'193020009','Camaron',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:16:08','2026-07-11 00:16:08',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(65,'193020012','Langosta',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:17:00','2026-07-11 00:17:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(66,'193020013','Jamon',NULL,1,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:19:58','2026-07-11 00:19:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(67,'193060004','queso gouda',NULL,3,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:31:18','2026-07-11 00:31:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(68,'193060005','queso blanco',NULL,3,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:32:46','2026-07-11 00:32:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(69,'193020010','Atun',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:33:43','2026-07-11 00:33:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(70,'193090004','Cafe',NULL,4,'materia_prima',8,1,2,1200.0000,0.0000,20.000,NULL,0,0,NULL,1,'2026-07-11 00:34:33','2026-08-28 21:37:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(71,'193090009','Aceituna',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:35:16','2026-07-11 00:35:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(72,'193080002','Limon',NULL,5,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:36:25','2026-07-11 00:36:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(73,'193010010','azucar',NULL,9,'materia_prima',1,1,2,1000.0000,0.0000,20.000,NULL,0,0,NULL,1,'2026-07-11 00:37:40','2026-08-27 17:32:23',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787849600241-265651437.png'),
(74,'193080001','Piña',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:38:17','2026-07-11 00:38:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(75,'193080003','Guayaba',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:38:57','2026-07-11 00:38:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(76,'193080004','Fruta Bomba',NULL,2,'materia_prima',1,1,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:39:29','2026-07-11 00:39:29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(77,'193090010','Pan',NULL,5,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:42:13','2026-07-11 00:42:13',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(78,'193030001','Tomate',NULL,2,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:43:22','2026-07-11 00:43:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(79,'193030002','Col',NULL,2,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:43:56','2026-07-11 00:43:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(80,'193030003','Pepino',NULL,2,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:44:32','2026-07-11 00:44:32',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(81,'193030004','Habichuela',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:45:33','2026-07-11 00:45:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(82,'193030005','Lechuga',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:46:20','2026-07-11 00:46:20',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(83,'193030006','Acelga',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:47:17','2026-07-11 00:47:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(84,'193030007','Zanahoria',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:48:00','2026-07-11 00:48:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(85,'193030008','Remolacha',NULL,2,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:48:44','2026-07-11 00:48:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(86,'193050017','Clavo de olor',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:49:25','2026-07-11 00:49:25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(87,'193090011','Pizza',NULL,5,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:50:01','2026-07-11 00:50:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(88,'183010004','Cloro',NULL,8,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:50:35','2026-07-11 00:50:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(89,'193060007','Mayonesa',NULL,3,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:51:27','2026-07-11 00:51:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(90,'193070001','Cerveza Importada',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 20:46:15','2026-07-13 20:46:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(91,'193070002','Cereza Nacional',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 20:47:35','2026-07-13 20:47:35',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(93,'193070004','Cerveza Importada Corona',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 20:53:18','2026-07-13 20:53:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(94,'193070005','Agua Natural',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 20:56:42','2026-07-13 20:56:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(95,'193020014','Escalope de Cerdo',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:00:17','2026-07-13 21:00:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(96,'183010005','Frazada de Piso',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:01:59','2026-07-13 21:01:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(97,'193020015','Lomo de Cerdo porcionado',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:03:52','2026-07-13 21:03:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(98,'193020016','Pechuga de Pollo Porcionado',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:05:05','2026-07-13 21:05:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(99,'193020017','Pollo con Hueso',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:05:58','2026-07-13 21:05:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(100,'193020018','Filete de Pescado Porcionado',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:06:58','2026-07-13 21:06:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(101,'193020019','Ruedas de Pescado Porcionado',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:08:07','2026-07-13 21:08:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(102,'193020020','Camarones Porcionado',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:10:03','2026-07-13 21:10:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(103,'193020021','Langosta Porcionada',NULL,1,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:13:16','2026-07-13 21:13:16',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(104,'193020022','Jamon Vicking',NULL,1,'materia_prima',2,2,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:15:40','2026-07-13 21:15:40',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(106,'193070008','Ron Blanco',NULL,4,'materia_prima',10,10,5,3000.0000,0.0000,15.000,NULL,0,0,NULL,1,'2026-07-13 21:49:28','2026-08-27 17:32:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787850516872-948625407.png'),
(107,'193070009','Vino Tinto Barato',NULL,4,'materia_prima',5,5,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:50:40','2026-07-13 21:50:40',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(108,'193070010','Vino Blanco Barato',NULL,4,'materia_prima',5,5,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 21:55:26','2026-07-13 21:55:26',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(109,'183010006','Aragàn',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 22:05:27','2026-07-13 22:05:27',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(110,'183010007','Desincrustante',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 22:06:54','2026-07-13 22:06:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(111,'183010009','Palo de Trapear',NULL,8,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-13 22:13:49','2026-07-13 22:13:49',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(113,'ING-012','Menta o Hierba Buena',NULL,9,'materia_prima',8,8,NULL,400.0000,0.0000,5.000,NULL,0,0,NULL,1,'2026-08-25 17:11:43','2026-08-25 17:15:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787677903416-304274910.png'),
(114,'PROD-001','Lata de Refresco de Limon (Ins)',NULL,4,'materia_prima',7,6,5,8500.0000,0.0000,24.000,NULL,0,0,NULL,1,'2026-08-27 17:00:19','2026-08-27 17:29:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787850019961-265427146.png'),
(115,'PROD-002','Palitos Picantes',NULL,5,'materia_prima',7,8,8,100.0000,0.0000,5.000,NULL,0,0,NULL,1,'2026-08-27 17:27:18','2026-08-27 17:27:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(116,'MAT-002','Levadura Seca',NULL,9,'materia_prima',1,1,2,1800.0000,0.0000,5.000,NULL,0,0,NULL,1,'2026-08-28 19:12:10','2026-08-28 19:12:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787944330270-714675338.png'),
(117,'PROD-003','Brandy',NULL,4,'producto_venta',10,10,5,8000.0000,0.0000,5.000,NULL,0,0,NULL,1,'2026-08-28 20:04:11','2026-08-28 20:04:11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'/uploads/foto-1787947451547-660336458.jpeg');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pronosticos_consumo`
--

DROP TABLE IF EXISTS `pronosticos_consumo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pronosticos_consumo` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_generacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `metodo_pronostico` enum('MANUAL','PROMEDIO_MOVIL','PROMEDIO_PONDERADO','TENDENCIA','ESTACIONALIDAD','EVENTOS','IA') NOT NULL DEFAULT 'MANUAL',
  `estado` enum('BORRADOR','CALCULADO','APROBADO','UTILIZADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
  `generado_por` int(11) NOT NULL,
  `aprobado_por` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_pc_generado_por` (`generado_por`),
  KEY `fk_pc_aprobado_por` (`aprobado_por`),
  KEY `idx_pc_estado` (`estado`),
  KEY `idx_pc_fechas` (`fecha_inicio`,`fecha_fin`),
  KEY `idx_pc_metodo` (`metodo_pronostico`),
  CONSTRAINT `fk_pc_aprobado_por` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pc_generado_por` FOREIGN KEY (`generado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pronosticos_consumo`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pronosticos_consumo` WRITE;
/*!40000 ALTER TABLE `pronosticos_consumo` DISABLE KEYS */;
/*!40000 ALTER TABLE `pronosticos_consumo` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pronosticos_consumo_detalle`
--

DROP TABLE IF EXISTS `pronosticos_consumo_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pronosticos_consumo_detalle` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pronostico_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned DEFAULT NULL,
  `unidad_medida_id` bigint(20) unsigned NOT NULL,
  `consumo_historico` decimal(18,3) NOT NULL DEFAULT 0.000,
  `consumo_promedio_diario` decimal(18,3) NOT NULL DEFAULT 0.000,
  `consumo_proyectado` decimal(18,3) NOT NULL,
  `factor_estacionalidad` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `factor_evento` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `factor_crecimiento` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `confianza_porcentaje` decimal(5,2) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pcd_unidad` (`unidad_medida_id`),
  KEY `idx_pcd_pronostico` (`pronostico_id`),
  KEY `idx_pcd_producto` (`producto_id`),
  KEY `idx_pcd_almacen` (`almacen_id`),
  CONSTRAINT `fk_pcd_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pcd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_pcd_pronostico` FOREIGN KEY (`pronostico_id`) REFERENCES `pronosticos_consumo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pcd_unidad` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pronosticos_consumo_detalle`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pronosticos_consumo_detalle` WRITE;
/*!40000 ALTER TABLE `pronosticos_consumo_detalle` DISABLE KEYS */;
/*!40000 ALTER TABLE `pronosticos_consumo_detalle` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `pronosticos_precision`
--

DROP TABLE IF EXISTS `pronosticos_precision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pronosticos_precision` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pronostico_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `consumo_proyectado` decimal(18,3) NOT NULL,
  `consumo_real` decimal(18,3) NOT NULL,
  `error_absoluto` decimal(18,3) NOT NULL,
  `porcentaje_error` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_pp_pronostico` (`pronostico_id`),
  CONSTRAINT `fk_pp_pronostico` FOREIGN KEY (`pronostico_id`) REFERENCES `pronosticos_consumo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pronosticos_precision`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pronosticos_precision` WRITE;
/*!40000 ALTER TABLE `pronosticos_precision` DISABLE KEYS */;
/*!40000 ALTER TABLE `pronosticos_precision` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre_comercial` varchar(150) NOT NULL,
  `razon_social` varchar(200) DEFAULT NULL,
  `identificacion_fiscal` varchar(50) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `telefono_secundario` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `sitio_web` varchar(255) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `provincia_estado` varchar(100) DEFAULT NULL,
  `pais` varchar(100) DEFAULT NULL,
  `persona_contacto` varchar(150) DEFAULT NULL,
  `cargo_contacto` varchar(100) DEFAULT NULL,
  `condiciones_pago` varchar(255) DEFAULT NULL,
  `dias_credito` int(10) unsigned DEFAULT 0,
  `limite_credito` decimal(18,2) DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `calificacion` decimal(3,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_proveedores_nombre` (`nombre_comercial`),
  KEY `idx_proveedores_activo` (`activo`),
  KEY `idx_proveedores_identificacion` (`identificacion_fiscal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `proveedores` WRITE;
/*!40000 ALTER TABLE `proveedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedores` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `proveedores_productos`
--

DROP TABLE IF EXISTS `proveedores_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores_productos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `proveedor_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `codigo_proveedor` varchar(100) DEFAULT NULL,
  `nombre_producto_proveedor` varchar(255) DEFAULT NULL,
  `unidad_compra_id` bigint(20) unsigned NOT NULL,
  `factor_conversion` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `precio_referencia` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `precio_ultimo` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `moneda` varchar(10) NOT NULL DEFAULT 'USD',
  `lead_time_dias` int(11) NOT NULL DEFAULT 0,
  `cantidad_minima_compra` decimal(18,3) DEFAULT NULL,
  `cantidad_multiple_compra` decimal(18,3) DEFAULT NULL,
  `proveedor_preferido` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_ultima_compra` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pp_producto_proveedor` (`proveedor_id`,`producto_id`),
  KEY `fk_pp_unidad` (`unidad_compra_id`),
  KEY `idx_pp_producto` (`producto_id`),
  KEY `idx_pp_proveedor` (`proveedor_id`),
  KEY `idx_pp_preferido` (`proveedor_preferido`),
  KEY `idx_pp_activo` (`activo`),
  CONSTRAINT `fk_pp_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_unidad` FOREIGN KEY (`unidad_compra_id`) REFERENCES `unidades_medida` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores_productos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `proveedores_productos` WRITE;
/*!40000 ALTER TABLE `proveedores_productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedores_productos` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `proveedores_productos_metricas`
--

DROP TABLE IF EXISTS `proveedores_productos_metricas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores_productos_metricas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `proveedor_producto_id` bigint(20) unsigned NOT NULL,
  `fecha_evaluacion` date NOT NULL,
  `calidad` decimal(5,2) NOT NULL,
  `cumplimiento` decimal(5,2) NOT NULL,
  `puntualidad` decimal(5,2) NOT NULL,
  `precio` decimal(5,2) NOT NULL,
  `calificacion_total` decimal(5,2) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_ppm_pp` (`proveedor_producto_id`),
  CONSTRAINT `fk_ppm_pp` FOREIGN KEY (`proveedor_producto_id`) REFERENCES `proveedores_productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedores_productos_metricas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `proveedores_productos_metricas` WRITE;
/*!40000 ALTER TABLE `proveedores_productos_metricas` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedores_productos_metricas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `recepciones`
--

DROP TABLE IF EXISTS `recepciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recepciones` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_recepcion` varchar(50) NOT NULL,
  `orden_compra_id` bigint(20) unsigned NOT NULL,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `fecha_recepcion` datetime NOT NULL DEFAULT current_timestamp(),
  `numero_factura` varchar(100) DEFAULT NULL,
  `estado` enum('BORRADOR','RECIBIDA','PARCIAL','RECHAZADA') NOT NULL DEFAULT 'BORRADOR',
  `observaciones` text DEFAULT NULL,
  `recibido_por` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_recepcion` (`numero_recepcion`),
  KEY `fk_recepcion_usuario` (`recibido_por`),
  KEY `idx_recepcion_orden` (`orden_compra_id`),
  KEY `idx_recepcion_fecha` (`fecha_recepcion`),
  KEY `idx_recepcion_almacen` (`almacen_id`),
  KEY `idx_recepcion_estado` (`estado`),
  KEY `idx_recepcion_numero` (`numero_recepcion`),
  CONSTRAINT `fk_recepcion_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_recepcion_orden` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra` (`id`),
  CONSTRAINT `fk_recepcion_usuario` FOREIGN KEY (`recibido_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recepciones`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recepciones` WRITE;
/*!40000 ALTER TABLE `recepciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `recepciones` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `recepciones_lotes`
--

DROP TABLE IF EXISTS `recepciones_lotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recepciones_lotes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `recepcion_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned NOT NULL,
  `cantidad_recibida` decimal(18,3) NOT NULL,
  `costo_unitario` decimal(18,6) NOT NULL,
  `costo_total` decimal(18,6) NOT NULL,
  `fecha_fabricacion` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rl_recepcion` (`recepcion_id`),
  KEY `idx_rl_producto` (`producto_id`),
  KEY `idx_rl_lote` (`lote_id`),
  CONSTRAINT `fk_rl_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  CONSTRAINT `fk_rl_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_rl_recepcion` FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recepciones_lotes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recepciones_lotes` WRITE;
/*!40000 ALTER TABLE `recepciones_lotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `recepciones_lotes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `receta_detalles`
--

DROP TABLE IF EXISTS `receta_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `receta_detalles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receta_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `cantidad` decimal(18,4) NOT NULL,
  `unidad_medida` varchar(20) NOT NULL,
  `porcentaje_merma` decimal(5,2) NOT NULL DEFAULT 0.00,
  `costo_estimado` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `orden_preparacion` int(10) unsigned NOT NULL DEFAULT 1,
  `es_opcional` tinyint(1) NOT NULL DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rd_receta_producto` (`receta_id`,`producto_id`),
  KEY `idx_rd_receta` (`receta_id`),
  KEY `idx_rd_producto` (`producto_id`),
  KEY `idx_rd_receta_producto` (`receta_id`,`producto_id`),
  CONSTRAINT `fk_rd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_rd_receta` FOREIGN KEY (`receta_id`) REFERENCES `recetas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receta_detalles`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `receta_detalles` WRITE;
/*!40000 ALTER TABLE `receta_detalles` DISABLE KEYS */;
INSERT INTO `receta_detalles` VALUES
(31,8,106,30.0000,'Mililitro',0.00,0.0000,1,0,NULL,'2026-08-27 17:06:24','2026-08-27 17:06:24'),
(32,8,73,10.0000,'Gramo',0.00,0.0000,2,0,NULL,'2026-08-27 17:06:24','2026-08-27 17:06:24'),
(33,8,114,150.0000,'Mililitro',0.00,0.0000,3,0,NULL,'2026-08-27 17:06:24','2026-08-27 17:06:24'),
(34,8,28,10.0000,'Mililitro',0.00,0.0000,4,0,NULL,'2026-08-27 17:06:24','2026-08-27 17:06:24'),
(35,9,23,590.0000,'Gramo',0.00,0.0000,1,0,NULL,'2026-08-28 19:39:03','2026-08-28 19:39:03'),
(36,9,116,1.7500,'Gramo',0.00,0.0000,2,0,NULL,'2026-08-28 19:39:03','2026-08-28 19:39:03'),
(37,9,31,12.5000,'Gramo',0.00,0.0000,3,0,NULL,'2026-08-28 19:39:03','2026-08-28 19:39:03'),
(40,10,73,5.0000,'Gramo',0.00,0.0000,1,0,NULL,'2026-08-28 20:04:44','2026-08-28 20:04:44'),
(41,10,70,15.0000,'Gramo',0.00,0.0000,2,0,NULL,'2026-08-28 20:04:44','2026-08-28 20:04:44'),
(42,10,117,25.0000,'Mililitro',0.00,0.0000,3,0,NULL,'2026-08-28 20:04:44','2026-08-28 20:04:44');
/*!40000 ALTER TABLE `receta_detalles` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `recetas`
--

DROP TABLE IF EXISTS `recetas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recetas` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('VENTA','PRODUCCION','PREPARACION_INTERNA') NOT NULL DEFAULT 'VENTA',
  `platillo_id` bigint(20) unsigned NOT NULL,
  `producto_resultante_id` bigint(20) unsigned DEFAULT NULL,
  `rendimiento` decimal(18,3) NOT NULL DEFAULT 1.000,
  `unidad_rendimiento` varchar(20) NOT NULL,
  `tiempo_preparacion_minutos` int(10) unsigned DEFAULT NULL,
  `costo_estimado` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `precio_sugerido` decimal(18,4) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `creada_por` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_receta_usuario` (`creada_por`),
  KEY `idx_receta_codigo` (`codigo`),
  KEY `idx_receta_tipo` (`tipo`),
  KEY `idx_receta_activa` (`activa`),
  KEY `idx_receta_producto` (`platillo_id`) USING BTREE,
  KEY `fk_receta_producto_resultante` (`producto_resultante_id`),
  CONSTRAINT `fk_receta_producto_resultante` FOREIGN KEY (`producto_resultante_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION,
  CONSTRAINT `fk_receta_usuario` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_recetas_platillo` FOREIGN KEY (`platillo_id`) REFERENCES `platillos_menu` (`id`) ON DELETE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recetas` WRITE;
/*!40000 ALTER TABLE `recetas` DISABLE KEYS */;
INSERT INTO `recetas` VALUES
(8,'REC-001','Mojito','Mojito clasico','VENTA',113,NULL,1.000,'Unidad',3,0.0000,750.0000,1,1,NULL,3,'2026-08-27 17:06:24','2026-08-27 17:06:24'),
(9,'REC-002','Pizza Napolitana','Pizza regular','PREPARACION_INTERNA',80,NULL,1.000,'Unidad',15,0.0000,1350.0000,1,1,NULL,3,'2026-08-28 19:39:03','2026-08-28 19:39:03'),
(10,'REC-003','Cafe Carajillo','Cafe y brandy','VENTA',12,NULL,1.000,'Unidad',5,0.0000,350.0000,1,1,NULL,3,'2026-08-28 20:03:51','2026-08-28 20:03:51');
/*!40000 ALTER TABLE `recetas` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `recetas_versiones`
--

DROP TABLE IF EXISTS `recetas_versiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recetas_versiones` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receta_id` bigint(20) unsigned NOT NULL,
  `version_numero` int(11) NOT NULL,
  `nombre_version` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio_vigencia` date NOT NULL,
  `fecha_fin_vigencia` date DEFAULT NULL,
  `es_version_activa` tinyint(1) NOT NULL DEFAULT 0,
  `rendimiento_esperado` decimal(18,3) DEFAULT NULL,
  `costo_estimado` decimal(18,6) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `usuario_creacion_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receta_version` (`receta_id`,`version_numero`),
  KEY `fk_rv_usuario` (`usuario_creacion_id`),
  KEY `idx_rv_receta` (`receta_id`),
  KEY `idx_rv_activa` (`es_version_activa`),
  CONSTRAINT `fk_rv_receta` FOREIGN KEY (`receta_id`) REFERENCES `recetas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rv_usuario` FOREIGN KEY (`usuario_creacion_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas_versiones`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recetas_versiones` WRITE;
/*!40000 ALTER TABLE `recetas_versiones` DISABLE KEYS */;
/*!40000 ALTER TABLE `recetas_versiones` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `salidas_manuales`
--

DROP TABLE IF EXISTS `salidas_manuales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `salidas_manuales` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `cantidad` decimal(18,3) NOT NULL,
  `tipo` varchar(30) NOT NULL COMMENT 'merma / rotura / perdida',
  `motivo` varchar(150) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sm_almacen` (`almacen_id`),
  KEY `idx_sm_producto` (`producto_id`),
  KEY `idx_sm_fecha` (`fecha_registro`),
  CONSTRAINT `fk_sm_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salidas_manuales`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `salidas_manuales` WRITE;
/*!40000 ALTER TABLE `salidas_manuales` DISABLE KEYS */;
/*!40000 ALTER TABLE `salidas_manuales` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `secuencias_lotes`
--

DROP TABLE IF EXISTS `secuencias_lotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `secuencias_lotes` (
  `anio` smallint(5) unsigned NOT NULL,
  `siguiente` int(10) unsigned NOT NULL DEFAULT 1,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secuencias_lotes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `secuencias_lotes` WRITE;
/*!40000 ALTER TABLE `secuencias_lotes` DISABLE KEYS */;
INSERT INTO `secuencias_lotes` VALUES
(2026,5,'2026-08-29 02:20:14');
/*!40000 ALTER TABLE `secuencias_lotes` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `transferencias`
--

DROP TABLE IF EXISTS `transferencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transferencias` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `numero_transferencia` varchar(50) NOT NULL,
  `almacen_origen_id` bigint(20) unsigned NOT NULL,
  `almacen_destino_id` bigint(20) unsigned NOT NULL,
  `fecha_transferencia` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` enum('BORRADOR','PENDIENTE','EN_TRANSITO','RECIBIDA','CANCELADA','APROBADA','RECHAZADA','COMPLETADA') NOT NULL DEFAULT 'BORRADOR',
  `observaciones` text DEFAULT NULL,
  `solicitado_por` int(11) NOT NULL,
  `autorizado_por` int(11) DEFAULT NULL,
  `recibido_por` int(11) DEFAULT NULL,
  `fecha_autorizacion` datetime DEFAULT NULL,
  `fecha_recepcion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_envio` datetime DEFAULT NULL,
  `usuario_envio_id` int(11) DEFAULT NULL,
  `turno_servicio_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_transferencia` (`numero_transferencia`),
  KEY `fk_transferencia_solicitante` (`solicitado_por`),
  KEY `fk_transferencia_autorizador` (`autorizado_por`),
  KEY `fk_transferencia_receptor` (`recibido_por`),
  KEY `idx_transferencia_numero` (`numero_transferencia`),
  KEY `idx_transferencia_origen` (`almacen_origen_id`),
  KEY `idx_transferencia_destino` (`almacen_destino_id`),
  KEY `idx_transferencia_estado` (`estado`),
  KEY `idx_transferencia_fecha` (`fecha_transferencia`),
  KEY `fk_transfer_usuario_envio` (`usuario_envio_id`),
  KEY `fk_transferencias_turno` (`turno_servicio_id`),
  CONSTRAINT `fk_transfer_usuario_envio` FOREIGN KEY (`usuario_envio_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_transferencia_autorizador` FOREIGN KEY (`autorizado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transferencia_destino` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_transferencia_origen` FOREIGN KEY (`almacen_origen_id`) REFERENCES `almacenes` (`id`),
  CONSTRAINT `fk_transferencia_receptor` FOREIGN KEY (`recibido_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transferencia_solicitante` FOREIGN KEY (`solicitado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_transferencias_turno` FOREIGN KEY (`turno_servicio_id`) REFERENCES `turnos_servicio` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transferencias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transferencias` WRITE;
/*!40000 ALTER TABLE `transferencias` DISABLE KEYS */;
INSERT INTO `transferencias` VALUES
(17,'TRF-000017',1,5,'2026-08-28 22:22:39','COMPLETADA','Solicitud de insumos para el servicio.',3,NULL,NULL,NULL,NULL,'2026-08-29 02:22:39','2026-08-29 02:23:10',NULL,NULL,NULL);
/*!40000 ALTER TABLE `transferencias` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `transferencias_detalle`
--

DROP TABLE IF EXISTS `transferencias_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transferencias_detalle` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transferencia_id` bigint(20) unsigned NOT NULL,
  `producto_id` bigint(20) unsigned NOT NULL,
  `lote_id` bigint(20) unsigned DEFAULT NULL,
  `ubicacion_origen_id` bigint(20) unsigned DEFAULT NULL,
  `ubicacion_destino_id` bigint(20) unsigned DEFAULT NULL,
  `unidad_medida_id` bigint(20) unsigned NOT NULL,
  `cantidad_solicitada` decimal(18,3) NOT NULL,
  `cantidad_enviada` decimal(18,3) NOT NULL DEFAULT 0.000,
  `cantidad_recibida` decimal(18,3) NOT NULL DEFAULT 0.000,
  `costo_unitario` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `costo_total` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_td_unidad` (`unidad_medida_id`),
  KEY `idx_td_transferencia` (`transferencia_id`),
  KEY `idx_td_producto` (`producto_id`),
  KEY `idx_td_lote` (`lote_id`),
  KEY `idx_td_ubicacion_origen` (`ubicacion_origen_id`),
  KEY `idx_td_ubicacion_destino` (`ubicacion_destino_id`),
  CONSTRAINT `fk_td_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_td_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `fk_td_transferencia` FOREIGN KEY (`transferencia_id`) REFERENCES `transferencias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_td_ubicacion_destino` FOREIGN KEY (`ubicacion_destino_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_td_ubicacion_origen` FOREIGN KEY (`ubicacion_origen_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_td_unidad` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transferencias_detalle`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transferencias_detalle` WRITE;
/*!40000 ALTER TABLE `transferencias_detalle` DISABLE KEYS */;
INSERT INTO `transferencias_detalle` VALUES
(9,17,117,NULL,NULL,NULL,10,2.000,2.000,2.000,0.000000,0.000000,NULL,'2026-08-29 02:22:39','2026-08-29 02:23:10'),
(10,17,70,NULL,NULL,NULL,1,2.000,2.000,2.000,0.000000,0.000000,NULL,'2026-08-29 02:22:39','2026-08-29 02:23:10'),
(11,17,73,NULL,NULL,NULL,1,1.000,1.000,1.000,0.000000,0.000000,NULL,'2026-08-29 02:22:39','2026-08-29 02:23:10');
/*!40000 ALTER TABLE `transferencias_detalle` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `turnos_servicio`
--

DROP TABLE IF EXISTS `turnos_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos_servicio` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_apertura_id` int(11) NOT NULL,
  `usuario_cierre_id` int(11) DEFAULT NULL,
  `fecha_apertura` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` timestamp NULL DEFAULT NULL,
  `monto_apertura` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monto_cierre_esperado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monto_cierre_real` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ts_usuario_apertura` (`usuario_apertura_id`),
  KEY `fk_ts_usuario_cierre` (`usuario_cierre_id`),
  CONSTRAINT `fk_ts_usuario_apertura` FOREIGN KEY (`usuario_apertura_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_ts_usuario_cierre` FOREIGN KEY (`usuario_cierre_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos_servicio`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `turnos_servicio` WRITE;
/*!40000 ALTER TABLE `turnos_servicio` DISABLE KEYS */;
INSERT INTO `turnos_servicio` VALUES
(3,3,3,'2026-08-27 14:05:09','2026-08-28 18:42:59',5500.00,31900.00,26300.00,'cerrado',NULL),
(4,3,NULL,'2026-08-28 18:43:14',NULL,8000.00,0.00,0.00,'abierto',NULL);
/*!40000 ALTER TABLE `turnos_servicio` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `ubicaciones_almacen`
--

DROP TABLE IF EXISTS `ubicaciones_almacen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ubicaciones_almacen` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `almacen_id` bigint(20) unsigned NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('ESTANTE','REFRIGERADOR','CONGELADOR','CAMARA_FRIA','RACK','AREA_PREPARACION','OTRO') NOT NULL DEFAULT 'ESTANTE',
  `ubicacion_padre_id` bigint(20) unsigned DEFAULT NULL,
  `nivel` smallint(5) unsigned NOT NULL DEFAULT 1,
  `capacidad_maxima` decimal(18,3) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ua_almacen_codigo` (`almacen_id`,`codigo`),
  KEY `idx_ua_almacen` (`almacen_id`),
  KEY `idx_ua_codigo` (`codigo`),
  KEY `idx_ua_tipo` (`tipo`),
  KEY `idx_ua_padre` (`ubicacion_padre_id`),
  KEY `idx_ua_activa` (`activa`),
  CONSTRAINT `fk_ua_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ua_padre` FOREIGN KEY (`ubicacion_padre_id`) REFERENCES `ubicaciones_almacen` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ubicaciones_almacen`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ubicaciones_almacen` WRITE;
/*!40000 ALTER TABLE `ubicaciones_almacen` DISABLE KEYS */;
/*!40000 ALTER TABLE `ubicaciones_almacen` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `unidades_medida`
--

DROP TABLE IF EXISTS `unidades_medida`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_medida` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `abreviatura` varchar(20) NOT NULL,
  `tipo` enum('PESO','VOLUMEN','LONGITUD','UNIDAD','EMPAQUE') NOT NULL,
  `permite_decimales` tinyint(1) NOT NULL DEFAULT 1,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_um_codigo` (`codigo`),
  KEY `idx_um_tipo` (`tipo`),
  KEY `idx_um_activa` (`activa`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `unidades_medida`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `unidades_medida` WRITE;
/*!40000 ALTER TABLE `unidades_medida` DISABLE KEYS */;
INSERT INTO `unidades_medida` VALUES
(1,'KG','Kilogramo','kg','PESO',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(2,'G','Gramo','gr','PESO',1,1,'2026-06-08 12:00:07','2026-08-26 20:18:54'),
(3,'LB','Libra','lb','PESO',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(4,'L','Litro','l','VOLUMEN',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(5,'ML','Mililitro','ml','VOLUMEN',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(6,'UND','Unidad','und','UNIDAD',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(7,'CJ','Caja','cj','EMPAQUE',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(8,'PAQ','Paquete','paq','EMPAQUE',1,1,'2026-06-08 12:00:07','2026-06-08 12:00:07'),
(9,'PORC','Porciones','porc','UNIDAD',1,1,'2026-06-26 14:51:00','2026-06-26 14:51:00'),
(10,'BT','Botella 700ml','bt','VOLUMEN',1,1,'2026-08-26 20:49:49','2026-08-29 01:59:52');
/*!40000 ALTER TABLE `unidades_medida` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `usuario` varchar(50) NOT NULL,
  `rol` enum('superadministrador','administrador','capitan','dependiente','dependiente-pos','bartender','almacenero','luncher','porcionador','fregador','jefe-cocina','cocinero','ayudante-cocina','cajero','chofer','economico','comercial') NOT NULL DEFAULT 'dependiente',
  `password` varchar(255) NOT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
(2,'Eilen','Tato Terroba','eilen@gmail.com','eilen','dependiente','$2b$10$Wds2zHD8gkqFhr5U5zkgYOeWh3VvLYbo4ZQ6VZzNEBpHZ4.cZtjuy','foto-1781952201934-716691783.png','2026-06-07 05:05:23',1),
(3,'Willian','Portilla Torriente','argoslord7@gmail.com','argoslord7','superadministrador','$2b$10$a9BM9CuF697UApXroZtYiOR9cRm1DwNW5R./ZLGXEWeLDGY0GVyGS','foto-1782069559916-774089300.jpeg','2026-06-07 14:42:21',1),
(4,'Maria','Gonzalez Diaz','maria@gmail.com','maria','dependiente','$2b$10$CyEmMGAI9Adh3ZQ2fIk1tee7yViaV5WpgltwqsxwoYypPEcsZwSc2','foto-1781952215191-59171121.png','2026-06-07 15:24:30',1),
(6,'_default_user_name_','_default_user_lastname_','superadmin@bahia.com','_default_user_','superadministrador','$2b$10$pRLOa8SVVwjf1T6poHCMlOwxFrlHROth/qaGit5k.jdADuajHvBuS',NULL,'2026-06-07 13:22:03',1),
(11,'Joaquin Urtaquio','Valladares Lopez','joaquin@gmail.com','joaquin','dependiente','$2b$10$QLkP6J9j.oTI1KCmrW04IOgnqr/w1eDqWzvseY8ztabdVubvzWSZu','foto-1781952257454-904899947.png','2026-06-17 20:15:52',1),
(17,'Joanne','zchultz Diaz','joanne@gmail.com','joanne','capitan','$2b$10$eyL/AG0Fkt6c/ibKYk.Aq.kL1XE7F1e9DgAyHh7WUTgvgXyYpLc8C','foto-1782408556566-137993522.png','2026-06-25 17:29:16',1),
(20,'Jack','Sparrow',NULL,'jack','cocinero','$2b$10$IkPjREJngBEnpVuVCjk.TOIZmbZiGT4GjKrRpiQ0DrqP0.Vc46sOK','foto-1784634469401-825459344.png','2026-07-14 02:22:05',1),
(21,'Felipe Jose','Franco Holland','felipe97@gmail.com','felipe','bartender','$2b$10$u1l.6vcLygB6hblaCgfOP.pohF8FJaiUs.yxSLM.AlwqS.2krOp1m','foto-1784235610174-81005040.png','2026-07-16 21:00:10',1),
(22,'Marcelo','Salado del Mar','marcelo@gmail.com','marcelo','almacenero','$2b$10$eqUEacD0lkOceoxjquqHHuGuHEXyCrkI/ugHXdVCrYhqGdDNE5Z0m','foto-1787839429633-273712299.png','2026-08-27 14:03:08',1);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `usuarios_tokens`
--

DROP TABLE IF EXISTS `usuarios_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `expira_en` datetime NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_tokens_huella` (`token`,`expira_en`),
  KEY `idx_tokens_usuario` (`usuario_id`),
  CONSTRAINT `usuarios_tokens_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios_tokens`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `usuarios_tokens` WRITE;
/*!40000 ALTER TABLE `usuarios_tokens` DISABLE KEYS */;
INSERT INTO `usuarios_tokens` VALUES
(12,'510db6ac352ed5512de49e1ca4432a22012e97920f09a0283c593b17cf89e3c1',3,'2026-09-03 17:51:33','2026-08-19 21:51:33');
/*!40000 ALTER TABLE `usuarios_tokens` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Dumping routines for database 'restaurante_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-08-29  9:23:12
