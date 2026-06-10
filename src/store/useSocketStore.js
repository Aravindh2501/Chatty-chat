import { io } from "socket.io-client";
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { markMessageAsDelivered } from "../services/messageService";
import { playAudioNotification } from "../utils/audioNotification";

const SOCKET_URL = import.meta.env.VITE_APP_SOCKET_URL || "";

let _queryClient = null;
export const setQueryClientRef = (qc) => { _queryClient = qc; };

const updateSidebarCache = (message, currentUserId) => {
  if (!_queryClient) {
    console.warn("[sidebar] queryClient not set, skipping cache update");
    return;
  }

  const senderId =
    typeof message.senderId === "object"
      ? message.senderId?._id?.toString()
      : message.senderId?.toString();
  const receiverId =
    typeof message.receiverId === "object"
      ? message.receiverId?._id?.toString()
      : message.receiverId?.toString();

  const otherUserId = senderId === currentUserId ? receiverId : senderId;
  const iAmReceiver = receiverId === currentUserId;

  console.log("[sidebar] updateSidebarCache →", { senderId, receiverId, otherUserId, iAmReceiver });

  _queryClient.setQueryData(["recentChats", currentUserId], (old) => {
    if (!old) {
      console.warn("[sidebar] no existing recentChats cache, invalidating");
      _queryClient.invalidateQueries({ queryKey: ["recentChats", currentUserId] });
      return old;
    }

    const existingIdx = old.findIndex(
      (c) => c._id?.toString() === otherUserId
    );

    console.log("[sidebar] existingIdx:", existingIdx, "| total chats:", old.length);

    if (existingIdx === -1) {
      console.warn("[sidebar] conversation not in cache yet, invalidating to fetch");
      _queryClient.invalidateQueries({ queryKey: ["recentChats", currentUserId] });
      return old;
    }

    const updated = [...old];
    const chat = { ...updated[existingIdx] };
    chat.lastMessage = message;

    if (iAmReceiver) {
      const { activeReceiverId } = useSocketStore.getState();
      if (activeReceiverId?.toString() !== senderId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
        console.log("[sidebar] incremented unread for", senderId, "→", chat.unreadCount);
      } else {
        console.log("[sidebar] chat is active, not incrementing unread");
      }
    }

    updated.splice(existingIdx, 1);
    updated.unshift(chat);
    console.log("[sidebar] moved conversation to top ✅");
    return updated;
  });
};

const resetUnreadInCache = (otherUserId, currentUserId) => {
  if (!_queryClient) return;
  _queryClient.setQueryData(["recentChats", currentUserId], (old) => {
    if (!old) return old;
    return old.map((c) =>
      c._id?.toString() === otherUserId?.toString()
        ? { ...c, unreadCount: 0 }
        : c
    );
  });
  console.log("[sidebar] reset unread for", otherUserId);
};

