import {
  ArrowUturnLeftIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useMessageActions } from "../../../hooks/useMessageActions";
import { useUserStore } from "../../../store/userStore";
import toast from "react-hot-toast";

const ChatMessageMenu = ({
  position,
  onClose,
  message,
  SelectedUser,
  onReply,
}) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const { handleDelete } = useMessageActions(SelectedUser);

  const msgSenderId =
    typeof message?.senderId === "object"
      ? message?.senderId?._id
      : message?.senderId;
  const isSender = msgSenderId === currentUser?._id;

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard
        .writeText(message.text)
        .then(() => toast.success("Copied to clipboard"))
        .catch(() => toast.error("Copy failed"));
    }
    onClose();
  };

  const handleReply = () => {
    onReply(message);
    onClose();
  };

  const handleDeleteForMe = async () => {
    await handleDelete(message, false);
    onClose();
  };

  const handleDeleteForAll = async () => {
    await handleDelete(message, true);
    onClose();
  };

  const handleForward = () => {
    toast("Forward feature coming soon", { icon: "📤" });
    onClose();
  };

  const handleInfo = () => {
    const status = message.status || "sent";
    toast(`Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`, {
      icon: "ℹ️",
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <ul
        className="fixed z-50 bg-base-100 border border-base-300 rounded-xl shadow-2xl p-1 w-52 animate-in fade-in slide-in-from-top-1 duration-100"
        style={{ top: position?.top, left: position?.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          icon={<ArrowUturnLeftIcon className="w-4 h-4 text-primary" />}
          label="Reply"
          onClick={handleReply}
        />

        {message.text && (
          <MenuItem
            icon={<ClipboardDocumentIcon className="w-4 h-4 text-base-content/60" />}
            label="Copy text"
            onClick={handleCopy}
          />
        )}

        <MenuItem
          icon={<ArrowRightIcon className="w-4 h-4 text-base-content/60" />}
          label="Forward"
          onClick={handleForward}
        />

        {isSender && (
          <MenuItem
            icon={<InformationCircleIcon className="w-4 h-4 text-base-content/60" />}
            label="Message info"
            onClick={handleInfo}
          />
        )}

        <div className="h-px bg-base-300 my-1 mx-2" />

        <MenuItem
          icon={<TrashIcon className="w-4 h-4 text-error" />}
          label="Delete for me"
          onClick={handleDeleteForMe}
          danger
        />

        {isSender && (
          <MenuItem
            icon={<TrashIcon className="w-4 h-4 text-error" />}
            label="Delete for everyone"
            onClick={handleDeleteForAll}
            danger
          />
        )}
      </ul>
    </>
  );
};

const MenuItem = ({ icon, label, onClick, danger = false }) => (
  <li
    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors select-none
      ${danger ? "text-error hover:bg-error/10" : "hover:bg-base-200 text-base-content"}`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </li>
);

export default ChatMessageMenu;
