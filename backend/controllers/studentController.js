
const pool = require("../config/db");

// GET ASSIGNMENTS AVAILABLE TO STUDENT
const getAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await pool.query(
      `SELECT
          a.id,
          a.title,
          a.description,
          a.due_date,
          a.onedrive_link,
          a.created_at,
          g.id AS group_id,
          g.group_name,
          COALESCE(s.is_confirmed, FALSE) AS is_confirmed,
          s.confirmed_at
       FROM assignments a

       JOIN group_members gm
          ON gm.student_id = $1

       JOIN groups g
          ON g.id = gm.group_id

       LEFT JOIN submissions s
          ON s.assignment_id = a.id
          AND s.student_id = $1

       WHERE
          a.assigned_to_all = TRUE
          OR EXISTS (
              SELECT 1
              FROM assignment_groups ag
              WHERE ag.assignment_id = a.id
              AND ag.group_id = g.id
          )

       ORDER BY a.due_date ASC`,
      [studentId]
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


// CONFIRM SUBMISSION
const confirmSubmission = async (req, res) => {
  const client = await pool.connect();

  try {
    const { assignmentId } = req.params;
    const { groupId } = req.body;
    const studentId = req.user.id;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    await client.query("BEGIN");

    // Verify student belongs to this group
    const membership = await client.query(
      `SELECT group_id
       FROM group_members
       WHERE group_id = $1 AND student_id = $2
       FOR UPDATE`,
      [groupId, studentId]
    );

    if (membership.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    // Verify assignment is available to this group
    const assignment = await client.query(
      `SELECT id
       FROM assignments
       WHERE id = $1
       AND (
          assigned_to_all = TRUE
          OR EXISTS (
              SELECT 1
              FROM assignment_groups
              WHERE assignment_id = $1
              AND group_id = $2
          )
       )
       FOR UPDATE`,
      [assignmentId, groupId]
    );

    if (assignment.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Assignment not found or not assigned to this group",
      });
    }

    // Create or update confirmation
    const result = await client.query(
      `INSERT INTO submissions
          (assignment_id, group_id, student_id, is_confirmed, confirmed_at)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)

       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET
          group_id = EXCLUDED.group_id,
          is_confirmed = TRUE,
          confirmed_at = CURRENT_TIMESTAMP

       RETURNING *`,
      [assignmentId, groupId, studentId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Submission confirmed successfully",
      submission: result.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Confirm submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm submission",
    });

  } finally {
    client.release();
  }
};


// GET GROUP-WISE PROGRESS
const getGroupProgress = async (req, res) => {
  try {
    const { groupId } = req.params;
    const studentId = req.user.id;

    // Check group membership
    const membership = await pool.query(
      `SELECT group_id
       FROM group_members
       WHERE group_id = $1 AND student_id = $2`,
      [groupId, studentId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const result = await pool.query(
      `SELECT
          a.id AS assignment_id,
          a.title,
          a.due_date,

          COUNT(gm.student_id)::INTEGER AS total_members,

          COUNT(s.student_id) FILTER (
              WHERE s.is_confirmed = TRUE
          )::INTEGER AS confirmed_members,

          COUNT(gm.student_id) FILTER (
              WHERE s.is_confirmed = TRUE
          )::INTEGER AS confirmed_count,

          ROUND(
              100.0 *
              COUNT(gm.student_id) FILTER (
                  WHERE s.is_confirmed = TRUE
              ) /
              NULLIF(COUNT(gm.student_id), 0),
              2
          ) AS progress_percentage

       FROM assignments a

       CROSS JOIN group_members gm

       LEFT JOIN submissions s
          ON s.assignment_id = a.id
          AND s.group_id = gm.group_id
          AND s.student_id = gm.student_id

       WHERE gm.group_id = $1
       AND (
          a.assigned_to_all = TRUE
          OR EXISTS (
              SELECT 1
              FROM assignment_groups ag
              WHERE ag.assignment_id = a.id
              AND ag.group_id = $1
          )
       )

       GROUP BY a.id, a.title, a.due_date
       ORDER BY a.due_date`,
      [groupId]
    );

    return res.status(200).json({
      success: true,
      groupId,
      progress: result.rows,
    });

  } catch (error) {
    console.error("Group progress error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate group progress",
    });
  }
};


module.exports = {
  getAssignments,
  confirmSubmission,
  getGroupProgress,
};
