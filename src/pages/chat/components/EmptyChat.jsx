const EmptyChat = () => (
  <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-3">
    <svg
      className="w-20 h-20"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
    <div className="text-center">
      <p className="text-lg font-semibold text-base-content/60">
        Your messages live here
      </p>
      <p className="text-sm mt-1">
        Select a conversation or search for someone to start chatting
      </p>
    </div>
  </div>
);

export default EmptyChat;
