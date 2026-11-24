
const pool = require("../config/db");

// CREATE ASSIGNMENT
const createAssignment = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      title,
      description,
      dueDate,
      oneDriveLink,
      assignedToAll = false,
      groupIds = [],
    } = req.body;

    if (!title || !title.trim() || !dueDate || !oneDriveLink || !oneDriveLink.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title, due date and OneDrive link are required",
      });
    }

    if (!Number.isFinite(Date.parse(dueDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    if (typeof assignedToAll !== "boolean" || !Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment allocation",
      });
    }

    const parsedGroupIds = groupIds.map(Number);

    if (
      parsedGroupIds.some(
        id => !Number.isInteger(id) || id <= 0
      ) ||
      new Set(parsedGroupIds).size !== parsedGroupIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Group IDs must be valid and unique",
      });
    }

    if (!assignedToAll && parsedGroupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select all students or at least one group",
      });
    }

    await client.query("BEGIN");

    // Verify selected groups
    if (parsedGroupIds.length > 0) {
      const groups = await client.query(
        `SELECT id FROM groups
         WHERE id = ANY($1::int[])`,
        [parsedGroupIds]
      );

      if (groups.rows.length !== parsedGroupIds.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "One or more selected groups do not exist",
        });
      }
    }

    // Create assignment
    const result = await client.query(
      `INSERT INTO assignments
        (title, description, due_date, onedrive_link,
         created_by, assigned_to_all)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        dueDate,
        oneDriveLink.trim(),
        req.user.id,
        assignedToAll,
      ]
    );

    const assignment = result.rows[0];

    // Allocate to selected groups
    if (parsedGroupIds.length > 0) {
      for (const groupId of parsedGroupIds) {
        await client.query(
          `INSERT INTO assignment_groups
             (assignment_id, group_id)
           VALUES ($1, $2)`,
          [assignment.id, groupId]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create assignment",
    });

  } finally {
    client.release();
  }
};


// GET ALL ASSIGNMENTS CREATED BY ADMIN
const getAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          a.*,
          COALESCE(
            ARRAY_AGG(ag.group_id)
            FILTER (WHERE ag.group_id IS NOT NULL),
            '{}'
          ) AS group_ids
       FROM assignments a
       LEFT JOIN assignment_groups ag
          ON ag.assignment_id = a.id
       WHERE a.created_by = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      assignments: result.rows,
    });

  } catch (error) {
    console.error("Get assignments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assignments",
    });
  }
};


// EDIT ASSIGNMENT
const updateAssignment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { assignmentId } = req.params;

    const {
      title,
      description,
      dueDate,
      oneDriveLink,
      assignedToAll = false,
      groupIds = [],
    } = req.body;

    if (!title || !title.trim() || !dueDate || !oneDriveLink || !oneDriveLink.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title, due date and OneDrive link are required",
      });
    }

    if (!Number.isFinite(Date.parse(dueDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    if (typeof assignedToAll !== "boolean" || !Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment allocation",
      });
    }

    const parsedGroupIds = groupIds.map(Number);

    if (
      parsedGroupIds.some(
        id => !Number.isInteger(id) || id <= 0
      ) ||
      new Set(parsedGroupIds).size !== parsedGroupIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Group IDs must be valid and unique",
      });
    }

    if (!assignedToAll && parsedGroupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select all students or at least one group",
      });
    }

    await client.query("BEGIN");

    // Check assignment ownership
    const existing = await client.query(
      `SELECT id FROM assignments
       WHERE id = $1 AND created_by = $2
       FOR UPDATE`,
      [assignmentId, req.user.id]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Verify groups
    if (parsedGroupIds.length > 0) {
      const groups = await client.query(
        `SELECT id FROM groups
         WHERE id = ANY($1::int[])`,
        [parsedGroupIds]
      );

      if (groups.rows.length !== parsedGroupIds.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "One or more groups do not exist",
        });
      }
    }

    // Update assignment details
    const result = await client.query(
      `UPDATE assignments
       SET title = $1,
           description = $2,
           due_date = $3,
           onedrive_link = $4,
           assigned_to_all = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        title.trim(),
        description || null,
        dueDate,
        oneDriveLink.trim(),
        assignedToAll,
        assignmentId,
      ]
    );

    // Replace previous group allocations
    await client.query(
      "DELETE FROM assignment_groups WHERE assignment_id = $1",
      [assignmentId]
    );

    for (const groupId of parsedGroupIds) {
      await client.query(
        `INSERT INTO assignment_groups
           (assignment_id, group_id)
         VALUES ($1, $2)`,
        [assignmentId, groupId]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      assignment: result.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update assignment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update assignment",
    });

  } finally {
    client.release();
  }
};


