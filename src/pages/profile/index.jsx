import { ArrowLeftIcon, CameraIcon, NoSymbolIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "../../store/userStore";
import { avatars, DEFAULT_AVATAR } from "../../content/data";
import apiClient from "../../api/apiInstance";
import { UPDATE_PROFILE, GET_BLOCKED_USERS, UNBLOCK_USER } from "../../api/endPoints";
import { useNavigate } from "react-router-dom";
import { compressImage } from "../../utils/compressImage";
import toast from "react-hot-toast";

// ── Blocked Users Tab ─────────────────────────────────────────────────────────
const BlockedUsersTab = ({ currentUserId }) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["blockedUsers", currentUserId],
    queryFn: async () => {
      const res = await apiClient.get(`${GET_BLOCKED_USERS}/${currentUserId}`);
      return res.data.blockedUsers || [];
    },
    enabled: !!currentUserId,
  });

  const unblockMutation = useMutation({
    mutationFn: (blockedId) =>
      apiClient.post(UNBLOCK_USER, { blockerId: currentUserId, blockedId }),
    onSuccess: (_, blockedId) => {
      toast.success("User unblocked");
      qc.setQueryData(["blockedUsers", currentUserId], (old) =>
        old?.filter((u) => u._id !== blockedId) ?? []
      );
      // Also invalidate the viewer's profile so UserProfileModal reflects change
      qc.invalidateQueries({ queryKey: ["userProfile", currentUserId] });
    },
    onError: () => toast.error("Failed to unblock"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton-shimmer flex-shrink-0" />
            <div className="flex-1 h-4 rounded skeleton-shimmer" />
            <div className="w-20 h-8 rounded-lg skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-base-content/30 gap-3">
        <NoSymbolIcon className="w-12 h-12" />
        <p className="text-sm font-medium">No blocked users</p>
        <p className="text-xs text-center">
          Users you block will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {data.map((user) => (
        <div
          key={user._id}
          className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300/60 transition-colors"
        >
          <img
            src={user.avatar || DEFAULT_AVATAR}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.username}</p>
            <p className="text-xs text-base-content/40 truncate">{user.email}</p>
          </div>
          <button
            className="btn btn-outline btn-success btn-xs flex-shrink-0"
            onClick={() => unblockMutation.mutate(user._id)}
            disabled={unblockMutation.isPending}
          >
            {unblockMutation.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Unblock"
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Main Profile Page ─────────────────────────────────────────────────────────
export const Profile = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [activeTab, setActiveTab] = useState("edit"); // "edit" | "blocked"

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm({
    defaultValues: {
      username: currentUser?.username || "",
      bio: currentUser?.bio || "",
    },
  });

  const bioValue = watch("bio", currentUser?.bio || "");

  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setSelectedAvatar(null);
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("bio", data.bio || "");

      if (uploadFile) {
        const compressed = await compressImage(uploadFile, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 400,
        });
        formData.append("avatar", compressed);
      } else if (selectedAvatar) {
        formData.append("avatar", selectedAvatar);
      }

      const res = await apiClient.put(
        `${UPDATE_PROFILE}/${currentUser?._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { username, avatar, bio } = res.data.user;
      setAvatar({ username, avatar, bio });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const displayAvatar =
    uploadPreview || selectedAvatar || currentUser?.avatar || DEFAULT_AVATAR;

  return (
    <div className="min-h-screen w-full bg-base-200 flex items-center justify-center p-6 pt-20">
      <div className="w-full max-w-md bg-base-100 rounded-2xl border border-base-300 shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Profile</h2>
          <div className="w-9" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-300 mb-6">
          <button
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 border-b-2 transition-colors ${
              activeTab === "edit"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/40 hover:text-base-content/70"
            }`}
            onClick={() => setActiveTab("edit")}
          >
            <UserCircleIcon className="w-4 h-4" />
            Edit Profile
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 border-b-2 transition-colors ${
              activeTab === "blocked"
                ? "border-error text-error"
                : "border-transparent text-base-content/40 hover:text-base-content/70"
            }`}
            onClick={() => setActiveTab("blocked")}
          >
            <NoSymbolIcon className="w-4 h-4" />
            Blocked Users
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "blocked" ? (
          <BlockedUsersTab currentUserId={currentUser?._id} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={displayAvatar}
                  alt="current avatar"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-primary ring-offset-base-100 ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="absolute bottom-0 right-0 btn btn-primary btn-xs btn-circle shadow"
                >
                  <CameraIcon className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-base-content/50">
                Click camera to upload a custom photo
              </p>
              <input
                hidden
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* Avatar grid */}
            <div>
              <p className="text-sm font-semibold mb-3 text-base-content/70">
                Or choose an avatar
              </p>
              <div className="grid grid-cols-6 gap-2">
                {avatars.map((av, i) => (
                  <div
                    key={i}
                    className={`relative w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedAvatar === av && !uploadPreview
                        ? "border-primary scale-110"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setSelectedAvatar(av);
                      setUploadPreview(null);
                      setUploadFile(null);
                    }}
                  >
                    <img src={av} alt={`avatar ${i}`} className="w-full h-full object-cover" />
                    {selectedAvatar === av && !uploadPreview && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Username */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Username</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter username"
                {...register("username", {
                  required: "Username is required",
                  minLength: { value: 3, message: "Minimum 3 characters" },
                  maxLength: { value: 20, message: "Maximum 20 characters" },
                })}
              />
              {errors.username && (
                <p className="text-error text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Bio</span>
                <span className="label-text-alt text-base-content/40">
                  {bioValue.length}/150
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full resize-none"
                placeholder="Write something about yourself..."
                rows={3}
                {...register("bio", {
                  maxLength: { value: 150, message: "Maximum 150 characters" },
                })}
              />
              {errors.bio && (
                <p className="text-error text-xs mt-1">{errors.bio.message}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full opacity-60 cursor-not-allowed"
                value={currentUser?.email || ""}
                disabled
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
