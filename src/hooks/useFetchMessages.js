import { useInfiniteQuery } from "@tanstack/react-query";
import apiClient from "../api/apiInstance";
import { GET_MESSAGES } from "../api/endPoints";

const PAGE_LIMIT = 30;

const useFetchMessages = (currentUserId, selectedUserId) => {
  return useInfiniteQuery({
    queryKey: ["messages", currentUserId, selectedUserId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!currentUserId || !selectedUserId) return { messages: [], pagination: {} };
      const res = await apiClient.get(
        `${GET_MESSAGES}/${currentUserId}?receiver=${selectedUserId}&page=${pageParam}&limit=${PAGE_LIMIT}`
      );
      return res?.data || { messages: [], pagination: {} };
    },
    getNextPageParam: (lastPage) => {
      const { page, hasMore } = lastPage.pagination || {};
      return hasMore ? page + 1 : undefined;
    },
    enabled: !!currentUserId && !!selectedUserId,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
};

export default useFetchMessages;