export const useSocketStore = create((set, get) => ({
  socket: null,
  messages: [],
  onlineUsers: [],
  isTyping: false,
  activeReceiverId: null,

  connectSocket: () => {
    const { currentUser, token } = useUserStore.getState();
    if (!currentUser?._id) {
      console.warn("[socket] connectSocket called but no currentUser");
      return;
    }

    const existing = get().socket;
    if (existing?.connected) {
      console.log("[socket] already connected, skipping");
      return;
    }
    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
    }

    console.log("[socket] connecting to", SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    set({ socket });

    const registerUser = () => {
      const { currentUser } = useUserStore.getState();
      if (currentUser?._id) {
        console.log("[socket] emitting register_user →", currentUser._id);
        socket.emit("register_user", { userId: currentUser._id, token });

        const { activeReceiverId } = get();
        if (activeReceiverId) {
          console.log("[socket] re-joining room after reconnect →", activeReceiverId);
          socket.emit("join_room", {
            senderId: currentUser._id,
            receiverId: activeReceiverId,
          });
        }
      }
    };

    socket.on("connect", () => {
      console.log("[socket] ✅ connected | id:", socket.id);
      registerUser();
    });

    socket.on("reconnect", (attempt) => {
      console.log("[socket] 🔄 reconnected after", attempt, "attempt(s)");
      registerUser();
    });

    socket.on("online_users", (userIds) => {
      console.log("[socket] online_users →", userIds);
      set({ onlineUsers: userIds });
    });

    socket.on("user_online", ({ userId }) => {
      console.log("[socket] user_online →", userId);
      set((state) => {
        if (state.onlineUsers.includes(userId)) return state;
        return { onlineUsers: [...state.onlineUsers, userId] };
      });
    });

    socket.on("user_offline", ({ userId, lastSeen }) => {
      console.log("[socket] user_offline →", userId, "lastSeen:", lastSeen);
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
      if (_queryClient) {
        const { currentUser } = useUserStore.getState();
        _queryClient.setQueryData(["recentChats", currentUser?._id], (old) => {
          if (!old) return old;
          return old.map((c) =>
            c._id?.toString() === userId?.toString()
              ? { ...c, lastSeen, status: "offline" }
              : c
          );
        });
      }
    });

    socket.on("receive_message", (message) => {
      const { currentUser } = useUserStore.getState();
      const { activeReceiverId } = get();

      const msgSenderId =
        typeof message.senderId === "object"
          ? message.senderId?._id?.toString()
          : message.senderId?.toString();
      const msgReceiverId =
        typeof message.receiverId === "object"
          ? message.receiverId?._id?.toString()
          : message.receiverId?.toString();

      const myId = currentUser?._id?.toString();
      const activeId = activeReceiverId?.toString();

      const iAmSender = msgSenderId === myId;
      const iAmReceiver = msgReceiverId === myId;
      const belongsToActiveConv =
        activeId &&
        ((iAmSender && msgReceiverId === activeId) ||
          (iAmReceiver && msgSenderId === activeId));

      console.log("[socket] receive_message →", {
        msgId: message._id,
        msgSenderId,
        msgReceiverId,
        myId,
        activeId,
        iAmSender,
        iAmReceiver,
        belongsToActiveConv,
        status: message.status,
      });

      if (iAmReceiver || iAmSender) {
        updateSidebarCache(message, myId);
      }

      if (iAmReceiver && !iAmSender) {
        playAudioNotification();

        if (message.status === "sent") {
          console.log("[socket] marking message delivered →", message._id);
          markMessageAsDelivered({
            messageId: message._id || message.messageId,
            status: "delivered",
          });
        }

        if (belongsToActiveConv) {
          console.log("[socket] chat is open → emitting mark_read");
          socket.emit("mark_read", {
            senderId: msgSenderId,
            receiverId: myId,
          });
        } else {
          console.log("[socket] message NOT in active conv → skipping UI insert");
          return;
        }
      }

      set((state) => {
        const id = message._id || message.messageId;
        const exists = state.messages.some(
          (m) => (m._id && m._id === id) || (m.messageId && m.messageId === id)
        );

        if (exists) {
          console.log("[socket] message exists → updating status only", id);
          return {
            messages: state.messages.map((m) =>
              (m._id && m._id === id) || (m.messageId && m.messageId === id)
                ? { ...m, status: message.status ?? m.status }
                : m
            ),
          };
        }

        if (!belongsToActiveConv) {
          console.log("[socket] message not in active conv, skipping add");
          return state;
        }

        console.log("[socket] ✅ adding new message to state", id);
        return { messages: [...state.messages, message] };
      });
    });

    socket.on("message_status_update", ({ messageId, status }) => {
      console.log("[socket] message_status_update →", { messageId, status });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId || msg.messageId === messageId
            ? { ...msg, status }
            : msg
        ),
      }));
    });

    socket.on("message_deleted", ({ messageId, isDeleted }) => {
      console.log("[socket] message_deleted →", { messageId, isDeleted });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId || msg.messageId === messageId
            ? { ...msg, isDeleted }
            : msg
        ),
      }));
    });

    socket.on("messages_read", ({ readBy }) => {
      console.log("[socket] messages_read → readBy:", readBy);
      set((state) => ({
        messages: state.messages.map((msg) => {
          const receiverId =
            typeof msg.receiverId === "object"
              ? msg.receiverId?._id?.toString()
              : msg.receiverId?.toString();
          return receiverId?.toString() === readBy?.toString()
            ? { ...msg, status: "read" }
            : msg;
        }),
      }));
    });

    socket.on("receiver_typing", ({ senderId }) => {
      const { currentUser } = useUserStore.getState();
      console.log("[socket] receiver_typing → senderId:", senderId);
      if (senderId !== currentUser?._id) set({ isTyping: true });
    });

    socket.on("receiver_not_typing", ({ senderId }) => {
      const { currentUser } = useUserStore.getState();
      console.log("[socket] receiver_not_typing → senderId:", senderId);
      if (senderId !== currentUser?._id) set({ isTyping: false });
    });

    socket.on("disconnect", (reason) => {
      console.warn("[socket] ⚠️ disconnected | reason:", reason);
      set({ isTyping: false });
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] ❌ connect_error:", err.message);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      console.log("[socket] disconnecting manually");
      socket.removeAllListeners();
      socket.disconnect();
      set({
        socket: null,
        isTyping: false,
        messages: [],
        onlineUsers: [],
        activeReceiverId: null,
      });
    }
  },

  setActiveReceiver: (userId) => {
    console.log("[store] setActiveReceiver →", userId);
    set({ activeReceiverId: userId });
    if (userId) {
      const { currentUser } = useUserStore.getState();
      resetUnreadInCache(userId, currentUser?._id);
    }
  },

  setMessages: (messages) => {
    console.log("[store] setMessages → count:", messages.length);
    set({ messages });
  },

  addMessage: (msgOrArray) => {
    if (Array.isArray(msgOrArray)) {
      console.log("[store] addMessage (bulk) → count:", msgOrArray.length);
      set({ messages: msgOrArray });
    } else {
      set((state) => {
        const id = msgOrArray._id || msgOrArray.messageId;
        const exists = state.messages.some(
          (m) => (m._id && m._id === id) || (m.messageId && m.messageId === id)
        );
        if (exists) {
          console.log("[store] addMessage → duplicate, skipping", id);
          return state;
        }
        console.log("[store] addMessage → added optimistic msg", id);
        return { messages: [...state.messages, msgOrArray] };
      });
    }
  },

  clearMessages: () => {
    console.log("[store] clearMessages");
    set({ messages: [], isTyping: false });
  },

  startTyping: ({ senderId, receiverId }) => {
    console.log("[socket] emit start_typing →", { senderId, receiverId });
    get().socket?.emit("start_typing", { senderId, receiverId });
  },

  stopTyping: ({ senderId, receiverId }) => {
    get().socket?.emit("stop_typing", { senderId, receiverId });
  },

  emitSendMessage: (data) => {
    console.log("[socket] emit send_message →", data._id);
    get().socket?.emit("send_message", data);
  },

  emitDeleteMessage: (data) => {
    console.log("[socket] emit delete_message →", data.messageId);
    get().socket?.emit("delete_message", data);
  },

  emitMarkRead: ({ senderId, receiverId }) => {
    console.log("[socket] emit mark_read →", { senderId, receiverId });
    get().socket?.emit("mark_read", { senderId, receiverId });
    const { currentUser } = useUserStore.getState();
    resetUnreadInCache(senderId, currentUser?._id);
  },

  joinRoom: ({ senderId, receiverId }) => {
    console.log("[socket] emit join_room →", { senderId, receiverId });
    get().socket?.emit("join_room", { senderId, receiverId });
  },
}));
