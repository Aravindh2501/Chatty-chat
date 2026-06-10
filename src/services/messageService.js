import apiClient from "../api/apiInstance";
import { UPDATE_MSG_STATUS } from "../api/endPoints";

export const markMessageAsDelivered = async ({ messageId, status }) => {
  try {
    await apiClient.post(UPDATE_MSG_STATUS, { messageId, status });
  } catch (error) {
    console.error("Error updating message status:", error);
  }
};
