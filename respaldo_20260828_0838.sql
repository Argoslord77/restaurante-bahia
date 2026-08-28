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
(1,'A002','Almacen Central','Almacen Logistico Central del restaurante','principal','Casa Matriz',3,0,1,1,'2026-06-10 15:54:47','2026-07-02 16:47:56'),
(2,'A001','Cocina','Almacen de cocina','cocina','Casa Matriz',NULL,1,1,1,'2026-06-11 00:16:06','2026-07-02 16:45:42'),
(5,'A003','Bar','Area de almacenamiento del Bar','bar','BAR',NULL,1,1,1,'2026-07-02 16:47:06','2026-07-02 16:47:06');
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(17,'2026-08-27','Balcon',3,'2026-08-27 14:09:33');
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
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_usuarios`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `auditoria_usuarios` WRITE;
/*!40000 ALTER TABLE `auditoria_usuarios` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cierres_servicio`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cierres_servicio` WRITE;
/*!40000 ALTER TABLE `cierres_servicio` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2731 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(8,'inventario_unidades','Uds, Kg, Lts, Oz','Unidades de Medida Permitidas (Stock)','inventario','string','2026-08-24 15:48:47');
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
(8,NULL,10,5,700.00000000,0,1,'Aplicable para todas las botellas de 700 ml','2026-08-27 17:38:14','2026-08-27 17:38:14');
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
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(108,17,26,11);
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
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_pedido`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `detalles_pedido` WRITE;
/*!40000 ALTER TABLE `detalles_pedido` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lotes`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `lotes` WRITE;
/*!40000 ALTER TABLE `lotes` DISABLE KEYS */;
INSERT INTO `lotes` VALUES
(17,106,1,'LOT-2026-001',NULL,NULL,'2026-08-27',NULL,20.000,20.000,3000.0000,NULL,'ACTIVO',NULL,'2026-08-27 17:49:40','2026-08-27 17:49:40',NULL,10,20.000);
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
(25,'Nro 5',8,'libre','Terraza','2026-08-27 14:07:21','2026-08-27 14:07:21','CUP'),
(26,'Nro 6',2,'libre','Balcon','2026-08-27 14:07:39','2026-08-27 14:07:39','CUP'),
(27,'Nro 7',4,'libre','Salon Principal','2026-08-27 14:08:27','2026-08-27 14:08:27','CUP'),
(28,'Nro 8',6,'libre','Terraza','2026-08-27 14:08:48','2026-08-27 14:08:48','CUP');
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
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monedas_turno`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `monedas_turno` WRITE;
/*!40000 ALTER TABLE `monedas_turno` DISABLE KEYS */;
INSERT INTO `monedas_turno` VALUES
(7,3,1,1.0000),
(8,3,3,443.1600),
(9,3,5,785.0000),
(10,3,6,780.2300),
(11,3,4,1.3700),
(12,3,2,660.0000),
(13,4,1,1.0000),
(14,4,3,443.1600),
(15,4,5,785.0000),
(16,4,6,780.2300),
(17,4,4,1.3700),
(18,4,2,660.0000),
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
(55,3,7,660.0000);
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(7,'2026-08-27 13:49:40',106,1,17,'AJUSTE_POSITIVO','entrada_almacen',17,20.000,3000.0000,60000.0000,0.000,20.000,'Entrada manual de inventario (lote nuevo)',NULL,'2026-08-27 17:49:40','LOT-2026-001');
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos_pedido`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pagos_pedido` WRITE;
/*!40000 ALTER TABLE `pagos_pedido` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platillos_dia`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `platillos_dia` WRITE;
/*!40000 ALTER TABLE `platillos_dia` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(23,'193010008','Harina',NULL,6,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:35:25','2026-07-11 00:10:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(24,'193050004','Caldo de Pollo',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:36:04','2026-07-10 23:36:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(25,'193050003','Caldo de Res',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:36:56','2026-07-10 23:36:56',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(26,'193050002','Caldo de Camaron',NULL,9,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:37:41','2026-07-10 23:37:41',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(27,'193060002','Leche liquida',NULL,3,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:38:46','2026-07-10 23:38:46',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(28,'193090001','Jugo de limòn',NULL,4,'materia_prima',4,4,5,1200.0000,0.0000,12.000,NULL,0,0,NULL,1,'2026-07-10 23:39:28','2026-08-27 17:32:57',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'/uploads/foto-1787850127605-111727608.png'),
(29,'193090002','Vinagre',NULL,9,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:40:06','2026-07-10 23:40:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(30,'193090003','Vino Seco',NULL,9,'materia_prima',4,4,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:40:43','2026-07-10 23:40:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
(31,'193050001','Sal',NULL,9,'materia_prima',3,3,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-10 23:41:42','2026-07-10 23:41:42',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
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
(70,'193090004','Cafe',NULL,4,'materia_prima',6,6,NULL,0.0000,0.0000,0.000,NULL,0,0,NULL,1,'2026-07-11 00:34:33','2026-07-11 00:34:33',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL),
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
(115,'PROD-002','Palitos Picantes',NULL,5,'materia_prima',7,8,8,100.0000,0.0000,5.000,NULL,0,0,NULL,1,'2026-08-27 17:27:18','2026-08-27 17:27:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
(34,8,28,10.0000,'Mililitro',0.00,0.0000,4,0,NULL,'2026-08-27 17:06:24','2026-08-27 17:06:24');
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recetas`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recetas` WRITE;
/*!40000 ALTER TABLE `recetas` DISABLE KEYS */;
INSERT INTO `recetas` VALUES
(8,'REC-001','Mojito','Mojito clasico','VENTA',113,NULL,1.000,'Unidad',3,0.0000,750.0000,1,1,NULL,3,'2026-08-27 17:06:24','2026-08-27 17:06:24');
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
(2026,2,'2026-08-27 17:49:40');
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transferencias`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transferencias` WRITE;
/*!40000 ALTER TABLE `transferencias` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transferencias_detalle`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `transferencias_detalle` WRITE;
/*!40000 ALTER TABLE `transferencias_detalle` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos_servicio`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `turnos_servicio` WRITE;
/*!40000 ALTER TABLE `turnos_servicio` DISABLE KEYS */;
INSERT INTO `turnos_servicio` VALUES
(3,3,NULL,'2026-08-27 14:05:09',NULL,5500.00,0.00,0.00,'abierto','Turno del 27-08-2026am se comienza con 5500 CUP en efectivo. ');
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
(10,'BLLA','Botella 700ml','bt','VOLUMEN',1,1,'2026-08-26 20:49:49','2026-08-26 20:49:49');
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
(1,'daf2f908c585b1fabda0506f8c93beefbc182a7f93e93cf3ee5e77e8fe88926b3fac09517e40309f6fb22e7aa41a81521c7562c9866e792c2152bfd5c81dd9a8',3,'2026-06-27 08:52:04','2026-06-12 12:52:04'),
(3,'18fccb52c729f6de49ea71ea249f885a34cc786fede59ec35de19ce9b63562a98465c47c8b42240823ef95f5d8514223e96acfa0f105fa3ba51b62f61dbe55e7',3,'2026-06-28 10:23:58','2026-06-13 14:23:58'),
(5,'3793d84583349d73062806f73d59477d486042cc7d6f91997e0438175ee41683c8b3180355100abe52f1c70d84c99f988273a7af3cd9eabb77e92e74dcb0cb34',3,'2026-07-06 15:17:07','2026-06-21 19:17:07'),
(7,'8caccfbfec7da97d1ae44b17319a0a8ac9d7adc4f7f792c58a94518e8afa0e252b57595d331e8998e98c9d41057d3c2d62052ab9352d225f0bbffafd0853ccc3',3,'2026-07-06 19:39:11','2026-06-21 23:39:11'),
(8,'83236f7297c24542983911495a28f47067313e46c60acf9c45277cf2a49bd96f69fc3daeeffc1cc26f113f0285699c85d076e479c080d1ae38fecc927e208eba',11,'2026-07-07 08:59:48','2026-06-22 12:59:48'),
(11,'068863e460add7c73bb2369916857b9c4d430e3e73c3e264cbe2118ad600f5c6f6a84d9331b9c2ea99998ba53afeea02c6619bf894146f0619a10b47b1d7943a',3,'2026-07-15 15:51:59','2026-06-30 19:51:59'),
(12,'fad16341a6b075c9efca3edcbeaecce09e4a0f9d003d32c6f53403cd69536d416eaef5262dfc357b8016857093eb4f1707f04044e902840660376d1912b3c562',3,'2026-09-03 17:51:33','2026-08-19 21:51:33');
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

-- Dump completed on 2026-08-28  8:38:42
