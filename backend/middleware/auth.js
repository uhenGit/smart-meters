const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const token = req.cookies?.accessToken;

    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload; // { id, username, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }

    next();
}

module.exports = { authMiddleware, adminOnly };
