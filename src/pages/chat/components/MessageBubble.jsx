import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import getStatusIcon from "../../../function/getStatusIcon";
import ChatMessageMenu from "./ChatMessageMenu";
import { MessageType } from "./message-type/MessageType";
import { DEFAULT_AVATAR } from "../../../content/data";

const MessageBubble = ({ message, currentUser, SelectedUser, onReply }) => {
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);

  const isSender =
    message.senderId === currentUser?._id ||
    message.senderId?._id === currentUser?._id;

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = bubbleRef.current?.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY + 8;

    if (left + 220 > viewW) left = viewW - 224;
    if (top + 230 > viewH) top = e.clientY - 230;

    setMenuPos({ top: `${top}px`, left: `${left}px` });
  };

  const closeMenu = () => setMenuPos(null);

  useEffect(() => {
    if (!menuPos) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuPos]);

  useEffect(() => {
    if (!menuPos) return;
    const handler = () => closeMenu();
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [menuPos]);

  return (
    <div className={`flex mb-2 ${isSender ? "justify-end" : "justify-start"} group`}>
      {!isSender && (
        <img
          src={SelectedUser?.avatar || DEFAULT_AVATAR}
          alt="avatar"
          className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end mb-1"
        />
      )}

      <div
        className={`flex flex-col ${isSender ? "items-end" : "items-start"} max-w-[75%]`}
      >
        <div
          ref={bubbleRef}
          className={`flex items-end gap-1 ${isSender ? "flex-row-reverse" : "flex-row"}`}
        >
          <div
            className="relative"
            onContextMenu={openMenu}
          >
            <MessageType
              message={message}
              handleMenuOpen={openMenu}
              isSender={isSender}
            />
          </div>

          {!message.isDeleted && !message._optimistic && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-full hover:bg-base-300 self-center flex-shrink-0"
              onClick={openMenu}
              type="button"
              title="Message options"
            >
              <EllipsisVerticalIcon className="w-4 h-4 text-base-content/50" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5 px-1">
          <p className="text-xs text-base-content/40">
            {moment(message.createdAt).format("h:mm A")}
          </p>
          {isSender && getStatusIcon(message.status)}
          {message._optimistic && (
            <span className="text-xs text-base-content/30 italic">sending…</span>
          )}
        </div>
      </div>

      {isSender && (
        <img
          src={currentUser?.avatar || DEFAULT_AVATAR}
          alt="avatar"
          className="w-7 h-7 rounded-full object-cover ml-2 flex-shrink-0 self-end mb-1"
        />
      )}

      {menuPos && (
        <div ref={menuRef}>
          <ChatMessageMenu
            position={menuPos}
            onClose={closeMenu}
            message={message}
            SelectedUser={SelectedUser}
            onReply={onReply}
          />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
