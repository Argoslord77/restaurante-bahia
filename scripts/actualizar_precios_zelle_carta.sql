-- ==========================================================================
-- ACTUALIZACIÓN DE CARTA ZELLE — precios USD desde la carta impresa
-- Restaurante Bahía · 2026-09-28
-- ==========================================================================
-- Actualiza precio_usd de 56 platillos EXISTENTES según las 7 fotos de
-- la carta (Servicio Internacional). No toca precio (CUP) ni crea platos.
--
-- CÓMO APLICAR:
--   mysql -u USUARIO -p restaurante_db < scripts/actualizar_precios_zelle_carta.sql
--
-- SEGURO: cada UPDATE busca por nombre exacto; si un nombre no coincide
-- con su tabla actual, esa línea afecta 0 filas (no rompe nada). Al final,
-- la consulta de VERIFICACIÓN muestra qué quedó pendiente (NULL).
-- ==========================================================================

SET SQL_SAFE_UPDATES = 0; -- permite WHERE por nombre (solo esta sesión)

-- ----- Postres -----
-- Carta: Selva Negra .... $2.50
UPDATE platillos_menu SET precio_usd = 2.50 WHERE nombre = 'Selva Negra';

-- Carta: Cake Bombón de Chocolate .... $2.00
UPDATE platillos_menu SET precio_usd = 2.00 WHERE nombre = 'Cake Bombòn de Chocalate';

-- Carta: Cake 3 Leches .... $2.50
UPDATE platillos_menu SET precio_usd = 2.50 WHERE nombre = 'Cake 3 Leche';

-- Carta: Flan al Caramelo .... $1.50
UPDATE platillos_menu SET precio_usd = 1.50 WHERE nombre = 'Flan de Caramelo';

-- ----- Aves -----
-- Carta: Pollo Grille al Ajillo .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Pollo Grille al Ajillo';

-- Carta: Juliana de Pollo Salteado con Mantequilla y Frutas Tropicales .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Juliana de Pollo Salteado con Mantequilla y Frutas Tropicales';

-- Carta: Dedos de Pollo en Salsa de Miel y Ajo .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Dedos de Pollo en Salsa de Miel y Ajo';

-- Carta: Pollo Guisado a la Criolla .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Pollo Guisado a la Criolla';

-- Carta: Pollo Empanada (carta) = Pollo Empanado (BD) .... $5.25
UPDATE platillos_menu SET precio_usd = 5.25 WHERE nombre = 'Pollo Empanado';

-- Carta: Suprema de Pollo al Camarón .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Suprema de Pollo al Camaròn';

-- Carta: Pollo a la Cordon Bleu .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Pollo a la Cordon Bleu';

-- Carta: Arroz con Pollo a la Chorrera .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Arroz con Pollo a la Chorrera';

-- ----- Especialidades Asiáticas -----
-- Carta: Filete de Pescado Agridulce .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Filete de Pescado Agridulce';

-- Carta: Camarones a la Tailandesa .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Camarones a la Tailandesa';

-- Carta: Pollo en Salsa Teriyaki .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Pollo en Salsa Teriyaki';

-- Carta: Arroz Frito Natural .... $3.50
UPDATE platillos_menu SET precio_usd = 3.50 WHERE nombre = 'Arroz Frito Natural';

-- Carta: Arroz Frito Chino Especial (carta) = Arroz Frito Especial (BD) .... $4.00
UPDATE platillos_menu SET precio_usd = 4.00 WHERE nombre = 'Arroz Frito Especial';

-- Carta: Mariposas Chinas en salsa agridulce (carta) = Maripositas China... (BD) .... $2.00
UPDATE platillos_menu SET precio_usd = 2.00 WHERE nombre = 'Maripositas China en Salsa Agridulce';

-- ----- Pescados y Mariscos -----
-- Carta: Enchilado de Langosta .... $8.00
UPDATE platillos_menu SET precio_usd = 8.00 WHERE nombre = 'Enchilado de Langosta';

-- Carta: Langosta a la Crema .... $9.00
UPDATE platillos_menu SET precio_usd = 9.00 WHERE nombre = 'Langosta a la Crema';

---- ⚠️ PROBABLE: revise que sea el mismo plato.
-- Carta: Langosta Grille a la Mantequilla de Ajo (carta) = Langosta Grille al Ajillo (BD) .... $8.00
UPDATE platillos_menu SET precio_usd = 8.00 WHERE nombre = 'Langosta Grille al Ajillo';

