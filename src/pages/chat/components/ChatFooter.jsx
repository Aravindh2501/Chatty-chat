import {
  FaceSmileIcon, PaperAirplaneIcon, PhotoIcon,
  XCircleIcon, XMarkIcon, ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import apiClient from "../../../api/apiInstance";
import { SEND_MSG } from "../../../api/endPoints";
import { useUserStore } from "../../../store/userStore";
import { useSocketStore } from "../../../store/useSocketStore";
import { useQueryClient } from "@tanstack/react-query";
import { compressImages } from "../../../utils/compressImage";
import toast from "react-hot-toast";

const ChatFooter = ({ SelectedUser, replyTo, onCancelReply }) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const emojiRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const currentUser = useUserStore((state) => state.currentUser);
  const { startTyping, stopTyping, emitSendMessage, joinRoom, addMessage } = useSocketStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentUser?._id && SelectedUser?.id) {
      joinRoom({ senderId: currentUser._id, receiverId: SelectedUser.id });
    }
  }, [currentUser?._id, SelectedUser?.id]); 

  useEffect(() => {
    return () => {
      clearTimeout(typingTimer.current);
      if (currentUser?._id && SelectedUser?.id) {
        stopTyping({ senderId: currentUser._id, receiverId: SelectedUser.id });
      }
    };
  }, [currentUser?._id, SelectedUser?.id]); 

  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  
  useEffect(() => {
    if (!inputRef.current) return;
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
    };
    const el = inputRef.current;
    el.addEventListener("focus", handleFocus);
    return () => el.removeEventListener("focus", handleFocus);
  }, []);

  const handleTyping = (val) => {
    if (!currentUser?._id || !SelectedUser?.id) return;
    if (val.trim()) {
      startTyping({ senderId: currentUser._id, receiverId: SelectedUser.id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        stopTyping({ senderId: currentUser._id, receiverId: SelectedUser.id });
      }, 1500);
    } else {
      clearTimeout(typingTimer.current);
      stopTyping({ senderId: currentUser._id, receiverId: SelectedUser.id });
    }
  };

  const onEmojiClick = (emoji) => {
    setText((prev) => prev + emoji.emoji);
    inputRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setMedia((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = "";
  };

  const removeMedia = (idx) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const updateSidebarOnSend = (message) => {
    const myId = currentUser._id?.toString();
    queryClient.setQueryData(["recentChats", myId], (old) => {
      if (!old) {
        queryClient.invalidateQueries({ queryKey: ["recentChats", myId] });
        return old;
      }
      const existingIdx = old.findIndex((c) => c._id?.toString() === SelectedUser.id?.toString());
      if (existingIdx === -1) {
        queryClient.invalidateQueries({ queryKey: ["recentChats", myId] });
        return old;
      }
      const updated = [...old];
      const chat = { ...updated[existingIdx], lastMessage: message };
      updated.splice(existingIdx, 1);
      updated.unshift(chat);
      return updated;
    });
  };

  const handleSend = async () => {
    if (!text.trim() && media.length === 0) return;
    if (!currentUser?._id || !SelectedUser?.id) return;
    const textVal = text.trim();
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      senderId: currentUser._id,
      receiverId: SelectedUser.id,
      text: textVal,
      type: media.length > 0 ? (media[0].file.type.startsWith("video") ? "video" : "image") : "text",
      content: media.map((m) => ({ type: m.file.type.startsWith("video") ? "video" : "image", url: m.preview })),
      status: "sent",
      createdAt: new Date().toISOString(),
      replyTo: replyTo || null,
      _optimistic: true,
    };
    addMessage(optimisticMsg);
    updateSidebarOnSend(optimisticMsg);
    setText("");
    setMedia([]);
    if (onCancelReply) onCancelReply();
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("senderId", currentUser._id);
      formData.append("receiverId", SelectedUser.id);
      formData.append("text", textVal);
      formData.append("type", optimisticMsg.type);
      if (replyTo) formData.append("replyTo", replyTo._id || replyTo.messageId);
      const rawFiles = media.map(({ file }) => file);
      const compressedFiles = await compressImages(rawFiles);
      compressedFiles.forEach((file) => formData.append("files", file));
      const res = await apiClient.post(SEND_MSG, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const savedMsg = res.data.message;
      useSocketStore.setState((state) => ({
        messages: state.messages.map((m) => m._id === optimisticMsg._id ? savedMsg : m),
      }));
      updateSidebarOnSend(savedMsg);
      emitSendMessage(savedMsg);
      stopTyping({ senderId: currentUser._id, receiverId: SelectedUser.id });
    } catch (err) {
      console.error("[ChatFooter] send error:", err);
      useSocketStore.setState((state) => ({
        messages: state.messages.filter((m) => m._id !== optimisticMsg._id),
      }));
      toast.error("Failed to send message");
      setText(textVal);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = !!(text.trim() || media.length > 0);

  return (
    
    <div className="border-t border-base-300 bg-base-200 rounded-b-xl flex-shrink-0">
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-base-300 bg-base-300/50">
          <ArrowUturnLeftIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 text-xs text-base-content/70 truncate">
            <span className="text-primary font-medium">Replying to: </span>
            {replyTo.type === "image" ? "📷 Photo" : replyTo.text}
          </div>
          <button onClick={onCancelReply} className="btn btn-ghost btn-xs btn-circle">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {media.length > 0 && (
        <div className="flex gap-2 flex-wrap px-4 pt-3">
          {media.map((item, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden bg-base-300">
              <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
              <button className="absolute top-0.5 right-0.5 btn btn-circle btn-error btn-xs" onClick={() => removeMedia(idx)}>
                <XCircleIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 min-h-[64px]">
        <div className="relative">
          <button
            className="btn btn-ghost btn-circle w-11 h-11 min-h-[44px]"
            onClick={() => setShowEmoji(!showEmoji)}
            type="button"
          >
            <FaceSmileIcon className="w-6 h-6" />
          </button>
          {showEmoji && (
            <div ref={emojiRef} className="absolute bottom-14 left-0 z-30">
              <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost btn-circle w-11 h-11 min-h-[44px]"
          onClick={() => fileRef.current.click()}
          type="button"
        >
          <PhotoIcon className="w-6 h-6" />
        </button>
        <input hidden ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />

        <input
          ref={inputRef}
          type="text"
          className="input input-bordered h-11 flex-1 bg-base-100 focus:outline-none text-base"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(e.target.value); }}
          onKeyDown={handleKeyDown}
        />

        <button
          className="btn btn-primary btn-circle w-11 h-11 min-h-[44px]"
          onClick={handleSend}
          disabled={!canSend || sending}
          type="button"
        >
          {sending
            ? <span className="loading loading-spinner loading-xs" />
            : <PaperAirplaneIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default ChatFooter;