// ==========================================
// AUTHENTICATION CONTROLLER
// ==========================================
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validate required inputs
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: name, email, and password"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 2. Check for duplicate email
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // 3. Hash password using bcryptjs (salt rounds = 10)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create new user document
        // SECURITY: Always enforce 'user' role for public registration.
        // Never accept 'admin' from req.body.
        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "user"
        });

        // 5. Return success response with user details (excluding password)
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }
        console.error("Register error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

/**
 * @desc    Authenticate user and return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate required inputs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 2. Find user by email
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // 3. Verify password using bcryptjs.compare
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // 4. Generate signed JWT token with expiration
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d" // Token expires in 1 day
            }
        );

        // 5. Return success response with token and user details
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

/**
 * @desc    Get current authenticated user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("GetMe error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error retrieving user profile"
        });
    }
};

module.exports = {
    register,
    login,
    getMe
};