-- ----- Especialidades Italianas -----
-- Carta: Spaguetti a la Napolitana .... $2.50
UPDATE platillos_menu SET precio_usd = 2.50 WHERE nombre = 'Spaguetti a la Napolitana';

-- Carta: Spaguetti Carbonara .... $4.00
UPDATE platillos_menu SET precio_usd = 4.00 WHERE nombre = 'Spaguetti Carbonara';

-- Carta: Spaguetti con Jamón a la Vodka .... $3.50
UPDATE platillos_menu SET precio_usd = 3.50 WHERE nombre = 'Spaguetti con Jamon a la Vodka';

-- Carta: Spaguetti Alfredo con Camarones .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Spaguetti Alfredo con Camarones';

-- Carta: Macarrones a la boloñesa .... $4.50
UPDATE platillos_menu SET precio_usd = 4.50 WHERE nombre = 'Macarrones a la Boloñesa';

-- Carta: Pizza Napolitana .... $2.50
UPDATE platillos_menu SET precio_usd = 2.50 WHERE nombre = 'Pizza Napolitana';

-- Carta: Pizza de Jamón .... $3.50
UPDATE platillos_menu SET precio_usd = 3.50 WHERE nombre = 'Pizza de Jamòn';

-- Carta: Pizza de Atún .... $4.00
UPDATE platillos_menu SET precio_usd = 4.00 WHERE nombre = 'Pizza de Atùn';

-- Carta: Pizza con Camarones .... $4.00
UPDATE platillos_menu SET precio_usd = 4.00 WHERE nombre = 'Pizza con Camarones';

-- ----- Carnes -----
-- Carta: Juliana de Cerdo con Pimiento y Cebolla .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Juliana de Cerdo con Pimiento y Cebolla';

-- Carta: Escalopes de Cerdo Gratinado .... $6.50
UPDATE platillos_menu SET precio_usd = 6.50 WHERE nombre = 'Escalope de Cerdo Gratinado';

-- Carta: Solomillo de Cerdo a la Española .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Solomillo de Cerdo a la Española';

-- Carta: Escalopes de Cerdo Empanado .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Escalope de Cerdo Empanado';

-- Carta: Uruguayo de Cerdo .... $7.50
UPDATE platillos_menu SET precio_usd = 7.50 WHERE nombre = 'Uruguayo de Cerdo';

-- Carta: Masas de Cerdo Fritas .... $7.50
UPDATE platillos_menu SET precio_usd = 7.50 WHERE nombre = 'Masas de Cerdo Fritas';

-- Carta: Ropa Vieja de Res .... $7.50
UPDATE platillos_menu SET precio_usd = 7.50 WHERE nombre = 'Ropa Vieja de Res';

-- Carta: Aporreado de Ternera .... $7.50
UPDATE platillos_menu SET precio_usd = 7.50 WHERE nombre = 'Aporreado de Ternera';

---- ⚠️ PROBABLE: revise que sea el mismo plato.
-- Carta: Escalopes de Cerdo Grille con Mojo Criollo (carta) = Escalope de Cerdo Grille (BD) .... $5.80
UPDATE platillos_menu SET precio_usd = 5.80 WHERE nombre = 'Escalope de Cerdo Grille';

-- ----- Pescados y Mariscos -----
-- Carta: Filete de Pescado Grille Maitre D' Hotel .... $5.00
UPDATE platillos_menu SET precio_usd = 5.00 WHERE nombre = 'Filete de Pescado Grille Maitre D'' Hotel';

-- Carta: Filete de Pescado en salsa Limón .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Filete de Pescado en Salsa de Limòn';

-- Carta: Filete de Pescado a la Española .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Filete de Pescado a la Española';

-- Carta: Masas de Pescado Enchilada .... $5.50
UPDATE platillos_menu SET precio_usd = 5.50 WHERE nombre = 'Masas de Pescado Enchilada';

-- Carta: Filete de Pescado a la Napolitana .... $5.90
UPDATE platillos_menu SET precio_usd = 5.90 WHERE nombre = 'Filete de Pescado a la Napolitana';

-- Carta: Filete de Pescado Empanado .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Filete de Pescado Empanado';

-- Carta: Camarones Grille al Ajillo .... $5.50
UPDATE platillos_menu SET precio_usd = 5.50 WHERE nombre = 'Camarones Grille al Ajillo';

