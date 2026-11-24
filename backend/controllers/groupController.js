
const pool = require("../config/db");

// CREATE GROUP
const createGroup = async (req, res) => {
  const client = await pool.connect();

  try {
    const { groupName } = req.body;
    const studentId = req.user.id;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO groups (group_name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [groupName.trim(), studentId]
    );

    const group = groupResult.rows[0];

    // Automatically add creator as a member
    await client.query(
      `INSERT INTO group_members (group_id, student_id)
       VALUES ($1, $2)`,
      [group.id, studentId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create group",
    });

  } finally {
    client.release();
  }
};


// ADD GROUP MEMBER
const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email, studentId } = req.body;
    const currentUserId = req.user.id;

    if (!email && !studentId) {
      return res.status(400).json({
        success: false,
        message: "Provide student email or student ID",
      });
    }

    // Only the group creator can add members
    const groupResult = await pool.query(
      `SELECT id FROM groups
       WHERE id = $1 AND created_by = $2`,
      [groupId, currentUserId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator can add members",
      });
    }

    // Find student
    let studentResult;

    if (email) {
      studentResult = await pool.query(
        `SELECT id, name, email, role
         FROM users
         WHERE email = $1`,
        [email.trim().toLowerCase()]
      );
    } else {
      const parsedId = Number(studentId);

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      studentResult = await pool.query(
        `SELECT id, name, email, role
         FROM users
         WHERE id = $1`,
        [parsedId]
      );
    }

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Only student accounts can join groups",
      });
    }

    // Check if student already belongs to a group
    const existingMembership = await pool.query(
      `SELECT group_id
       FROM group_members
       WHERE student_id = $1`,
      [student.id]
    );

    if (existingMembership.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Student already belongs to a group",
      });
    }

    const result = await pool.query(
      `INSERT INTO group_members (group_id, student_id)
       VALUES ($1, $2)
       RETURNING *`,
      [groupId, student.id]
    );

    return res.status(201).json({
      success: true,
      message: "Student added to group successfully",
      member: {
        ...student,
        membershipId: result.rows[0].id,
      },
    });

  } catch (error) {
    console.error("Add group member error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Student already belongs to a group",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add group member",
    });
  }
};


// GET MY GROUPS
const getMyGroups = async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await pool.query(
      `SELECT
          g.id,
          g.group_name,
          g.created_by,
          g.created_at,
          COUNT(gm.student_id)::INTEGER AS member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE g.id IN (
          SELECT group_id
          FROM group_members
          WHERE student_id = $1
       )
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [studentId]
    );

    return res.status(200).json({
      success: true,
      groups: result.rows,
    });

  } catch (error) {
    console.error("Get groups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
    });
  }
};


// GET GROUP DETAILS AND MEMBERS
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const studentId = req.user.id;

    const membership = await pool.query(
      `SELECT g.id, g.group_name, g.created_by, g.created_at
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id = $1 AND gm.student_id = $2`,
      [groupId, studentId]
    );

    if (membership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found or you are not a member",
      });
    }

    const members = await pool.query(
      `SELECT
          u.id,
          u.name,
          u.email,
          gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.student_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at`,
      [groupId]
    );

    return res.status(200).json({
      success: true,
      group: membership.rows[0],
      members: members.rows,
    });

  } catch (error) {
    console.error("Group details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group details",
    });
  }
};


module.exports = {
  createGroup,
  addGroupMember,
  getMyGroups,
  getGroupDetails,
};