// GROUP-WISE SUBMISSION TRACKING
const getGroupSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await pool.query(
      `SELECT
          g.id AS group_id,
          g.group_name,

          COUNT(gm.student_id)::INTEGER AS total_members,

          COUNT(gm.student_id) FILTER (
            WHERE s.is_confirmed = TRUE
          )::INTEGER AS confirmed_members,

          COUNT(gm.student_id) FILTER (
            WHERE COALESCE(s.is_confirmed, FALSE) = FALSE
          )::INTEGER AS pending_members,

          ROUND(
            100.0 * COUNT(gm.student_id) FILTER (
              WHERE s.is_confirmed = TRUE
            ) / NULLIF(COUNT(gm.student_id), 0),
            2
          ) AS progress_percentage

       FROM assignments a

       JOIN groups g ON (
          a.assigned_to_all = TRUE
          OR EXISTS (
            SELECT 1
            FROM assignment_groups ag
            WHERE ag.assignment_id = a.id
            AND ag.group_id = g.id
          )
       )

       JOIN group_members gm ON gm.group_id = g.id

       LEFT JOIN submissions s
          ON s.assignment_id = a.id
          AND s.group_id = g.id
          AND s.student_id = gm.student_id

       WHERE a.id = $1
       AND a.created_by = $2

       GROUP BY g.id
       ORDER BY g.group_name`,
      [assignmentId, req.user.id]
    );

    // Check whether assignment exists
    const assignment = await pool.query(
      `SELECT id FROM assignments
       WHERE id = $1 AND created_by = $2`,
      [assignmentId, req.user.id]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      groups: result.rows,
    });

  } catch (error) {
    console.error("Group submission tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group submissions",
    });
  }
};


// STUDENT-WISE SUBMISSION TRACKING
const getStudentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await pool.query(
      `SELECT
          u.id AS student_id,
          u.name AS student_name,
          u.email,
          g.id AS group_id,
          g.group_name,

          COALESCE(s.is_confirmed, FALSE) AS is_confirmed,
          s.confirmed_at

       FROM assignments a

       JOIN groups g ON (
          a.assigned_to_all = TRUE
          OR EXISTS (
            SELECT 1
            FROM assignment_groups ag
            WHERE ag.assignment_id = a.id
            AND ag.group_id = g.id
          )
       )

       JOIN group_members gm ON gm.group_id = g.id
       JOIN users u ON u.id = gm.student_id

       LEFT JOIN submissions s
          ON s.assignment_id = a.id
          AND s.group_id = g.id
          AND s.student_id = u.id

       WHERE a.id = $1
       AND a.created_by = $2

       ORDER BY g.group_name, u.name`,
      [assignmentId, req.user.id]
    );

    const assignment = await pool.query(
      `SELECT id FROM assignments
       WHERE id = $1 AND created_by = $2`,
      [assignmentId, req.user.id]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      students: result.rows,
    });

  } catch (error) {
    console.error("Student submission tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student submissions",
    });
  }
};


// ADMIN ANALYTICS
const getAnalytics = async (req, res) => {
  try {
    const result = await pool.query(
      `WITH eligible_groups AS (
          SELECT
              a.id AS assignment_id,
              g.id AS group_id
          FROM assignments a
          JOIN groups g ON (
              a.assigned_to_all = TRUE
              OR EXISTS (
                  SELECT 1
                  FROM assignment_groups ag
                  WHERE ag.assignment_id = a.id
                  AND ag.group_id = g.id
              )
          )
          WHERE a.created_by = $1
       ),

       eligible_students AS (
          SELECT
              eg.assignment_id,
              eg.group_id,
              gm.student_id
          FROM eligible_groups eg
          JOIN group_members gm
              ON gm.group_id = eg.group_id
       )

       SELECT
          COUNT(*)::INTEGER AS total_students,
        COUNT(*) FILTER (
    WHERE s.is_confirmed = TRUE
)::INTEGER AS confirmed_submissions,

COUNT(*) FILTER (
    WHERE s.is_confirmed = TRUE
)::INTEGER AS total_submissions,

          COUNT(*) FILTER (
              WHERE COALESCE(s.is_confirmed, FALSE) = FALSE
          )::INTEGER AS pending_submissions,

          COUNT(DISTINCT es.assignment_id)::INTEGER AS total_assignments,
          COUNT(DISTINCT es.group_id)::INTEGER AS total_groups,

          ROUND(
              100.0 * COUNT(*) FILTER (
                  WHERE s.is_confirmed = TRUE
              ) / NULLIF(COUNT(*), 0),
              2
          ) AS completion_percentage

       FROM eligible_students es

       LEFT JOIN submissions s
          ON s.assignment_id = es.assignment_id
          AND s.group_id = es.group_id
          AND s.student_id = es.student_id`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      analytics: result.rows[0],
    });

  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};
// getAll groups
// GET ALL GROUPS FOR ADMIN
const getAllGroups = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        group_name AS name
      FROM groups
      ORDER BY group_name ASC
    `);

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

module.exports = {
  createAssignment,
  getAssignments,
  updateAssignment,
  getGroupSubmissions,
  getStudentSubmissions,
  getAnalytics,
  getAllGroups,
};
