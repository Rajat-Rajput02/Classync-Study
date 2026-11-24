import api from "./api";

export const getAdminAssignments = async () => {
  const response = await api.get("/admin/assignments");
  return response.data;
};

export const createAdminAssignment = async (data) => {
  const response = await api.post("/admin/assignments", data);
  return response.data;
};

export const updateAdminAssignment = async (id, data) => {
  const response = await api.put(`/admin/assignments/${id}`, data);
  return response.data;
};

export const getAdminAnalytics = async () => {
  const response = await api.get("/admin/analytics");
  return response.data;
};

export const getAssignmentGroups = async (id) => {
  const response = await api.get(`/admin/assignments/${id}/groups`);
  return response.data;
};

export const getAssignmentStudents = async (id) => {
  const response = await api.get(`/admin/assignments/${id}/students`);
  return response.data;
};

export const getAdminGroups = async () => {
  const response = await api.get("/admin/groups");
  return response.data;
};