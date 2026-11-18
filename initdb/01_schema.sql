-- =============================================================
-- Esquema de base de datos para PostgreSQL
-- Se ejecuta automáticamente al crear el contenedor por primera vez
-- =============================================================

-- Tabla 1: CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo_oem VARCHAR(50),
    descripcion TEXT,
    precio DECIMAL(10, 2) DEFAULT 0,
    stock INT DEFAULT 0,
    imagen TEXT,
    categoria_id INT,
    marca VARCHAR(50),
    modelo_vehiculo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Tabla 3: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'admin',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 4: PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    telefono_cliente VARCHAR(20) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'entregado', 'cancelado')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 5: DETALLE_PEDIDO
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- =============================================================
-- DATOS INICIALES (solo si la tabla está vacía)
-- =============================================================

-- Categorías
INSERT INTO categorias (nombre) VALUES
('Motor'),
('Frenos'),
('Suspensión'),
('Correas'),
('Estoperas'),
('Bombas')
ON CONFLICT DO NOTHING;

-- Usuario administrador (contraseña se encripta automáticamente al iniciar el servidor)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Admin J.O Los Llanos', 'admin@jolosllanos.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Productos de muestra
INSERT INTO productos (nombre, codigo_oem, descripcion, precio, stock, imagen, categoria_id, marca, modelo_vehiculo) VALUES
('Pastillas de Freno Delanteras', '45022-TR0-A01', 'Pastillas de freno delanteras de alta calidad con coeficiente de fricción superior. Fabricadas con compuesto semimetálico de larga duración, excelente disipación de calor y mínimo nivel de ruido. Proporcionan un frenado seguro y confiable.', 35.00, 15, 'FRENOS.jpg', (SELECT id FROM categorias WHERE nombre = 'Frenos'), 'Bendix Premium', 'Honda Civic (2012-2015), Acura ILX (2013-2015)'),

('Base de Motor Derecha', '15400-PLM-A02', 'Soporte de motor hidráulico derecho diseñado bajo estrictos estándares OEM. Fabricado con goma natural de alta densidad y metal reforzado para absorber eficazmente las vibraciones del motor y garantizar una cabina silenciosa y confortable.', 12.50, 10, 'BASEDEMOTOR.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Sabo original', 'Chevrolet Aveo 1.6, Daewoo Optra 1.8'),

('Estopera de Aceite KTO', '90311-38034', 'Estopera o sello de aceite fabricado por KTO en vitón de alta resistencia. Diseñado especialmente para resistir altas temperaturas y velocidades de rotación, asegurando un sellado hermético contra fugas de aceite en el motor o transmisión.', 35.00, 20, 'ESTOPERAOIL_KTO.jpg', (SELECT id FROM categorias WHERE nombre = 'Estoperas'), 'KTO Japan', 'Toyota Corolla (2000-2014), Toyota Yaris (2006-2018)'),

('Correa de Tiempo Sincrónica', '97RU25-GATES', 'Correa de distribución de caucho sintético de alta resistencia y cables tensores de fibra de vidrio. Garantiza una sincronización perfecta de las válvulas, protegiendo el motor contra saltos de dientes y desgaste prematuro.', 12.50, 8, 'CORREA_TIEMPO.jpg', (SELECT id FROM categorias WHERE nombre = 'Correas'), 'Gates original', 'Chevrolet Aveo 1.6 (16 Válvulas), Pontiac G3'),

('Empacadura Derecha de Cámara', '45022-TR0-A01', 'Empacadura multicapa de acero (MLS) para cámara de compresión derecha. Fabricada para resistir las presiones extremas de motores de alto desplazamiento, garantizando un sellado perfecto contra refrigerante y compresión.', 35.00, 12, 'CAMARAEMPMOTOR.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Fel-Pro', 'Ford F-250 / F-350 Super Duty (Motor Triton V8 5.4L)'),

('Tensor de Correa de Tiempo', '15400-PLM-A02', 'Polea tensora automática fabricada con rodamientos de acero cromado de alta velocidad y grasa de litio para altas temperaturas. Mantiene la tensión exacta en la correa de distribución para prevenir ruidos y fallas mecánicas.', 12.50, 15, 'TENSOR_CORREA_TIEMPO.jpg', (SELECT id FROM categorias WHERE nombre = 'Correas'), 'Ina Germany', 'Chevrolet Aveo 1.6, Cruze 1.8, Optra'),

('Bomba de Gasolina Completa', '45022-TR0-A01', 'Módulo completo de bomba de combustible eléctrica de alta presión. Incluye prefiltro, flotador de nivel de gasolina y regulador de presión integrados. Asegura un flujo constante y óptimo de combustible al riel de inyección.', 35.00, 6, 'BOMBA_GASOLINA.jpg', (SELECT id FROM categorias WHERE nombre = 'Bombas'), 'Bosch', 'Chevrolet Spark (Todos), Aveo (1.5/1.6), Daewoo Lanos'),

