// Authentication and RBAC middleware unit tests.
// Run with: npm test (uses Node's built-in test runner, no extra dependencies).
const { test, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");

const User = require("../src/models/User");
const app = require("../src/server");
const { authenticateUser, requireAdmin } = require("../src/middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_12345";
process.env.JWT_SECRET = JWT_SECRET;

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

// Helper for generating tokens
const createToken = (payload, options = {}) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h", ...options });
};

// ==========================================================
// 1. Direct unit tests for authenticateUser & requireAdmin
// ==========================================================

test("authenticateUser: returns 401 when Authorization header is missing", () => {
    const req = { headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return {
                json: (j) => {
                    jsonSent = j;
                }
            };
        }
    };
    let nextCalled = false;

    authenticateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 401);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(nextCalled, false);
});

test("authenticateUser: returns 401 when header format does not start with Bearer", () => {
    const req = { headers: { authorization: "Basic token123" } };
    let statusSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return { json: () => {} };
        }
    };
    let nextCalled = false;

    authenticateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 401);
    assert.strictEqual(nextCalled, false);
});

test("authenticateUser: returns 401 when token is invalid or corrupted", () => {
    const req = { headers: { authorization: "Bearer invalid.fake.token" } };
    let statusSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return { json: () => {} };
        }
    };
    let nextCalled = false;

    authenticateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 401);
    assert.strictEqual(nextCalled, false);
});

test("authenticateUser: returns 401 when token is expired", () => {
    const expiredToken = jwt.sign(
        { id: "123", email: "user@test.com", role: "user" },
        JWT_SECRET,
        { expiresIn: "-1s" }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    let statusSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return { json: () => {} };
        }
    };
    let nextCalled = false;

    authenticateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 401);
    assert.strictEqual(nextCalled, false);
});

test("authenticateUser: attaches user payload to req.user on valid token and calls next", () => {
    const token = createToken({ id: "user_456", email: "student@test.com", role: "user" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    const res = {};

    authenticateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.ok(req.user);
    assert.strictEqual(req.user.id, "user_456");
    assert.strictEqual(req.user.email, "student@test.com");
    assert.strictEqual(req.user.role, "user");
});

test("requireAdmin: returns 403 when req.user is missing", () => {
    const req = {};
    let statusSent = null;
    let jsonSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return {
                json: (j) => { jsonSent = j; }
            };
        }
    };
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 403);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(jsonSent.message, "Forbidden: Admin access required");
    assert.strictEqual(nextCalled, false);
});

test("requireAdmin: returns 403 when req.user role is 'user'", () => {
    const req = { user: { id: "user_1", role: "user" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
        status: (s) => {
            statusSent = s;
            return {
                json: (j) => { jsonSent = j; }
            };
        }
    };
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(statusSent, 403);
    assert.strictEqual(jsonSent.success, false);
    assert.strictEqual(nextCalled, false);
});

test("requireAdmin: allows access and calls next when req.user role is 'admin'", () => {
    const req = { user: { id: "admin_1", role: "admin" } };
    let nextCalled = false;
    const res = {};

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
});

// ==========================================================
// 2. Integration HTTP tests for GET /api/auth/me
// ==========================================================

test("GET /api/auth/me returns 401 when no token is supplied", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
});

test("GET /api/auth/me returns 401 with invalid Bearer token", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: "Bearer bad_token" }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
});

test("GET /api/auth/me returns 200 with user data on valid token", async () => {
    const mockUser = {
        _id: "64b7f0c2a1b2c3d4e5f60799",
        name: "Test Student",
        email: "student@test.com",
        role: "user"
    };

    mock.method(User, "findById", () => ({
        select: async () => mockUser
    }));

    const token = createToken({
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role
    });

    const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.name, "Test Student");
    assert.strictEqual(data.user.email, "student@test.com");
    assert.strictEqual(data.user.role, "user");
});
