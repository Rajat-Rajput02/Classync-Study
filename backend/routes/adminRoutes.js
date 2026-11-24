
const express = require("express");
const router = express.Router();

const {
  createAssignment,
  getAssignments,
  updateAssignment,
  getGroupSubmissions,
  getStudentSubmissions,
  getAnalytics,
  getAllGroups,
} = require("../controllers/adminController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// All admin routes require admin authentication
router.use(authenticateToken, authorizeRoles("admin"));

// Assignment management
router.post("/assignments", createAssignment);

router.get("/assignments", getAssignments);

router.put("/assignments/:assignmentId", updateAssignment);

// Submission tracking
router.get(
  "/assignments/:assignmentId/groups",
  getGroupSubmissions
);

router.get(
  "/assignments/:assignmentId/students",
  getStudentSubmissions
);

// Analytics
router.get("/analytics", getAnalytics);

router.get("/groups", getAllGroups);

module.exports = router;
