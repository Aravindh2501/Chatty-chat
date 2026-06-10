import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import ChatFooter from "./components/ChatFooter";
import ChatSidebar from "./components/ChatSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageContainer from "./components/MessageContainer";
import EmptyChat from "./components/EmptyChat";
import { useSocketStore } from "../../store/useSocketStore";

const Chat = () => {
  const { id } = useParams();
  const location = useLocation();
  const [replyTo, setReplyTo] = useState(null);

  const { clearMessages, setActiveReceiver } = useSocketStore();

  useEffect(() => {
    clearMessages();
    setReplyTo(null);
    setActiveReceiver(id || null);
  }, [id]);

  useEffect(() => {
    return () => {
      setActiveReceiver(null);
      clearMessages();
    };
  }, []);

  const query = new URLSearchParams(location.search);
  const SelectedUser = id
    ? {
        id,
        username: query.get("username"),
        email: query.get("email"),
        avatar: query.get("avatar"),
        lastSeen: query.get("lastSeen"),
      }
    : null;

  const hasChat = !!SelectedUser?.username;

  return (
    <div className="w-screen h-[100dvh] pt-[57px] flex bg-base-100 overflow-hidden">
      <div className="flex flex-1 overflow-hidden p-3 sm:p-4 gap-3 min-h-0">
        <div
          className={`
            ${hasChat ? "hidden md:flex" : "flex"}
            w-full md:w-72 lg:w-80 flex-shrink-0
            bg-base-200 rounded-2xl border border-base-300
            p-3 overflow-hidden
          `}
        >
          <ChatSidebar />
        </div>

        <div
          className={`
            ${hasChat ? "flex" : "hidden md:flex"}
            flex-1 flex-col min-h-0 bg-base-200 rounded-2xl border border-base-300 overflow-hidden
          `}
        >
          {hasChat ? (
            <>
              <ChatHeader SelectedUser={SelectedUser} />
              <MessageContainer
                SelectedUser={SelectedUser}
                onReply={setReplyTo}
                className="flex-1 min-h-0"
              />
              <ChatFooter
                SelectedUser={SelectedUser}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            </>
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;