('Kit de Correa de Tiempo Completo', '15400-PLM-A02', 'Kit completo de mantenimiento para sistema de distribución sincrónico. Incluye correa dentada Gates de alta resistencia, polea tensora automática y polea loca de apoyo. Solución integral para el reemplazo seguro a los 50,000 Km.', 12.50, 5, 'KIT_CORREA_TIEMPO.jpg', (SELECT id FROM categorias WHERE nombre = 'Correas'), 'Gates original', 'Chevrolet Aveo 1.6, Daewoo Lanos, Kalos'),

('Batería Libre Mantenimiento', 'KTO-NS60-650', 'Batería automotriz KTO sellada de libre mantenimiento. Fabricada con tecnología de calcio-plata que prolonga su vida útil bajo climas cálidos y proporciona 650 amperios de arranque en frío para encendidos instantáneos.', 75.00, 14, 'BATERIA_KTO.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'KTO Power', 'Toyota Yaris, Chevrolet Spark, Hyundai Getz, Fiat Uno'),

('Envase de Agua Radiador (Depósito)', '96553242-DEP', 'Depósito o tanque auxiliar de expansión de refrigerante. Fabricado en plástico virgen transparente de alta resistencia a la temperatura y presión hidráulica, previniendo grietas y fugas.', 18.00, 8, 'DEPOSITO_AGUA.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Flennor USA', 'Chevrolet Optra Design, Advance, Limited (2004-2013)'),

('Envase de Agua Palio / Siena', '46815904-DEP', 'Tanque auxiliar de radiador para vehículos Fiat de la familia Palio y Siena. Moldeado en resina de polipropileno de alta resistencia que soporta presiones extremas de trabajo.', 15.00, 10, 'DEPOSITO_AGUA_PALIO.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Fiat Original', 'Fiat Palio, Siena, Strada, Idea (Motores Fire 1.3 / 1.4 / 1.8)'),

('Mozo de Rueda Delantero Hilux', '43502-0K030', 'Mozo portarotula de rueda delantera completo con rodamiento cónico sellado. Diseñado para vehículos 4x4 de alta exigencia, fabricado en acero de alto carbono forjado para soportar impactos y cargas severas.', 55.00, 12, 'MOZO_HILUX_DEL.jpg', (SELECT id FROM categorias WHERE nombre = 'Suspensión'), 'Koyo Japan', 'Toyota Hilux Kavak (2006-2015), Toyota Fortuner (2007-2015)'),

('Amortiguador Delantero de Gas', '339031-COR', 'Amortiguador presurizado con gas nitrógeno de doble tubo. Diseñado para restaurar la estabilidad, el control y la altura original del vehículo, absorbiendo con suavidad las imperfecciones de la vía.', 42.00, 8, 'SUSPENCION.jpg', (SELECT id FROM categorias WHERE nombre = 'Suspensión'), 'KYB Excel-G', 'Toyota Corolla (2003-2008) (Lado Izquierdo / Derecho)'),

('Sensor de Cigüeñal RPM Fiat', '46754538-SENS', 'Sensor magnético de posición de cigüeñal (generador de impulsos) de alta fidelidad. Envía lecturas precisas al computador del motor (ECU) para la inyección de combustible y chispa de bujías.', 20.00, 10, 'SENSOR_PALIO.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Magneti Marelli', 'Fiat Palio, Siena, Strada, Uno, Fiorino (Motores Fire 1.3/1.4)'),

('Módulo Bomba de Gasolina Aveo', '96447642-MOD', 'Módulo completo de bomba de gasolina con estructura plástica y sistema de flotación. Su diseño evita el recalentamiento de la pila de gasolina y optimiza el retorno del combustible al tanque.', 45.00, 6, 'MODULO_GASOLINA.jpg', (SELECT id FROM categorias WHERE nombre = 'Bombas'), 'ACDelco original', 'Chevrolet Aveo 1.6L, Optra Limited / Design'),

('Regulador de Emisión de Vapores', '96330547-REG', 'Válvula de control de purga de emisión de vapor de gasolina (Canister). Fabricada con materiales termoplásticos duraderos y bobinas electromagnéticas de alta respuesta para mantener las emisiones bajo control.', 22.00, 15, 'REGULADOR_EMISION.jpg', (SELECT id FROM categorias WHERE nombre = 'Motor'), 'Delphi Tech', 'Chevrolet Aveo, Optra, Spark, Daewoo Lanos')

ON CONFLICT DO NOTHING;
