import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../api/apiInstance";
import { GET_USER_MSG, GET_USERS } from "../../../api/endPoints";
import { useUserStore } from "../../../store/userStore";
import { useSocketStore } from "../../../store/useSocketStore";
import { useNavigate, useParams } from "react-router-dom";
import { MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { DEFAULT_AVATAR } from "../../../content/data";
import moment from "moment";

const SkeletonRow = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl">
    <div className="w-11 h-11 rounded-full skeleton-shimmer flex-shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="h-3 w-28 rounded skeleton-shimmer" />
      <div className="h-2 w-40 rounded skeleton-shimmer" />
    </div>
  </div>
);

const ChatSidebar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const currentUser = useUserStore((state) => state.currentUser);
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: activeChatId } = useParams();

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["userSearch", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const res = await apiClient.get(
        `${GET_USERS}?userId=${currentUser?._id}&search=${searchTerm}`
      );
      return res?.data?.data || [];
    },
    enabled: !!searchTerm.trim(),
  });

  const { data: recentChats = [], isLoading: loadingChats } = useQuery({
    queryKey: ["recentChats", currentUser?._id],
    queryFn: async () => {
      const res = await apiClient.get(
        `${GET_USER_MSG}?userId=${currentUser?._id}`
      );
      return res?.data?.data || [];
    },
    enabled: !!currentUser?._id,
    refetchInterval: 30000,
    staleTime: 5000,
  });

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setDropdownOpen(val.trim() !== "");
  };

  const handleSelectUser = (user) => {
    const userId = user._id || user.id;
    navigate(
      `/chat/${userId}?email=${encodeURIComponent(
        user.email || ""
      )}&username=${encodeURIComponent(user.username)}&avatar=${encodeURIComponent(
        user.avatar || ""
      )}&lastSeen=${encodeURIComponent(user.lastSeen || "")}`
    );
    setSearchTerm("");
    setDropdownOpen(false);
  };

  const isOnline = (userId) => onlineUsers.includes(userId?.toString());

  const getLastMessagePreview = (chat) => {
    const msg = chat.lastMessage;
    if (!msg) return "Start a conversation";
    if (msg.isDeleted) return "🚫 Message deleted";
    if (msg.type === "image") return "📷 Photo";
    if (msg.type === "video") return "🎥 Video";
    return msg.text?.slice(0, 40) + (msg.text?.length > 40 ? "…" : "") || "";
  };

  return (
    <div className="flex flex-col h-full gap-3 w-full">
      <div
        className="flex items-center gap-3 p-3 rounded-xl bg-base-100/60 cursor-pointer hover:bg-base-300 transition-colors"
        onClick={() => navigate("/profile")}
      >
        <div className="relative flex-shrink-0">
          <img
            src={currentUser?.avatar || DEFAULT_AVATAR}
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary ring-offset-base-200 ring-offset-1"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{currentUser?.username}</p>
          <p className="text-xs text-base-content/40 truncate">{currentUser?.email}</p>
        </div>
        <UserCircleIcon className="w-4 h-4 text-base-content/30 flex-shrink-0" />
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className="input input-bordered input-sm flex items-center gap-2 w-full bg-base-100/60">
          <MagnifyingGlassIcon className="w-4 h-4 text-base-content/40 flex-shrink-0" />
          <input
            type="text"
            className="grow bg-transparent focus:outline-none text-sm"
            placeholder="Search people…"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {isSearching && (
            <span className="loading loading-spinner loading-xs text-base-content/40" />
          )}
        </label>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-xl shadow-xl max-h-56 overflow-y-auto z-30">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-base-200 transition-colors"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar || DEFAULT_AVATAR}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    {isOnline(user._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border border-base-100" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.username}</p>
                    <p className="text-xs text-base-content/40 truncate">{user.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-base-content/40">
                No users found
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <p className="text-xs font-semibold text-base-content/30 uppercase tracking-wider mb-2 px-1">
          Messages
        </p>

        {loadingChats ? (
          <div className="flex flex-col gap-0.5">
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : recentChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-base-content/30 gap-2">
            <ChatBubbleIcon />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs text-center">Search for people to start chatting</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {recentChats.map((chat) => {
              const isActive = activeChatId === chat._id;
              return (
                <div
                  key={chat._id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors relative ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-base-300/60"
                  }`}
                  onClick={() => handleSelectUser(chat)}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={chat.avatar || DEFAULT_AVATAR}
                      alt={chat.username}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {isOnline(chat._id) ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-base-content/20 rounded-full border-2 border-base-200" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate ${chat.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                        {chat.username}
                      </p>
                      {chat.lastMessage?.createdAt && (
                        <p className="text-xs text-base-content/30 flex-shrink-0">
                          {moment(chat.lastMessage.createdAt).format("h:mm A")}
                        </p>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${
                      chat.unreadCount > 0
                        ? "text-base-content/70 font-medium"
                        : "text-base-content/40"
                    }`}>
                      {getLastMessagePreview(chat)}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <span className="badge badge-primary badge-sm flex-shrink-0 font-semibold">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatBubbleIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    />
  </svg>
);

export default ChatSidebar;
