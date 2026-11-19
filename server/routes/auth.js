const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, usuario, password } = req.body;
    const loginUser = usuario || email;

    if (!loginUser || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    try {
        // Buscar el usuario por email o por nombre de usuario (sin distinguir mayúsculas)
        const { rows } = await db.query(
            'SELECT * FROM usuarios WHERE email ILIKE $1 OR nombre ILIKE $1',
            [loginUser.trim()]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = rows[0];

        // Comparar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Firmar el token JWT
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, rol: user.rol },
            process.env.JWT_SECRET || 'secreto_para_tokens_jo_llanos_2026',
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Inicio de sesión exitoso.',
            token,
            user: {
                nombre: user.nombre,
                email: user.email,
                rol: user.rol
            }
        });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor en el login.' });
    }
});

module.exports = router;
