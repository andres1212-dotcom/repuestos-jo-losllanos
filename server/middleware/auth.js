const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Obtener la cabecera de autorización
    const authHeader = req.headers['authorization'];
    
    // El formato de la cabecera debe ser: Bearer <TOKEN>
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token válido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_para_tokens_jo_llanos_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};
