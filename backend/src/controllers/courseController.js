const mongoose = require("mongoose");
const Course = require("../models/Course");

// GET /api/courses — returns all courses
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        res.status(200).json({ success: true, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/courses/:id — returns a single course by ID
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.status(200).json({ success: true, course });
    } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ success: false, message: "Invalid course ID" });
        }
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getAllCourses, getCourseById };
