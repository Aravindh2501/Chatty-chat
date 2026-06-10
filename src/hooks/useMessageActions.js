import apiClient from "../api/apiInstance";
import { DELETE_MESSAGE } from "../api/endPoints";
import { useSocketStore } from "../store/useSocketStore";
import { useUserStore } from "../store/userStore";
import toast from "react-hot-toast";

export const useMessageActions = (SelectedUser) => {
  const { emitDeleteMessage } = useSocketStore();
  const currentUser = useUserStore((state) => state.currentUser);

  const handleDelete = async (message, forEveryone = true) => {
    const messageId = message._id || message.messageId;
    if (!messageId) return;

    if (forEveryone) {
      useSocketStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId || m.messageId === messageId
            ? { ...m, isDeleted: true }
            : m
        ),
      }));
    } else {
      useSocketStore.setState((state) => ({
        messages: state.messages.filter(
          (m) => m._id !== messageId && m.messageId !== messageId
        ),
      }));
    }

    try {
      const res = await apiClient.put(
        `${DELETE_MESSAGE}${messageId}/delete-message`,
        {
          deleteForEveryone: forEveryone,
          userId: currentUser?._id,
        }
      );

      if (forEveryone) {
        const updated = res.data.message;
        emitDeleteMessage({
          messageId: updated._id || updated.messageId,
          senderId: currentUser?._id,
          receiverId: SelectedUser?.id || SelectedUser?._id,
          isDeleted: true,
        });
      }

      toast.success(
        forEveryone ? "Message deleted for everyone" : "Message deleted for you"
      );
    } catch (error) {
      console.error("Delete error:", error);

      if (forEveryone) {
        useSocketStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId || m.messageId === messageId
              ? { ...m, isDeleted: false }
              : m
          ),
        }));
      }

      toast.error("Failed to delete message");
    }
  };

  return { handleDelete };
};
