const express = require("express");
const router = express.Router();

const {
  createGroup,
  addGroupMember,
  getMyGroups,
  getGroupDetails,
} = require("../controllers/groupController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// All routes require student authentication
router.use(authenticateToken, authorizeRoles("student"));

router.post("/", createGroup);

router.get("/my", getMyGroups);

router.get("/:groupId", getGroupDetails);

router.post("/:groupId/members", addGroupMember);

module.exports = router;
