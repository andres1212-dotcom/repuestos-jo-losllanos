const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const db = require('../config/database');
const auth = require('../middleware/auth');

// ─── Configuración de Cloudinary (lee las variables de entorno de Render) ───
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true
});

// ─── Multer en memoria (no guarda en disco, manda directo a Cloudinary) ───
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        if (allowed.test(file.mimetype)) return cb(null, true);
        cb(new Error('Formato no permitido (solo JPG, PNG, WEBP, GIF)'));
    }
});

// ─── Helper: sube un buffer a Cloudinary y devuelve la URL permanente ───
function subirACloudinary(buffer, nombreBase) {
    return new Promise((resolve, reject) => {
        const cleanName = (nombreBase || 'repuesto').replace(/[^a-zA-Z0-9_-]/g, '_');
        const stream = cloudinary.uploader.upload_stream(
            {
                folder:         'repuestos-jo-losllanos',
                public_id:      `rep_${Date.now()}_${cleanName}`.substring(0, 80),
                transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }]
            },
            (error, result) => {
                if (error) {
                    console.error('Error Cloudinary upload_stream:', error);
                    return reject(error);
                }
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

// ─── POST /api/productos/upload — Subir imagen a Cloudinary ───
router.post('/upload', auth, upload.single('imagen'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    try {
        const url = await subirACloudinary(req.file.buffer, req.file.originalname.split('.')[0]);
        res.json({ message: 'Imagen subida exitosamente', url, filename: url });
    } catch (err) {
        console.error('Error al subir imagen a Cloudinary:', err);
        res.status(500).json({ error: 'Error al subir la imagen' });
    }
});

// ─── GET /api/productos — Obtener todos los productos (con filtros) ───
router.get('/', async (req, res) => {
    const { categoria, q } = req.query;
    try {
        let query = `
            SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.activo = true
        `;
        const queryParams = [];

        if (categoria) {
            queryParams.push(categoria);
            query += ` AND c.nombre = $${queryParams.length}`;
        }

        if (q) {
            const like = `%${q}%`;
            query += ` AND (p.nombre ILIKE $${queryParams.length + 1}
                        OR p.codigo_oem ILIKE $${queryParams.length + 2}
                        OR p.modelo_vehiculo ILIKE $${queryParams.length + 3}
                        OR p.marca ILIKE $${queryParams.length + 4})`;
            queryParams.push(like, like, like, like);
        }

        query += ' ORDER BY p.id DESC';
        const { rows } = await db.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos' });
    }
});

// ─── GET /api/productos/:id — Obtener un producto por ID ───
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT p.*, c.nombre as categoria_nombre 
             FROM productos p 
             LEFT JOIN categorias c ON p.categoria_id = c.id 
             WHERE p.id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ─── POST /api/productos — Crear producto (Admin) ───
router.post('/', auth, async (req, res) => {
    const { nombre, codigo_oem, descripcion, imagen, categoria_id, marca, modelo_vehiculo, precio, stock } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del repuesto es obligatorio' });

    try {
        const { rows } = await db.query(
            `INSERT INTO productos (nombre, codigo_oem, descripcion, precio, stock, imagen, categoria_id, marca, modelo_vehiculo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [nombre, codigo_oem || '', descripcion || '', precio || 0, stock || 0, imagen || '', categoria_id || null, marca || '', modelo_vehiculo || '']
        );
        res.status(201).json({ message: 'Producto creado con éxito', id: rows[0].id });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear producto' });
    }
});

// ─── PUT /api/productos/:id — Editar producto (Admin) ───
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { nombre, codigo_oem, descripcion, imagen, categoria_id, marca, modelo_vehiculo, precio, stock, activo } = req.body;

    try {
        const result = await db.query(
            `UPDATE productos SET 
                nombre = $1, codigo_oem = $2, descripcion = $3, precio = $4, 
                stock = $5, imagen = $6, categoria_id = $7, marca = $8, 
                modelo_vehiculo = $9, activo = $10
             WHERE id = $11`,
            [
                nombre, codigo_oem || '', descripcion || '', precio !== undefined ? precio : 0,
                stock !== undefined ? stock : 0, imagen || '',
                categoria_id || null, marca || '', modelo_vehiculo || '',
                activo !== undefined ? activo : true, id
            ]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar producto' });
    }
});

// ─── DELETE /api/productos/:id — Eliminar producto (Admin) ───
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM productos WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
