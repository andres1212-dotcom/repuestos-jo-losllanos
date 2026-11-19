const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Validar variables de entorno críticas
if (!process.env.DATABASE_URL) {
  const requiredEnv = ['PORT', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missing = requiredEnv.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('❌ Variables de entorno faltantes:', missing.join(', '));
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET) {
  console.error('❌ Variable JWT_SECRET faltante.');
  process.exit(1);
}

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Importar conexión a la base de datos
const db = require('./config/database');

// Importar rutas de la API
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const authRoutes = require('./routes/auth');
const bcrypt = require('bcryptjs');

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Registrar rutas de la API
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/auth', authRoutes);

// Ruta directa para inicializar la base de datos desde el navegador
app.get('/api/setup-db', async (req, res) => {
    try {
        await crearTablasEInicializar();
        res.json({ success: true, message: '✅ Base de datos inicializada correctamente con tablas y usuario administrador.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Función para inicializar las tablas de la base de datos automáticamente
async function inicializarBaseDeDatos() {
    try {
        await crearTablasEInicializar();
    } catch (error) {
        console.error('⚠️ Error al inicializar esquema de base de datos:', error.message);
    }
}

async function crearTablasEInicializar() {
    console.log('📦 Creando tablas en PostgreSQL si no existen...');

    // 1. Crear tablas
    await db.query(`
        CREATE TABLE IF NOT EXISTS categorias (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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

        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            rol VARCHAR(20) DEFAULT 'admin',
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            nombre_cliente VARCHAR(100) NOT NULL,
            telefono_cliente VARCHAR(20) NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'entregado', 'cancelado')),
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
    `);

    // 2. Categorías base
    await db.query(`
        INSERT INTO categorias (nombre) 
        SELECT cat FROM (VALUES ('Motor'), ('Frenos'), ('Suspensión'), ('Correas'), ('Estoperas'), ('Bombas')) AS t(cat)
        WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = t.cat);
    `);

    // 3. Crear o actualizar usuario Administrador
    // 👉 AQUÍ DEFINES EL USUARIO Y LA CONTRASEÑA (o mediante variables en Render):
    const USUARIO_ADMIN = process.env.ADMIN_USER || 'admin';
    const CLAVE_ADMIN = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(CLAVE_ADMIN, 10);

    const adminCheck = await db.query('SELECT id FROM usuarios WHERE email = $1 OR nombre = $2', ['admin@jolosllanos.com', USUARIO_ADMIN]);
    if (adminCheck.rows.length === 0) {
        await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
            [USUARIO_ADMIN, 'admin@jolosllanos.com', hashedPassword, 'admin']
        );
        console.log(`✅ Usuario administrador creado: ${USUARIO_ADMIN}`);
    } else {
        await db.query(
            'UPDATE usuarios SET nombre = $1, password = $2 WHERE id = $3',
            [USUARIO_ADMIN, hashedPassword, adminCheck.rows[0].id]
        );
        console.log(`✅ Usuario (${USUARIO_ADMIN}) y contraseña actualizados.`);
    }

    // 4. Cargar un solo producto de muestra si la tabla de productos está vacía
    const prodCount = await db.query('SELECT COUNT(*) FROM productos');
    if (parseInt(prodCount.rows[0].count) === 0) {
        await db.query(`
            INSERT INTO productos (nombre, codigo_oem, descripcion, precio, stock, categoria_id, marca, modelo_vehiculo)
            VALUES ('Pastillas de Freno Delanteras', 'OEM-12345', 'Producto de muestra inicial', 25.00, 10, (SELECT id FROM categorias WHERE nombre = 'Frenos' LIMIT 1), 'Bendix', 'Universal')
            ON CONFLICT DO NOTHING;
        `);
    }

    console.log('✅ Esquema y base de datos PostgreSQL listos.');
}

// Ejecutar inicialización después de conectar
setTimeout(inicializarBaseDeDatos, 1500);

// Servir la página web y estilos
app.use(express.static(path.join(__dirname, '..')));

// Servir la carpeta de imágenes de repuestos y uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/imagenes-catalogo', express.static(path.join(__dirname, '../uploads')));

// Ruta de estado de la API
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'API de Repuestos J.O Los Llanos funcionando correctamente.' 
    });
});

// Arrancar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`💻 Puedes abrir tu página web en esa misma dirección.`);
});
