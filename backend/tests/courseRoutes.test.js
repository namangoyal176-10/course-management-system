// Course read API tests.
// Run with: npm test (uses Node's built-in test runner, no extra dependencies).
// The Course model is stubbed, so no MongoDB connection is needed.
const { test, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const Course = require("../src/models/Course");
const app = require("../src/server");

const sampleCourse = {
    _id: "64b7f0c2a1b2c3d4e5f60718",
    title: "Intro to Node.js",
    description: "Sample course",
    instructor: "Test Instructor",
    duration: "4 weeks",
    price: 499,
};

let server;
let baseUrl;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
    mock.restoreAll();
});

const get = async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    return { status: res.status, body: await res.json() };
};

test("GET /api/health returns 200", async () => {
    const { status, body } = await get("/api/health");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
});

test("GET /api/courses returns 200 with a list", async () => {
    mock.method(Course, "find", async () => [sampleCourse]);
    const { status, body } = await get("/api/courses");
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.courses, [sampleCourse]);
});

test("GET /api/courses returns 200 with an empty list", async () => {
    mock.method(Course, "find", async () => []);
    const { status, body } = await get("/api/courses");
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(body.courses, []);
});

test("GET /api/courses returns 500 on database error", async () => {
    mock.method(Course, "find", async () => {
        throw new Error("db down");
    });
    const { status, body } = await get("/api/courses");
    assert.strictEqual(status, 500);
    assert.strictEqual(body.success, false);
});

test("GET /api/courses/:id returns 200 for an existing course", async () => {
    mock.method(Course, "findById", async () => sampleCourse);
    const { status, body } = await get(`/api/courses/${sampleCourse._id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.deepStrictEqual(body.course, sampleCourse);
});

test("GET /api/courses/invalid-id returns 400", async () => {
    mock.method(Course, "findById", async () => {
        throw new mongoose.Error.CastError("ObjectId", "invalid-id", "_id");
    });
    const { status, body } = await get("/api/courses/invalid-id");
    assert.strictEqual(status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid course ID");
});

test("GET /api/courses/:id returns 404 when the course is missing", async () => {
    mock.method(Course, "findById", async () => null);
    const { status, body } = await get(`/api/courses/${sampleCourse._id}`);
    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Course not found");
});

test("GET /api/courses/:id returns 500 on unexpected error", async () => {
    mock.method(Course, "findById", async () => {
        throw new Error("db down");
    });
    const { status, body } = await get(`/api/courses/${sampleCourse._id}`);
    assert.strictEqual(status, 500);
    assert.strictEqual(body.success, false);
});

test("auth routes are still mounted", async () => {
    for (const path of ["/api/auth/register", "/api/auth/login"]) {
        const res = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
        });
        assert.notStrictEqual(res.status, 404, `${path} should exist`);
    }
});
