// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { authenticateUser } = require("../middleware/auth");

// POST /api/auth/register - Register a new user
router.post("/register", register);

// POST /api/auth/login - Login user and obtain JWT token
router.post("/login", login);

// GET /api/auth/me - Verify authentication and get current user info
router.get("/me", authenticateUser, getMe);

module.exports = router;
