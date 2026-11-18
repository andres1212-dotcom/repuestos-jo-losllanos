const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const db = require('../config/database');
const auth = require('../middleware/auth');

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        // Generar nombre de archivo único conservando la extensión
        const ext = path.extname(file.originalname).toLowerCase();
        const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${Date.now()}_${cleanName}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|gif/;
        const mimeValid = allowedTypes.test(file.mimetype);
        const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimeValid && extValid) {
            return cb(null, true);
        }
        cb(new Error('Formato de imagen no permitido (solo JPG, PNG, WEBP, GIF)'));
    }
});

// Endpoint para subir imagen
router.post('/upload', auth, upload.single('imagen'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    // Devolvemos el nombre de archivo guardado
    res.json({
        message: 'Imagen subida exitosamente',
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`
    });
});

// Obtener todos los productos (con filtros opcionales de categoría y búsqueda)
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

        // Filtro por nombre de categoría
        if (categoria) {
            queryParams.push(categoria);
            query += ` AND c.nombre = $${queryParams.length}`;
        }

        // Buscador por nombre, OEM, marca o modelo de vehículo
        if (q) {
            const searchWildcard = `%${q}%`;
            query += ` AND (p.nombre ILIKE $${queryParams.length + 1} 
                        OR p.codigo_oem ILIKE $${queryParams.length + 2} 
                        OR p.modelo_vehiculo ILIKE $${queryParams.length + 3} 
                        OR p.marca ILIKE $${queryParams.length + 4})`;
            queryParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
        }

        query += ' ORDER BY p.id DESC';

        const { rows } = await db.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos' });
    }
});

// Obtener un producto específico por ID
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

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear un producto (Panel Admin)
router.post('/', auth, async (req, res) => {
    const { nombre, codigo_oem, descripcion, imagen, categoria_id, marca, modelo_vehiculo, precio, stock } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre del repuesto es obligatorio' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO productos (nombre, codigo_oem, descripcion, precio, stock, imagen, categoria_id, marca, modelo_vehiculo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [nombre, codigo_oem || '', descripcion || '', precio || 0, stock || 0, imagen || '', categoria_id || null, marca || '', modelo_vehiculo || '']
        );

        res.status(201).json({
            message: 'Producto creado con éxito',
            id: rows[0].id
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear producto' });
    }
});

// Editar un producto (Panel Admin)
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

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar producto' });
    }
});

// Eliminar un producto (Panel Admin)
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM productos WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado con éxito' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
