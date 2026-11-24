
const express = require("express");
const router = express.Router();

const {
  getAssignments,
  confirmSubmission,
  getGroupProgress,
} = require("../controllers/studentController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// All student routes require student authentication
router.use(authenticateToken, authorizeRoles("student"));

// View available assignments
router.get("/assignments", getAssignments);

// Confirm assignment submission
router.post(
  "/assignments/:assignmentId/confirm",
  confirmSubmission
);

// Track group progress
router.get("/groups/:groupId/progress", getGroupProgress);

module.exports = router;
