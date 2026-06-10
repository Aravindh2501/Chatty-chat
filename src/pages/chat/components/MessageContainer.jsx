import { useEffect, useRef } from "react";
import { useUserStore } from "../../../store/userStore";
import { useSocketStore } from "../../../store/useSocketStore";
import useFetchMessages from "../../../hooks/useFetchMessages";
import MessageBubble from "./MessageBubble";
import { DEFAULT_AVATAR } from "../../../content/data";

const MessageSkeleton = () => (
  <div className="flex flex-col gap-4 p-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
        {i % 2 === 0 && <div className="w-8 h-8 rounded-full skeleton-shimmer flex-shrink-0" />}
        <div className={`flex flex-col gap-1 ${i % 2 !== 0 ? "items-end" : ""}`}>
          <div className="h-10 rounded-2xl skeleton-shimmer" style={{ width: `${120 + (i * 30) % 120}px` }} />
          <div className="h-2 w-12 rounded skeleton-shimmer" />
        </div>
        {i % 2 !== 0 && <div className="w-8 h-8 rounded-full skeleton-shimmer flex-shrink-0" />}
      </div>
    ))}
  </div>
);

const MessageContainer = ({ SelectedUser, onReply }) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const { messages, setMessages, isTyping, emitMarkRead, socket } = useSocketStore();
  const messagesEndRef = useRef(null);
  const selectedUserIdRef = useRef(SelectedUser?.id);

  useEffect(() => {
    selectedUserIdRef.current = SelectedUser?.id;
    console.log("[MessageContainer] selectedUser changed →", SelectedUser?.id);
  }, [SelectedUser?.id]);

  const { data: fetchedMessages, isLoading } = useFetchMessages(
    currentUser?._id,
    SelectedUser?.id
  );

  useEffect(() => {
    if (!fetchedMessages) return;
    console.log("[MessageContainer] fetchedMessages →", fetchedMessages.length, "for user:", SelectedUser?.id, "| ref:", selectedUserIdRef.current);
    if (selectedUserIdRef.current === SelectedUser?.id) {
      setMessages(fetchedMessages);
    } else {
      console.warn("[MessageContainer] stale fetch — ignoring (ref mismatch)");
    }
  }, [fetchedMessages]); 

  useEffect(() => {
    if (currentUser?._id && SelectedUser?.id) {
      console.log("[MessageContainer] emitMarkRead on open → senderId:", SelectedUser.id, "receiverId:", currentUser._id);
      emitMarkRead({ senderId: SelectedUser.id, receiverId: currentUser._id });
    }
  }, [SelectedUser?.id]); 
  
  
  useEffect(() => {
    if (!socket || !currentUser?._id || !SelectedUser?.id) return;

    const handler = (message) => {
      const msgSenderId =
        typeof message.senderId === "object"
          ? message.senderId?._id?.toString()
          : message.senderId?.toString();
      const msgReceiverId =
        typeof message.receiverId === "object"
          ? message.receiverId?._id?.toString()
          : message.receiverId?.toString();

      console.log("[MessageContainer] receive_message handler →", { msgSenderId, msgReceiverId, myId: currentUser._id, activeUser: SelectedUser.id });

      if (
        msgReceiverId === currentUser._id?.toString() &&
        msgSenderId === SelectedUser.id?.toString()
      ) {
        console.log("[MessageContainer] auto mark_read for incoming msg while chat open");
        emitMarkRead({ senderId: SelectedUser.id, receiverId: currentUser._id });
      }
    };

    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [socket, currentUser?._id, SelectedUser?.id]); 
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (isLoading) return <MessageSkeleton />;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-3">
          <svg className="w-16 h-16 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs">Say hello to {SelectedUser?.username}!</p>
        </div>
      ) : (
        messages.map((msg, idx) => (
          <MessageBubble
            key={msg._id || msg.messageId || idx}
            message={msg}
            currentUser={currentUser}
            SelectedUser={SelectedUser}
            onReply={onReply}
          />
        ))
      )}
      {isTyping && (
        <div className="flex items-center gap-2 mb-3">
          <img src={SelectedUser?.avatar || DEFAULT_AVATAR} alt="typing"
            className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          <div className="bg-base-300 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none px-4 py-2">
            <div className="typing-loader text-base-content"><span /><span /><span /></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageContainer;
