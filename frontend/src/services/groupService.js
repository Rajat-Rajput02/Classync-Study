
import api from "./api";

export const getMyGroups = async () => {
  const response = await api.get("/groups/my");
  return response.data;
};

export const createGroup = async (groupData) => {
  const payload =
    typeof groupData === "string"
      ? { groupName: groupData }
      : {
          groupName:
            groupData?.groupName ??
            groupData?.group_name ??
            groupData?.name ??
            "",
        };

  const response = await api.post("/groups", payload);
  return response.data;
};
export const addGroupMember = async (groupId, memberData) => {
  const response = await api.post(
    `/groups/${groupId}/members`,
    memberData
  );
  return response.data;
};
