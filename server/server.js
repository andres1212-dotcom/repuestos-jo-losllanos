const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Validar variables de entorno críticas (admite DATABASE_URL o variables individuales)
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

// Importar conexión a la base de datos (se ejecuta y prueba la conexión al requerirse)
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

// Función para encriptar la contraseña del admin inicial si aún está en texto plano
async function encriptarAdminInicial() {
    try {
        const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', ['admin@jolosllanos.com']);
        if (rows.length > 0) {
            const admin = rows[0];
            // Si la contraseña no parece un hash de bcrypt (los hashes de bcrypt empiezan con $2)
            if (!admin.password.startsWith('$2')) {
                console.log('🔒 Contraseña de administrador en texto plano detectada. Encriptando...');
                const hashedPassword = await bcrypt.hash(admin.password, 10);
                await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, admin.id]);
                console.log('✅ Contraseña de administrador encriptada exitosamente.');
            }
        }
    } catch (error) {
        console.error('⚠️ Error al verificar/encriptar la contraseña de administrador:', error);
    }
}

// Ejecutar verificación después de conectar
setTimeout(encriptarAdminInicial, 1000);

// Servir la página web y estilos (los archivos en la raíz del proyecto)
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
