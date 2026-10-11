const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        instructor: {
            type: String,
            required: true,
            trim: true,
        },
        duration: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;
