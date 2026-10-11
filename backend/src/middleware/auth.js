// ==========================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ==========================================
const jwt = require("jsonwebtoken");

/**
 * Middleware: authenticateUser
 * Validates the JWT token from the Authorization header (Bearer <token>).
 * Attaches decoded payload (id, email, role) to req.user.
 * Returns 401 if missing, invalid, or expired.
 */
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Verify Bearer format in Authorization header
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No or invalid token"
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No or invalid token"
            });
        }

        // Verify token with secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: No or invalid token"
        });
    }
};

/**
 * Middleware: requireAdmin
 * Validates that req.user exists and has role 'admin'.
 * Returns 403 Forbidden if the authenticated user is not an admin.
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Admin access required"
        });
    }
    next();
};

module.exports = {
    authenticateUser,
    requireAdmin
};
