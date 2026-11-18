const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Obtener todas las categorías
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener categorías' });
    }
});

// Crear una nueva categoría (Se usará en el panel de administración)
router.post('/', auth, async (req, res) => {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING id',
            [nombre, descripcion]
        );
        res.status(201).json({ 
            message: 'Categoría creada con éxito', 
            id: rows[0].id 
        });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear categoría' });
    }
});

module.exports = router;
