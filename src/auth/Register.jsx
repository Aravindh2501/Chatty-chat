import {
  ChatBubbleBottomCenterTextIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import AuthImagePattern from "./AuthImagePattern";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { REGISTER } from "../api/endPoints";
import apiClient from "../api/apiInstance";

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await apiClient.post(REGISTER, data);
      toast.success(res?.data?.msg || "Account created!");
      navigate("/login");
    } catch (error) {
      const msg =
        error?.response?.data?.error || "Registration failed. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="w-screen h-screen grid lg:grid-cols-2 bg-base-100">
      <div className="hidden lg:block">
        <AuthImagePattern
          title="Join Chatty"
          subtitle="Connect with friends, family, and the world."
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-8 p-6 lg:p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="border border-primary p-4 rounded-2xl shadow-lg bg-base-200">
            <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <h1 className="text-4xl font-extrabold text-center">Create account</h1>
          <p className="text-base-content/60 text-center">
            Start chatting in seconds
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <UserIcon className="w-5 h-5 text-base-content/50" />
              <input
                type="text"
                className="grow bg-transparent focus:outline-none"
                placeholder="Username"
                autoComplete="username"
                {...register("username", {
                  required: "Username is required",
                  minLength: { value: 3, message: "Minimum 3 characters" },
                  maxLength: { value: 20, message: "Maximum 20 characters" },
                })}
              />
            </label>
            {errors.username && (
              <p className="text-error text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <EnvelopeIcon className="w-5 h-5 text-base-content/50" />
              <input
                type="email"
                className="grow bg-transparent focus:outline-none"
                placeholder="Email address"
                autoComplete="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
            </label>
            {errors.email && (
              <p className="text-error text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <LockClosedIcon className="w-5 h-5 text-base-content/50" />
              <input
                type={showPassword ? "text" : "password"}
                className="grow bg-transparent focus:outline-none"
                placeholder="Password (min 6 characters)"
                autoComplete="new-password"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Minimum 6 characters" },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-base-content/50 hover:text-base-content"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </label>
            {errors.password && (
              <p className="text-error text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Create Account"
            )}
          </button>

          <p className="text-center text-sm text-base-content/70">
            Already have an account?{" "}
            <span
              className="text-primary font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Sign in
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
