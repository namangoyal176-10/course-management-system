import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import './auth.css';
import './App.css';

/**
 * Temporary Route Placeholder: Course Listing Page
 * Preserves the route contract for Divyansh, who is actively developing the full Course Listing page.
 * Demonstrates connectivity with Anuj's merged Course Read APIs (GET /api/courses).
 */
function CourseListingPlaceholder() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { API_BASE_URL } = useAuth();

  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${API_BASE_URL}/courses`)
      .then((res) => {
        if (isMounted && res.data?.success) {
          setCourses(res.data.courses || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Could not load courses');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL]);

  return (
    <div className="placeholder-container">
      <div className="placeholder-card">
        <h2>📚 Available Courses</h2>
        <p className="placeholder-note">
          Notice: Divyansh is actively developing the Course Listing pages. This placeholder connects to Anuj's merged Course Read API.
        </p>

        {loading ? (
          <div className="auth-loading-state">
            <div className="spinner"></div>
            <p>Loading course catalog...</p>
          </div>
        ) : error ? (
          <p className="text-muted">{error}</p>
        ) : courses.length === 0 ? (
          <p className="text-muted">No courses currently in catalog. Stay tuned!</p>
        ) : (
          <div className="course-preview-list">
            {courses.map((c) => (
              <div key={c._id} className="course-preview-item">
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <small>Instructor: {c.instructor} | Duration: {c.duration} | Price: ₹{c.price}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Application Component
 * Single BrowserRouter wrapping the AuthProvider, Navbar, and application Routes.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Default redirect to /courses */}
            <Route path="/" element={<Navigate to="/courses" replace />} />

            {/* Public authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Course catalog route (Divyansh's placeholder) */}
            <Route path="/courses" element={<CourseListingPlaceholder />} />

            {/* Protected Student Route using ProtectedRoute */}
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute>
                  <div className="placeholder-container">
                    <div className="placeholder-card">
                      <h2>🎓 My Enrolled Courses</h2>
                      <p>Authenticated student portal. Welcome to your learning space!</p>
                      <div className="action-buttons">
                        <Link to="/courses" className="btn btn-outline">
                          Browse Courses
                        </Link>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Route with AdminDashboard */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/courses" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
