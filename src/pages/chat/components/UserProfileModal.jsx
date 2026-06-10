import { useEffect, useState, useRef } from "react";
import { XMarkIcon, PhotoIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../api/apiInstance";
import {
  GET_USER_PROFILE,
  GET_SHARED_MEDIA,
  BLOCK_USER,
  UNBLOCK_USER,
} from "../../../api/endPoints";
import { useSocketStore } from "../../../store/useSocketStore";
import { useUserStore } from "../../../store/userStore";
import { DEFAULT_AVATAR } from "../../../content/data";
import { Lightbox } from "./MessageBubble";
import moment from "moment";
import toast from "react-hot-toast";

const UserProfileModal = ({ userId, currentUserId, onClose }) => {
  const [lightboxItem, setLightboxItem] = useState(null);
  const [activeTab, setActiveTab] = useState("media");
  const modalRef = useRef(null);
  const onlineUsers = useSocketStore((state) => state.onlineUsers);
  const qc = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch profile
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${GET_USER_PROFILE}/${userId}`);
      return res.data.user;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Fetch current user (to check blockedUsers list)
  const { data: myProfile } = useQuery({
    queryKey: ["userProfile", currentUserId],
    queryFn: async () => {
      const res = await apiClient.get(`${GET_USER_PROFILE}/${currentUserId}`);
      return res.data.user;
    },
    enabled: !!currentUserId,
    staleTime: 30000,
  });

  const isBlocked = myProfile?.blockedUsers?.some(
    (id) => (typeof id === "object" ? id?._id?.toString() : id?.toString()) === userId?.toString()
  );

  // Fetch shared media
  const { data: mediaData, isLoading: loadingMedia } = useQuery({
    queryKey: ["sharedMedia", currentUserId, userId],
    queryFn: async () => {
      const res = await apiClient.get(
        `${GET_SHARED_MEDIA}?userId=${currentUserId}&otherUserId=${userId}`
      );
      return res.data;
    },
    enabled: !!userId && !!currentUserId,
    staleTime: 30000,
  });

  // Block mutation
  const blockMutation = useMutation({
    mutationFn: () =>
      apiClient.post(BLOCK_USER, { blockerId: currentUserId, blockedId: userId }),
    onSuccess: () => {
      toast.success("User blocked");
      qc.invalidateQueries({ queryKey: ["userProfile", currentUserId] });
    },
    onError: () => toast.error("Failed to block user"),
  });

  // Unblock mutation
  const unblockMutation = useMutation({
    mutationFn: () =>
      apiClient.post(UNBLOCK_USER, { blockerId: currentUserId, blockedId: userId }),
    onSuccess: () => {
      toast.success("User unblocked");
      qc.invalidateQueries({ queryKey: ["userProfile", currentUserId] });
    },
    onError: () => toast.error("Failed to unblock user"),
  });

  const handleBlockToggle = () => {
    if (isBlocked) {
      unblockMutation.mutate();
    } else {
      if (window.confirm(`Block ${profileData?.username}? They won't be able to message you.`)) {
        blockMutation.mutate();
      }
    }
  };

  const isOnline = onlineUsers.includes(userId?.toString());
  const media = mediaData?.media || [];
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  const blockBusy = blockMutation.isPending || unblockMutation.isPending;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          className="w-full max-w-sm bg-base-100 rounded-2xl border border-base-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 flex-shrink-0">
            <h2 className="font-bold text-base">Profile</h2>
            <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loadingProfile ? (
              <div className="flex flex-col items-center gap-3 p-6">
                <div className="w-20 h-20 rounded-full skeleton-shimmer" />
                <div className="h-4 w-32 rounded skeleton-shimmer" />
                <div className="h-3 w-48 rounded skeleton-shimmer" />
              </div>
            ) : (
              <>
                {/* Avatar + name */}
                <div className="flex flex-col items-center gap-2 pt-6 pb-4 px-4">
                  <div className="relative">
                    <img
                      src={profileData?.avatar || DEFAULT_AVATAR}
                      alt={profileData?.username}
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/20"
                    />
                    {isOnline ? (
                      <span className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-2 border-base-100" />
                    ) : (
                      <span className="absolute bottom-1 right-1 w-4 h-4 bg-base-300 rounded-full border-2 border-base-100" />
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-bold text-lg leading-tight">{profileData?.username}</p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {isOnline ? (
                        <span className="text-success font-medium">● Online</span>
                      ) : profileData?.lastSeen ? (
                        `Last seen ${moment(profileData.lastSeen).fromNow()}`
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>

                  {profileData?.bio ? (
                    <p className="text-sm text-center text-base-content/70 mt-1 px-4 italic">
                      "{profileData.bio}"
                    </p>
                  ) : (
                    <p className="text-xs text-center text-base-content/30 mt-1 italic">No bio yet</p>
                  )}
                </div>

                {/* Info */}
                <div className="mx-4 mb-4 bg-base-200 rounded-xl p-3 flex flex-col gap-2">
                  <InfoRow label="Email" value={profileData?.email} />
                  <InfoRow
                    label="Joined"
                    value={profileData?.createdAt ? moment(profileData.createdAt).format("MMM YYYY") : "—"}
                  />
                  <InfoRow label="Media" value={`${mediaData?.total ?? "—"} shared files`} />
                </div>

                {/* Block / Unblock button */}
                <div className="mx-4 mb-4">
                  <button
                    className={`w-full btn btn-sm gap-2 ${
                      isBlocked ? "btn-outline btn-success" : "btn-outline btn-error"
                    }`}
                    onClick={handleBlockToggle}
                    disabled={blockBusy}
                  >
                    {blockBusy ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <NoSymbolIcon className="w-4 h-4" />
                    )}
                    {isBlocked ? "Unblock User" : "Block User"}
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-base-300 mx-4 mb-3">
                  <TabBtn label={`Photos (${images.length})`} active={activeTab === "media"} onClick={() => setActiveTab("media")} />
                  <TabBtn label={`Videos (${videos.length})`} active={activeTab === "videos"} onClick={() => setActiveTab("videos")} />
                </div>

                {/* Media grid */}
                <div className="px-4 pb-6">
                  {loadingMedia ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square rounded-lg skeleton-shimmer" />
                      ))}
                    </div>
                  ) : activeTab === "media" ? (
                    images.length === 0 ? (
                      <EmptyMedia label="No photos shared yet" />
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {images.map((item, idx) => (
                          <div
                            key={idx}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-base-300"
                            onClick={() => setLightboxItem(item)}
                          >
                            <img src={item.url} alt="shared" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )
                  ) : videos.length === 0 ? (
                    <EmptyMedia label="No videos shared yet" />
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {videos.map((item, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-base-300 relative"
                          onClick={() => setLightboxItem(item)}
                        >
                          <video src={item.url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlayIcon />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {lightboxItem && (
        <Lightbox
          src={lightboxItem.url}
          type={lightboxItem.type}
          onClose={() => setLightboxItem(null)}
        />
      )}
    </>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-base-content/40 w-16 flex-shrink-0">{label}</span>
    <span className="text-xs font-medium truncate">{value}</span>
  </div>
);

const TabBtn = ({ label, active, onClick }) => (
  <button
    className={`flex-1 text-xs font-semibold py-2 border-b-2 transition-colors ${
      active ? "border-primary text-primary" : "border-transparent text-base-content/40"
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const EmptyMedia = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-8 text-base-content/30 gap-2">
    <PhotoIcon className="w-10 h-10" />
    <p className="text-xs">{label}</p>
  </div>
);

const PlayIcon = () => (
  <svg className="w-8 h-8 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default UserProfileModal;
