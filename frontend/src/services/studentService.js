
import api from "./api";

export const getStudentAssignments = async () => {
  const response = await api.get("/student/assignments");
  return response.data;
};

export const confirmAssignmentSubmission = async (
  assignmentId,
  groupId
) => {
  const response = await api.post(
    `/student/assignments/${assignmentId}/confirm`,
    { groupId }
  );
  return response.data;
};

export const getGroupProgress = async (groupId) => {
  const response = await api.get(
    `/student/groups/${groupId}/progress`
  );
  return response.data;
};
