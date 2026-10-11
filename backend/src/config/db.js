// ==========================================
// DATABASE CONFIGURATION (MONGODB ATLAS)
// ==========================================
const mongoose = require("mongoose");

/**
 * Connect to MongoDB Atlas using Mongoose and async/await
 * Uses MONGO_URI loaded from environment variables (.env)
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        throw error;
    }
};

module.exports = connectDB;
