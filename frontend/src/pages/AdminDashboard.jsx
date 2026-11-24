
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyGroups } from "../services/groupService";

import {
  getAdminAssignments,
  createAdminAssignment,
  updateAdminAssignment,
  getAdminAnalytics,
  getAssignmentGroups,
  getAssignmentStudents,
  getAdminGroups,
} from "../services/adminService";

function AdminDashboard() {
  const { user, logout } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [analytics, setAnalytics] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [tracking, setTracking] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [oneDriveLink, setOneDriveLink] = useState("");
  const [assignedToAll, setAssignedToAll] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getId = (item) => item.id ?? item.assignment_id ?? item.group_id;

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [assignmentData, groupData, analyticsData] =
        await Promise.all([
          getAdminAssignments(),
          getAdminGroups().catch(() => ({ groups: [] })),
          getAdminAnalytics(),
        ]);

      setAssignments(
        Array.isArray(assignmentData)
          ? assignmentData
          : assignmentData.assignments ?? assignmentData.data ?? []
      );

      setGroups(
        Array.isArray(groupData)
          ? groupData
          : groupData.groups ?? groupData.data ?? []
      );

      setAnalytics(
        analyticsData.analytics ?? analyticsData.data ?? analyticsData
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setOneDriveLink("");
    setAssignedToAll(true);
    setSelectedGroups([]);
    setEditingId(null);
  };

  const handleGroupSelection = (groupId) => {
    setSelectedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (!assignedToAll && selectedGroups.length === 0) {
      setError("Select at least one group.");
      setSaving(false);
      return;
    }

    const payload = {
      title,
      description,
      dueDate,
      oneDriveLink,
      assignedToAll,
      groupIds: assignedToAll ? [] : selectedGroups,
    };

    try {
      if (editingId) {
        await updateAdminAssignment(editingId, payload);
        setMessage("Assignment updated successfully.");
      } else {
        await createAdminAssignment(payload);
        setMessage("Assignment created successfully.");
      }

      resetForm();
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assignment) => {
    setEditingId(getId(assignment));
    setTitle(assignment.title || "");
    setDescription(assignment.description || "");
    setDueDate(
      assignment.due_date
        ? new Date(assignment.due_date).toISOString().slice(0, 10)
        : ""
    );
    setOneDriveLink(
      assignment.one_drive_link || assignment.oneDriveLink || ""
    );
    setAssignedToAll(
      assignment.assigned_to_all ?? assignment.assignedToAll ?? true
    );

    setSelectedGroups(
      assignment.group_ids || assignment.groupIds || []
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTracking = async (assignment) => {
    setSelectedAssignment(assignment);
    setTracking(null);
    setError("");

    try {
      const id = getId(assignment);

      const [groupData, studentData] = await Promise.all([
        getAssignmentGroups(id),
        getAssignmentStudents(id),
      ]);

      setTracking({
        groups: Array.isArray(groupData)
          ? groupData
          : groupData.groups ?? groupData.data ?? [],
        students: Array.isArray(studentData)
          ? studentData
          : studentData.students ?? studentData.data ?? [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load submission tracking."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">
            Classync Study
          </h1>
          <p className="text-sm text-slate-500">
            Admin Dashboard
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Welcome, {user?.name || user?.email}
          </span>
          <button
            onClick={logout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {message && (
          <p className="rounded-lg bg-green-100 p-3 text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </p>
        )}

        {/* Analytics */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Overview
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Assignments",
                value: analytics.total_assignments ?? 0,
              },
              {
                label: "Total Groups",
                value: analytics.total_groups ?? 0,
              },
              {
                label: "Total Students",
                value: analytics.total_students ?? 0,
              },
              {
                label: "Submissions",
                value: analytics.total_submissions ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-indigo-700">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Create / Edit Assignment */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-800">
            {editingId ? "Edit Assignment" : "Create Assignment"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Assignment Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border p-3"
                placeholder="Enter assignment title"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full rounded-lg border p-3"
                placeholder="Enter assignment instructions"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  OneDrive Submission Link
                </label>
                <input
                  type="url"
                  value={oneDriveLink}
                  onChange={(e) => setOneDriveLink(e.target.value)}
                  required
                  className="w-full rounded-lg border p-3"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Assign To</p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={assignedToAll}
                  onChange={() => setAssignedToAll(true)}
                />
                All students
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!assignedToAll}
                  onChange={() => setAssignedToAll(false)}
                />
                Selected groups
              </label>

              {!assignedToAll && (
                <div className="grid gap-2 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                  {groups.map((group) => {
                    const groupId = getId(group);

                    return (
                      <label
                        key={groupId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(groupId)}
                          onChange={() => handleGroupSelection(groupId)}
                        />
                        {group.name || group.group_name}
                      </label>
                    );
                  })}

                  {groups.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No groups available.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Assignment"
                    : "Create Assignment"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-5 py-2.5"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Assignment List */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Manage Assignments
          </h2>

          <div className="space-y-4">
            {assignments.map((assignment) => (
              <article
                key={getId(assignment)}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {assignment.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {assignment.description}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Due:{" "}
                      {assignment.due_date
                        ? new Date(assignment.due_date).toLocaleDateString()
                        : "Not specified"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEdit(assignment)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleTracking(assignment)}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
                    >
                      View Submissions
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {assignments.length === 0 && (
              <p className="rounded-xl bg-white p-5 text-slate-500">
                No assignments have been created yet.
              </p>
            )}
          </div>
        </section>

        {/* Submission Tracking */}
        {selectedAssignment && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Submission Tracking
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedAssignment.title}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedAssignment(null);
                  setTracking(null);
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {!tracking ? (
              <p className="text-sm text-slate-500">
                Loading submission records...
              </p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-semibold">Group-wise Status</h3>

                  {tracking.groups.map((group, index) => (
                    <div
                      key={group.group_id ?? group.id ?? index}
                      className="mb-3 rounded-lg bg-slate-50 p-4"
                    >
                      <p className="font-medium">
                        {group.group_name || group.name || `Group ${index + 1}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Confirmed:{" "}
                        {group.confirmed_members ??
                          group.confirmed_count ??
                          group.submitted_count ??
                          0}
                        {" / "}
                        {group.total_members ?? group.total_count ?? 0}
                      </p>
                    </div>
                  ))}

                  {tracking.groups.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No group records found.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Student-wise Status</h3>

                  <div className="space-y-2">
                    {tracking.students.map((student, index) => (
                      <div
                        key={student.student_id ?? student.id ?? index}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {student.name || student.student_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {student.email}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            student.is_submitted ||
                            student.confirmed ||
                            student.status === "submitted"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {student.is_submitted ||
                          student.confirmed ||
                          student.status === "submitted"
                            ? "Submitted"
                            : "Pending"}
                        </span>
                      </div>
                    ))}

                    {tracking.students.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No student records found.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
