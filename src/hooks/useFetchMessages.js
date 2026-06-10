import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/apiInstance";
import { GET_MESSAGES } from "../api/endPoints";

const useFetchMessages = (currentUserId, selectedUserId) => {
  return useQuery({
    queryKey: ["messages", currentUserId, selectedUserId],
    queryFn: async () => {
      if (!currentUserId || !selectedUserId) return [];
      const res = await apiClient.get(
        `${GET_MESSAGES}/${currentUserId}?receiver=${selectedUserId}`
      );
      return res?.data?.messages || [];
    },
    enabled: !!currentUserId && !!selectedUserId,
    refetchOnWindowFocus: false,
    staleTime: 0,
    placeholderData: [],
    keepPreviousData: false,
  });
};

export default useFetchMessages;
