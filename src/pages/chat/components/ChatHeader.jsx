import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useSocketStore } from "../../../store/useSocketStore";
import { useUserStore } from "../../../store/userStore";
import { DEFAULT_AVATAR } from "../../../content/data";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import UserProfileModal from "./UserProfileModal";

const ChatHeader = ({ SelectedUser }) => {
  const navigate = useNavigate();
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const currentUser = useUserStore((state) => state.currentUser);
  const { stopTyping } = useSocketStore();
  const queryClient = useQueryClient();
  const [showProfile, setShowProfile] = useState(false);

  const isOnline = onlineUsers.includes(SelectedUser?.id?.toString());

  const recentChats =
    queryClient.getQueryData(["recentChats", currentUser?._id]) || [];
  const cachedUser = recentChats.find(
    (c) => c._id?.toString() === SelectedUser?.id?.toString()
  );
  const lastSeen = cachedUser?.lastSeen || SelectedUser?.lastSeen;

  const handleClose = () => {
    stopTyping({ senderId: currentUser?._id, receiverId: SelectedUser?.id });
    navigate("/");
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200 rounded-t-xl">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowProfile(true)}
        >
          <div className="relative">
            <img
              src={SelectedUser?.avatar || DEFAULT_AVATAR}
              alt={SelectedUser?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            {isOnline ? (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200" />
            ) : (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-base-300 rounded-full border-2 border-base-200" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{SelectedUser?.username}</p>
            <p className="text-xs text-base-content/50">
              {isOnline ? (
                <span className="text-success font-medium">Online</span>
              ) : lastSeen ? (
                `Last seen ${moment(lastSeen).fromNow()}`
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showProfile && (
        <UserProfileModal
          userId={SelectedUser?.id}
          currentUserId={currentUser?._id}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;
