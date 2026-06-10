import { useState, useEffect } from "react";
import { ArrowUturnLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";

export const MessageType = ({ message, handleMenuOpen, isSender }) => {
  const [imgOpen, setImgOpen] = useState(false);
  const [openSrc, setOpenSrc] = useState("");

  useEffect(() => {
    if (!imgOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setImgOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [imgOpen]);

  if (message.isDeleted) {
    return (
      <div
        className={`text-sm px-4 py-2.5 rounded-2xl italic text-base-content/40 border border-base-300 bg-base-200/80 ${
          isSender ? "rounded-br-none" : "rounded-bl-none"
        }`}
      >
        🚫 This message was deleted
      </div>
    );
  }

  const bubbleBase = `relative max-w-[18rem] sm:max-w-sm text-sm shadow-sm`;
  const senderBubble = `${bubbleBase} bg-primary text-primary-content rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-none px-4 py-2.5`;
  const receiverBubble = `${bubbleBase} bg-base-300 text-base-content rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none px-4 py-2.5`;

  const bubbleClass = isSender ? senderBubble : receiverBubble;

  const mediaItems = message.content && message.content.length > 0
    ? message.content
    : [];

  return (
    <>
      <div className={bubbleClass} onContextMenu={handleMenuOpen}>
        {message.replyTo && (
          <div
            className={`flex items-start gap-1 mb-2 px-2 py-1.5 rounded-lg text-xs border-l-2 ${
              isSender
                ? "border-primary-content/60 bg-primary-content/10"
                : "border-base-content/30 bg-base-content/10"
            }`}
          >
            <ArrowUturnLeftIcon className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-60" />
            <span className="truncate opacity-80">
              {message.replyTo.type === "image"
                ? "📷 Photo"
                : message.replyTo.text || "Message"}
            </span>
          </div>
        )}

        {message.text && (
          <p className="break-words whitespace-pre-wrap leading-relaxed">
            {message.text}
          </p>
        )}

        {mediaItems.length > 0 && (
          <div className={`${message.text ? "mt-2" : ""} space-y-1`}>
            {mediaItems.map((item, idx) => {
              if (item.type === "image" || (!item.type && item.url)) {
                return (
                  <img
                    key={item._id || idx}
                    src={item.url}
                    alt="shared media"
                    className="rounded-xl max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      if (!message._optimistic) {
                        setOpenSrc(item.url);
                        setImgOpen(true);
                      }
                    }}
                    loading="lazy"
                  />
                );
              }
              if (item.type === "video") {
                return (
                  <video
                    key={item._id || idx}
                    controls
                    className="rounded-xl max-w-full h-auto"
                    src={item.url}
                    preload="metadata"
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {imgOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImgOpen(false)}
        >
          <button
            className="absolute top-4 right-4 btn btn-ghost btn-circle text-white"
            onClick={() => setImgOpen(false)}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <img
            src={openSrc}
            alt="full size"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
