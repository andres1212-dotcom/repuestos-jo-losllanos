const { Pool } = require('pg');
require('dotenv').config();

// Crear un pool de conexiones para PostgreSQL
const connectionConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'repuestos_llanos',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false
      };

const pool = new Pool(connectionConfig);

// Probar la conexión al iniciar el servidor
pool.connect()
    .then(client => {
        console.log('✅ Conectado exitosamente a la base de datos PostgreSQL.');
        client.release();
    })
    .catch(err => {
        console.error('❌ Error al conectar a la base de datos PostgreSQL:', err.message);
        console.error('Asegúrate de tener corriendo tu servidor local (PostgreSQL) y que las credenciales en .env sean correctas.');
    });

module.exports = pool;
