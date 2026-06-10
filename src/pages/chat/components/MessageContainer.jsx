import { useEffect, useRef, useCallback, useState } from "react";
import { useUserStore } from "../../../store/userStore";
import { useSocketStore } from "../../../store/useSocketStore";
import useFetchMessages from "../../../hooks/useFetchMessages";
import MessageBubble from "./MessageBubble";
import { DEFAULT_AVATAR } from "../../../content/data";
import { MagnifyingGlassIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import apiClient from "../../../api/apiInstance";
import { SEARCH_MESSAGES } from "../../../api/endPoints";
import { useDebounce } from "../../../hooks/useDebounce";

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

const MessageContainer = ({ SelectedUser, onReply,searchOpen, onSearchClose }) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const { messages, setMessages, isTyping, emitMarkRead, socket } = useSocketStore();
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const containerRef = useRef(null);
  const selectedUserIdRef = useRef(SelectedUser?.id);
  const isFirstLoad = useRef(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const highlightRefs = useRef({});

  useEffect(() => {
    selectedUserIdRef.current = SelectedUser?.id;
    isFirstLoad.current = true;
  }, [SelectedUser?.id]);

  // Infinite scroll fetch
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFetchMessages(currentUser?._id, SelectedUser?.id);

  // Flatten all pages into messages store
  useEffect(() => {
    if (!data) return;
    if (selectedUserIdRef.current !== SelectedUser?.id) return;

    const allMessages = data.pages.flatMap((p) => p.messages || []);
    setMessages(allMessages);

    // First load → scroll to bottom; subsequent loads (older) → keep position
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [data]); // eslint-disable-line

  // Load older messages on scroll to top
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      const prevScrollHeight = container.scrollHeight;
      fetchNextPage().then(() => {
        // Restore scroll position after prepending old messages
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        });
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Mark read on open
  useEffect(() => {
    if (currentUser?._id && SelectedUser?.id) {
      emitMarkRead({ senderId: SelectedUser.id, receiverId: currentUser._id });
    }
  }, [SelectedUser?.id]); // eslint-disable-line

  // Mark read on incoming message while chat open
  useEffect(() => {
    if (!socket || !currentUser?._id || !SelectedUser?.id) return;
    const handler = (message) => {
      const msgSenderId = typeof message.senderId === "object" ? message.senderId?._id?.toString() : message.senderId?.toString();
      const msgReceiverId = typeof message.receiverId === "object" ? message.receiverId?._id?.toString() : message.receiverId?.toString();
      if (msgReceiverId === currentUser._id?.toString() && msgSenderId === SelectedUser.id?.toString()) {
        emitMarkRead({ senderId: SelectedUser.id, receiverId: currentUser._id });
      }
    };
    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [socket, currentUser?._id, SelectedUser?.id]); // eslint-disable-line

  // Reaction socket updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, reactions }) => {
      useSocketStore.setState((state) => ({
        messages: state.messages.map((m) =>
          (m._id === messageId || m.messageId === messageId)
            ? { ...m, reactions }
            : m
        ),
      }));
    };
    socket.on("reaction_update", handler);
    return () => socket.off("reaction_update", handler);
  }, [socket]);

  // Auto scroll to bottom on new messages (only if near bottom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTyping]);

  // Search
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setSearchIdx(0);
      return;
    }
    const run = async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(
          `${SEARCH_MESSAGES}?userId=${currentUser._id}&otherUserId=${SelectedUser.id}&q=${encodeURIComponent(debouncedSearch)}`
        );
        setSearchResults(res.data.messages || []);
        setSearchIdx(0);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };
    run();
  }, [debouncedSearch]); // eslint-disable-line

  // Scroll to highlighted search result
  useEffect(() => {
    if (!searchResults.length) return;
    const msg = searchResults[searchIdx];
    if (!msg) return;
    const id = msg._id || msg.messageId;
    const el = highlightRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIdx, searchResults]);

   const closeSearch = () => {
    onSearchClose();      
    setSearchQuery("");
    setSearchResults([]);
    setSearchIdx(0);
  };

  const highlightedIds = new Set(searchResults.map((m) => m._id || m.messageId));
  const activeId = searchResults[searchIdx]?._id || searchResults[searchIdx]?.messageId;

  if (isLoading) return <MessageSkeleton />;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-base-200 border-b border-base-300 flex-shrink-0">
          <MagnifyingGlassIcon className="w-4 h-4 text-base-content/40 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searching && <span className="loading loading-spinner loading-xs" />}
          {searchResults.length > 0 && (
            <span className="text-xs text-base-content/40 flex-shrink-0">
              {searchIdx + 1}/{searchResults.length}
            </span>
          )}
          {searchResults.length > 1 && (
            <>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setSearchIdx((i) => Math.max(0, i - 1))}>
                <ChevronUpIcon className="w-3 h-3" />
              </button>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setSearchIdx((i) => Math.min(searchResults.length - 1, i + 1))}>
                <ChevronDownIcon className="w-3 h-3" />
              </button>
            </>
          )}
          {searchQuery && searchResults.length === 0 && !searching && (
            <span className="text-xs text-base-content/30">No results</span>
          )}
          <button className="btn btn-ghost btn-xs btn-circle" onClick={closeSearch}>
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2 flex-shrink-0">
          <span className="loading loading-spinner loading-xs text-base-content/30" />
        </div>
      )}
      {!hasNextPage && messages.length > 0 && (
        <div className="flex justify-center py-2 flex-shrink-0">
          <span className="text-xs text-base-content/20">Beginning of conversation</span>
        </div>
      )}

      {/* Messages list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
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
            <div
              key={msg._id || msg.messageId || idx}
              ref={(el) => {
                if (el) highlightRefs.current[msg._id || msg.messageId] = el;
              }}
            >
              <MessageBubble
                message={msg}
                currentUser={currentUser}
                SelectedUser={SelectedUser}
                onReply={onReply}
                isSearchHighlight={highlightedIds.has(msg._id || msg.messageId)}
                isActiveSearchResult={activeId === (msg._id || msg.messageId)}
                searchQuery={debouncedSearch}
              />
            </div>
          ))
        )}

        {/* Typing indicator */}
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
    </div>
  );
};

export default MessageContainer;
