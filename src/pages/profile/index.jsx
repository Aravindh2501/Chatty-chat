import { ArrowLeftIcon, CameraIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import { useUserStore } from "../../store/userStore";
import { avatars, DEFAULT_AVATAR } from "../../content/data";
import apiClient from "../../api/apiInstance";
import { UPDATE_PROFILE } from "../../api/endPoints";
import { useNavigate } from "react-router-dom";
import { compressImage } from "../../utils/compressImage";
import toast from "react-hot-toast";

export const Profile = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const setAvatar = useUserStore((state) => state.setAvatar);
  const navigate = useNavigate();
  const fileRef = useRef(null);

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

  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser?.avatar || null
  );
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
        <div className="flex items-center justify-between mb-6">
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <div className="w-9" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  <img
                    src={av}
                    alt={`avatar ${i}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedAvatar === av && !uploadPreview && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

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
      </div>
    </div>
  );
};
