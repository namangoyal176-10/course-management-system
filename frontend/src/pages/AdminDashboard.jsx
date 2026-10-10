import { useState, useEffect } from 'react';
import axios from 'axios';
import CourseForm from '../components/CourseForm';

// Initial default courses for local preview & offline testing
const DEFAULT_COURSES = [
  {
    id: 1,
    title: 'Introduction to Web Development',
    description: 'Learn HTML, CSS, and modern JavaScript to build interactive web applications from scratch.',
    instructor: 'Prof. Alex Smith',
    duration: '4 Weeks',
    price: 499,
  },
  {
    id: 2,
    title: 'Full Stack MERN Architecture',
    description: 'Master MongoDB, Express.js, React, and Node.js with real-world full stack project implementations.',
    instructor: 'Dr. Sarah Johnson',
    duration: '8 Weeks',
    price: 999,
  },
  {
    id: 3,
    title: 'Data Structures and Algorithms in Python',
    description: 'Fundamental algorithmic problems, Big-O analysis, sorting, trees, and dynamic programming.',
    instructor: 'David Lee',
    duration: '6 Weeks',
    price: 750,
  },
];

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * AdminDashboard Component
 * Central admin interface for managing course catalog, viewing stats, and performing CRUD operations.
 */
function AdminDashboard() {
  // Course data state
  const [courses, setCourses] = useState(DEFAULT_COURSES);

  // Modal & form management states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState('');

  // User feedback message state (success / error notifications)
  const [feedback, setFeedback] = useState(null);

  // Backend API status tracking
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected', 'limited', 'offline'

  // Attempt to sync with backend on mount
  useEffect(() => {
    let isMounted = true;

    const checkBackendAndFetchCourses = async () => {
      try {
        // First check backend health
        const healthRes = await axios.get(`${API_BASE_URL}/health`).catch(() => null);

        if (healthRes && healthRes.data && healthRes.data.success) {
          // Backend server is running. Now check if course CRUD endpoints exist:
          try {
            const courseRes = await axios.get(`${API_BASE_URL}/courses`);
            if (isMounted && courseRes.data && Array.isArray(courseRes.data)) {
              setCourses(courseRes.data);
              setBackendStatus('connected');
              return;
            }
          } catch {
            // /api/courses not yet implemented in server.js
            if (isMounted) {
              setBackendStatus('limited');
            }
            return;
          }
        }

        if (isMounted) {
          setBackendStatus('offline');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('offline');
        }
      }
    };

    checkBackendAndFetchCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  // Summary statistics calculated accurately from current courses state
  const totalCourses = courses.length;
  const uniqueInstructors = new Set(
    courses.map((c) => (c.instructor ? c.instructor.trim() : '')).filter(Boolean)
  ).size;
  const averagePrice =
    totalCourses > 0
      ? (courses.reduce((sum, c) => sum + Number(c.price || 0), 0) / totalCourses).toFixed(2)
      : '0.00';

  // Open modal in Add mode
  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormServerError('');
    setIsModalOpen(true);
  };

  // Open modal in Edit mode with selected course data
  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setFormServerError('');
    setIsModalOpen(true);
  };

  // Close modal and reset active form target
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormServerError('');
  };

  // Handle course form submission (both Add and Edit)
  const handleSaveCourse = async (courseData) => {
    setIsSubmitting(true);
    setFormServerError('');

    try {
      if (editingCourse) {
        // ==========================================
        // UPDATE EXISTING COURSE
        // ==========================================
        let updatedCourse = {
          ...editingCourse,
          ...courseData,
        };

        // If backend is connected, call PUT /api/courses/:id
        if (backendStatus === 'connected') {
          try {
            const res = await axios.put(`${API_BASE_URL}/courses/${editingCourse.id}`, courseData);
            if (res.data) {
              updatedCourse = { ...updatedCourse, ...res.data };
            }
          } catch (apiErr) {
            // Keep modal open and report API error without losing form data
            const message =
              apiErr.response?.data?.message || 'Failed to update course on the backend.';
            setFormServerError(message);
            setIsSubmitting(false);
            return;
          }
        }

        // Update local React state
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? updatedCourse : c))
        );

        setFeedback({
          type: 'success',
          message: `Course "${updatedCourse.title}" updated successfully!`,
        });
      } else {
        // ==========================================
        // CREATE NEW COURSE
        // ==========================================
        let newCourse = {
          id: Date.now(),
          ...courseData,
        };

        // If backend is connected, call POST /api/courses
        if (backendStatus === 'connected') {
          try {
            const res = await axios.post(`${API_BASE_URL}/courses`, courseData);
            if (res.data && res.data.id) {
              newCourse = res.data;
            }
          } catch (apiErr) {
            // Keep modal open and report API error without losing form data
            const message =
              apiErr.response?.data?.message || 'Failed to create course on the backend.';
            setFormServerError(message);
            setIsSubmitting(false);
            return;
          }
        }

        // Add to local React state
        setCourses((prev) => [newCourse, ...prev]);

        setFeedback({
          type: 'success',
          message: `Course "${newCourse.title}" added successfully!`,
        });
      }

      // Successful save: close modal and reset editing course
      setIsModalOpen(false);
      setEditingCourse(null);
    } catch {
      setFormServerError('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete course action
  const handleDeleteCourse = async (courseId, courseTitle) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${courseTitle}"?`);
    if (!confirmed) return;

    try {
      if (backendStatus === 'connected') {
        try {
          await axios.delete(`${API_BASE_URL}/courses/${courseId}`);
        } catch (apiErr) {
          const message =
            apiErr.response?.data?.message || 'Failed to delete course on the server.';
          setFeedback({ type: 'error', message });
          return;
        }
      }

      // Update state by filtering out deleted course
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setFeedback({
        type: 'success',
        message: `Course "${courseTitle}" deleted successfully!`,
      });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to delete course.' });
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header section */}
      <header className="dashboard-header">
        <div className="header-info">
          <h1>Admin Course Management</h1>
          <p className="dashboard-description">
            Manage course catalog, update curriculum details, and track offerings.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
          >
            + Add New Course
          </button>
        </div>
      </header>

      {/* Backend API Integration Notice */}
      <div className="api-status-banner">
        <span className="status-indicator-dot"></span>
        <span>
          Backend Status:{' '}
          <strong>
            {backendStatus === 'connected'
              ? 'Connected (Live API)'
              : backendStatus === 'limited'
              ? 'Server Running (/api/health active; /api/courses pending in backend)'
              : 'Local State Mode (Backend offline)'}
          </strong>
        </span>
      </div>

      {/* Action Feedback Banner (Success / Error) */}
      {feedback && (
        <div className={`feedback-banner feedback-${feedback.type}`} role="alert">
          <span>{feedback.message}</span>
          <button
            type="button"
            className="feedback-dismiss-btn"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <section className="summary-cards-container" aria-label="Course summary statistics">
        <div className="summary-card">
          <span className="card-label">Total Courses</span>
          <span className="card-value">{totalCourses}</span>
        </div>
        <div className="summary-card">
          <span className="card-label">Active Instructors</span>
          <span className="card-value">{uniqueInstructors}</span>
        </div>
        <div className="summary-card">
          <span className="card-label">Average Price</span>
          <span className="card-value">₹{averagePrice}</span>
        </div>
      </section>

      {/* Courses Table / Empty State */}
      <section className="courses-section" aria-label="Course list">
        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No courses found</h3>
            <p>Your course catalog is currently empty. Click below to add your first course.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAddModal}
            >
              Add New Course
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="courses-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Instructor</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="col-title">
                      <div className="course-title-cell">
                        <strong className="course-title-text">{course.title}</strong>
                        {course.description && (
                          <p className="course-description-preview">{course.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="col-instructor">{course.instructor}</td>
                    <td className="col-duration">
                      <span className="duration-badge">{course.duration}</span>
                    </td>
                    <td className="col-price">₹{course.price}</td>
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-edit"
                          onClick={() => handleOpenEditModal(course)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-delete"
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal / Panel for Adding & Editing Courses */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleCloseModal}
              aria-label="Close dialog"
            >
              &times;
            </button>

            {/* CourseForm component manages controlled inputs and validation */}
            <CourseForm
              key={editingCourse ? `edit-${editingCourse.id}` : 'add-new'}
              initialCourse={editingCourse}
              onSubmit={handleSaveCourse}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
              serverError={formServerError}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
