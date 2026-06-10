import { useState, useEffect, useRef } from "react";
import moment from "moment";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import getStatusIcon from "../../../function/getStatusIcon";
import ChatMessageMenu from "./ChatMessageMenu";
import { MessageType } from "./message-type/MessageType";
import { DEFAULT_AVATAR } from "../../../content/data";
import apiClient from "../../../api/apiInstance";
import { REACT_TO_MESSAGE } from "../../../api/endPoints";
import { useUserStore } from "../../../store/userStore";
import toast from "react-hot-toast";

// ── Emoji reaction picker ─────────────────────────────────────────────────────
const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const ReactionPicker = ({ onSelect, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="flex gap-1 bg-base-100 border border-base-300 rounded-full shadow-lg px-2 py-1.5 z-30"
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="text-lg hover:scale-125 transition-transform leading-none"
          onClick={() => { onSelect(emoji); onClose(); }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

// ── Reaction summary bar ──────────────────────────────────────────────────────
const ReactionBar = ({ reactions, currentUserId, onReact }) => {
  if (!reactions?.length) return null;

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, count: 0, users: [] };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.userId);
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(grouped).map(({ emoji, count, users }) => {
        const myReaction = users.some(
          (u) => (typeof u === "object" ? u?._id?.toString() : u?.toString()) === currentUserId
        );
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
              myReaction
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-base-200 border-base-300 hover:bg-base-300"
            }`}
          >
            <span>{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Image / video lightbox ────────────────────────────────────────────────────
export const Lightbox = ({ src, type, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 btn btn-circle btn-sm bg-white/10 text-white border-0 hover:bg-white/20"
        onClick={onClose}
      >
        ✕
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[90vh]">
        {type === "video" ? (
          <video src={src} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl" />
        ) : (
          <img src={src} alt="media" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        )}
      </div>
    </div>
  );
};

// ── Highlight search text ─────────────────────────────────────────────────────
const HighlightText = ({ text, query }) => {
  if (!query?.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-warning/40 text-warning-content rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
};

// ── Main MessageBubble ────────────────────────────────────────────────────────
const MessageBubble = ({
  message,
  currentUser,
  SelectedUser,
  onReply,
  isSearchHighlight,
  isActiveSearchResult,
  searchQuery,
}) => {
  const [menuPos, setMenuPos] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { src, type }
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);
  const reactionPickerRef = useRef(null);

  const isSender =
    message.senderId === currentUser?._id ||
    message.senderId?._id === currentUser?._id;

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    let left = e.clientX;
    let top = e.clientY + 8;
    if (left + 220 > viewW) left = viewW - 224;
    if (top + 260 > viewH) top = e.clientY - 260;
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

  // React to message
  const handleReact = async (emoji) => {
    const msgId = message._id || message.messageId;
    if (!msgId || message._optimistic) return;
    try {
      await apiClient.post(`${REACT_TO_MESSAGE}/${msgId}/react`, {
        userId: currentUser._id,
        emoji,
      });
      // Socket will broadcast the reaction_update event; store handles it
    } catch {
      toast.error("Failed to react");
    }
  };


  // Open lightbox when clicking image/video in bubble
  const handleMediaClick = (url, type) => {
    setLightbox({ src: url, type });
  };

  // Determine highlight ring
  const highlightClass = isActiveSearchResult
    ? "ring-2 ring-warning rounded-2xl"
    : isSearchHighlight
    ? "ring-1 ring-warning/50 rounded-2xl"
    : "";

  return (
    <>
      <div
        className={`flex mb-2 ${isSender ? "justify-end" : "justify-start"} group`}
        data-message-id={message._id || message.messageId}
      >
        {!isSender && (
          <img
            src={SelectedUser?.avatar || DEFAULT_AVATAR}
            alt="avatar"
            className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end mb-1"
          />
        )}

        <div className={`flex flex-col ${isSender ? "items-end" : "items-start"} max-w-[75%]`}>
          {/* Reaction picker — appears above bubble on hover */}
          <div className="relative">
            {!message.isDeleted && !message._optimistic && (
              <div
                ref={reactionPickerRef}
                className={`absolute ${isSender ? "right-8" : "left-8"} -top-9 opacity-0 group-hover:opacity-100 transition-opacity z-20`}
              >
                {showReactionPicker ? (
                  <ReactionPicker
                    onSelect={handleReact}
                    onClose={() => setShowReactionPicker(false)}
                  />
                ) : (
                  <button
                    className="btn btn-ghost btn-xs rounded-full bg-base-200 border border-base-300 px-2"
                    onClick={() => setShowReactionPicker(true)}
                  >
                    😊 +
                  </button>
                )}
              </div>
            )}

            <div
              ref={bubbleRef}
              className={`flex items-end gap-1 ${isSender ? "flex-row-reverse" : "flex-row"} ${highlightClass}`}
            >
              <div className="relative" onContextMenu={openMenu}>
                <MessageType
                  message={message}
                  handleMenuOpen={openMenu}
                  isSender={isSender}
                  onMediaClick={handleMediaClick}
                  searchQuery={searchQuery}
                  HighlightText={HighlightText}
                />
              </div>

              {!message.isDeleted && !message._optimistic && (
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-full hover:bg-base-300 self-center flex-shrink-0"
                  onClick={openMenu}
                  type="button"
                >
                  <EllipsisVerticalIcon className="w-4 h-4 text-base-content/50" />
                </button>
              )}
            </div>
          </div>

          {/* Reactions bar */}
          <ReactionBar
            reactions={message.reactions}
            currentUserId={currentUser?._id}
            onReact={handleReact}
          />

          {/* Timestamp + status */}
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

        {/* Context menu */}
        {menuPos && (
          <div ref={menuRef}>
            <ChatMessageMenu
              position={menuPos}
              onClose={closeMenu}
              message={message}
              SelectedUser={SelectedUser}
              onReply={onReply}
              onReact={() => { closeMenu(); setShowReactionPicker(true); }}
            />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};

export default MessageBubble;