-- Carta: Camarones Salteados al Curry .... $6.50
UPDATE platillos_menu SET precio_usd = 6.50 WHERE nombre = 'Camarones Salteados al Curry';

-- Carta: Camarones Flameados al Ron Añejo .... $6.50
UPDATE platillos_menu SET precio_usd = 6.50 WHERE nombre = 'Camarones Flameados al Ron Añejo';

-- Carta: Camarones Rebozados a la Francesa (carta) = Rebosados (BD) .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Camarones Rebosados a la Francesa';

-- Carta: Camarones Gratinados a la Crema .... $8.00
UPDATE platillos_menu SET precio_usd = 8.00 WHERE nombre = 'Camarones Gratinados a la Crema';

-- Carta: Camarones Enchilados Bahía .... $6.50
UPDATE platillos_menu SET precio_usd = 6.50 WHERE nombre = 'Camarones Enchilado Bahìa';

-- Carta: Camarones Salteados con vegetales y piña .... $6.50
UPDATE platillos_menu SET precio_usd = 6.50 WHERE nombre = 'Camarones Salteados con Vegetales y Piña';

-- Carta: Camarones Empanados (carta) = Empanado (BD) .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Camarones Empanado';

-- Carta: Salteado del Mar y la Tierra .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Salteado del Mar y la Tierra';

-- Carta: Risotto de Mariscos con Queso .... $6.00
UPDATE platillos_menu SET precio_usd = 6.00 WHERE nombre = 'Risotto de Mariscos con Queso';

---- ⚠️ VERIFICAR: revise que sea el mismo plato.
-- Carta: Filete de Pescado Relleno (carta) = Filete de Pescado Canciller?? (BD) .... $7.00
UPDATE platillos_menu SET precio_usd = 7.00 WHERE nombre = 'Filete de Pescado Canciller';

-- ==========================================================================
-- PLATOS DE LA CARTA QUE NO ESTÁN EN LA TABLA (descomente para crearlos).
-- Ajuste el precio CUP antes de aplicar. Categorías: 8=Pescados y Mariscos,
-- 9=Carnes, 13=Especialidades Italianas.
-- ==========================================================================
-- Langosta a Thermidor .... $9.00  (Thermidor Lobster)
-- INSERT INTO platillos_menu (nombre, descripcion, precio, categoria, precio_usd)
-- VALUES ('Langosta a Thermidor', 'Thermidor Lobster', 0.00, 8, 9.00);
-- Pollo a la Parmesana .... $5.00  (Fried Breaded chicken, marinara, gratin cheese)
-- INSERT INTO platillos_menu (nombre, descripcion, precio, categoria, precio_usd)
-- VALUES ('Pollo a la Parmesana', 'Fried Breaded chicken covered with marinara sauce and gratin cheese', 0.00, 13, 5.00);
-- Escalopes de Cerdo en Cazuela .... $6.50  (Pork steak in tomatoes sauce)
-- INSERT INTO platillos_menu (nombre, descripcion, precio, categoria, precio_usd)
-- VALUES ('Escalopes de Cerdo en Cazuela', 'Pork steak in tomatoes sauce', 0.00, 9, 6.50);

-- ==========================================================================
-- VERIFICACIÓN: debe mostrar 56 filas con su precio; NULL = no se encontró
-- ese nombre en su tabla (revise y ajuste a mano).
-- ==========================================================================
SELECT id, nombre, precio_usd FROM platillos_menu WHERE id IN (100, 101, 102, 103, 66, 67, 68, 69, 71, 72, 73, 74, 85, 86, 87, 88, 89, 90, 145, 147, 143, 75, 76, 77, 78, 79, 80, 81, 82, 83, 58, 59, 60, 61, 62, 63, 64, 65, 57, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 17, 19) ORDER BY categoria, nombre;
SELECT COUNT(*) AS pendientes_null FROM platillos_menu WHERE id IN (100, 101, 102, 103, 66, 67, 68, 69, 71, 72, 73, 74, 85, 86, 87, 88, 89, 90, 145, 147, 143, 75, 76, 77, 78, 79, 80, 81, 82, 83, 58, 59, 60, 61, 62, 63, 64, 65, 57, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 17, 19) AND precio_usd IS NULL;

SET SQL_SAFE_UPDATES = 1;
