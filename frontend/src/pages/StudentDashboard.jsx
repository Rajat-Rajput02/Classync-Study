import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getMyGroups,
  createGroup,
  addGroupMember,
} from "../services/groupService";
import {
  getStudentAssignments,
  confirmAssignmentSubmission,
  getGroupProgress,
} from "../services/studentService";

function StudentDashboard() {
  const { user, logout } = useAuth();

  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const [confirmingAssignment, setConfirmingAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [progressByGroup, setProgressByGroup] = useState({});

  const getId = (item) => item.id ?? item.group_id ?? item.assignment_id;

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [groupData, assignmentData] = await Promise.all([
        getMyGroups(),
        getStudentAssignments(),
      ]);

      const fetchedGroups = Array.isArray(groupData)
        ? groupData
        : (groupData.groups ?? groupData.data ?? []);

      const fetchedAssignments = Array.isArray(assignmentData)
        ? assignmentData
        : (assignmentData.assignments ?? assignmentData.data ?? []);

      setGroups(fetchedGroups);
      setAssignments(fetchedAssignments);

      const progressResults = await Promise.allSettled(
        fetchedGroups.map((group) => getGroupProgress(getId(group))),
      );

      const progressMap = {};

      progressResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          progressMap[getId(fetchedGroups[index])] = result.value;
        }
      });

      setProgressByGroup(progressMap);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data. Please refresh.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!groupName.trim()) return;

    try {
      await createGroup({ name: groupName.trim() });
      setGroupName("");
      setMessage("Group created successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create group.");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!selectedGroup || !memberEmail.trim()) {
      setError("Select a group and enter the member's email.");
      return;
    }

    try {
      await addGroupMember(selectedGroup, {
        email: memberEmail.trim(),
      });

      setMemberEmail("");
      setMessage("Member added successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add member.");
    }
  };

  const handleConfirmSubmission = async (assignmentId, groupId) => {
    setError("");
    setMessage("");

    try {
      await confirmAssignmentSubmission(assignmentId, groupId);

      // Update the assignment's visible status immediately.
      setAssignments((current) =>
        current.map((assignment) =>
          String(getAssignmentId(assignment)) === String(assignmentId)
            ? { ...assignment, is_submitted: true }
            : assignment,
        ),
      );

      setConfirmingAssignment(null);
      setMessage("Your submission confirmation was recorded.");

      // Refresh the group progress from the backend.
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to confirm submission.");
    }
  };

  const getAssignmentId = (assignment) =>
    assignment.id ?? assignment.assignment_id;

  const getAssignmentGroupId = (assignment) =>
    assignment.group_id ?? assignment.groupId;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Classync Study</h1>
          <p className="text-sm text-slate-500">Student Dashboard</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Welcome, {user?.name || user?.email}
          </span>
          <button
            onClick={logout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {message && (
          <p className="rounded-lg bg-green-100 p-3 text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-100 p-3 text-red-700">{error}</p>
        )}

        {/* Groups */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-800">My Groups</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <form
              onSubmit={handleCreateGroup}
              className="space-y-3 rounded-xl bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold">Create a Group</h3>

              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full rounded-lg border p-3 outline-none focus:border-indigo-500"
                required
              />

              <button className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700">
                Create Group
              </button>
            </form>

            <form
              onSubmit={handleAddMember}
              className="space-y-3 rounded-xl bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold">Add a Group Member</h3>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-lg border p-3"
                required
              >
                <option value="">Select your group</option>
                {groups.map((group) => (
                  <option key={getId(group)} value={getId(group)}>
                    {group.name || group.group_name}
                  </option>
                ))}
              </select>

              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Student email address"
                className="w-full rounded-lg border p-3 outline-none focus:border-indigo-500"
                required
              />

              <button
                disabled={groups.length === 0}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Member
              </button>
            </form>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const groupId = getId(group);
              const response = progressByGroup[groupId];

              // Supports either a direct response or a nested progress object.
              const progressRows = Array.isArray(response?.progress)
                ? response.progress
                : Array.isArray(response?.data?.progress)
                  ? response.data.progress
                  : [];

              const confirmed = progressRows.reduce(
                (sum, item) =>
                  sum +
                  Number(item.confirmed_members ?? item.confirmed_count ?? 0),
                0,
              );

              const total = progressRows.reduce(
                (sum, item) => sum + Number(item.total_members ?? 0),
                0,
              );

              const percentage =
                total > 0
                  ? Math.min(100, Math.round((confirmed / total) * 100))
                  : 0;

              // const progress =
              //   response?.progress ??
              //   response?.data?.progress ??
              //   response?.data ??
              //   response ??
              //   {};

              // const confirmed = Number(
              //   progress.confirmedMembers ??
              //     progress.confirmed_members ??
              //     progress.confirmed_count ??
              //     progress.confirmed ??
              //     progress.completed ??
              //     0,
              // );

              // const total = Number(
              //   progress.totalMembers ??
              //     progress.total_members ??
              //     progress.total_count ??
              //     progress.total ??
              //     0,
              // );

              // const percentage =
              //   total > 0
              //     ? Math.min(100, Math.round((confirmed / total) * 100))
              //     : 0;

              return (
                <div
                  key={groupId}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-800">
                      {group.name || group.group_name}
                    </h3>

                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                      {percentage === 100 && total > 0
                        ? "Completed"
                        : "In Progress"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Group ID: {groupId}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-600">
                        Submission Progress
                      </span>
                      <span className="font-semibold text-slate-800">
                        {confirmed}/{total}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="mt-2 text-right text-xs text-slate-500">
                      {percentage}% completed
                    </p>
                  </div>
                </div>
              );
            })}

            {groups.length === 0 && (
              <p className="text-slate-500">
                You haven't joined or created a group yet.
              </p>
            )}
          </div>
        </section>

        {/* Assignments */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            My Assignments
          </h2>

          <div className="space-y-4">
            {assignments.map((assignment) => {
              const assignmentId = getAssignmentId(assignment);
              const groupId = getAssignmentGroupId(assignment);
              const isConfirming = confirmingAssignment === assignmentId;

              return (
                <article
                  key={assignmentId}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-800">
                    {assignment.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    {assignment.description}
                  </p>

                  {assignment.due_date && (
                    <p className="mt-2 text-sm text-slate-500">
                      Due date:{" "}
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}

                  {assignment.one_drive_link && (
                    <a
                      href={assignment.one_drive_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-indigo-600 underline"
                    >
                      Open OneDrive Submission Link
                    </a>
                  )}

                  {groupId && (
                    <div className="mt-4">
                      {assignment.is_submitted ? (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                          ✓ Submitted
                        </span>
                      ) : !isConfirming ? (
                        <button
                          onClick={() => setConfirmingAssignment(assignmentId)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                        >
                          Yes, I have submitted
                        </button>
                      ) : (
                        <div className="space-y-3 rounded-lg bg-amber-50 p-4">
                          <p className="text-sm text-amber-800">
                            Please confirm that you have uploaded your
                            assignment to OneDrive.
                          </p>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() =>
                                handleConfirmSubmission(assignmentId, groupId)
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
                            >
                              Confirm Submission
                            </button>

                            <button
                              onClick={() => setConfirmingAssignment(null)}
                              className="rounded-lg border px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {assignments.length === 0 && (
              <p className="text-slate-500">
                No assignments are available right now.
              </p>
            )}
          </div>
        </section>

        <button
          onClick={loadDashboard}
          className="rounded-lg border border-indigo-600 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
        >
          Refresh Dashboard
        </button>
      </main>
    </div>
  );
}

export default StudentDashboard;
