import {
  ChatBubbleBottomCenterTextIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import AuthImagePattern from "./AuthImagePattern";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LOGIN } from "../api/endPoints";
import apiClient from "../api/apiInstance";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await apiClient.post(LOGIN, data);
      if (res?.data?.token) {
        const { user, token, msg } = res.data;
        login({ user, token });
        toast.success(msg || "Welcome back!");
        navigate("/");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.error || "Login failed. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="w-screen h-screen grid lg:grid-cols-2 bg-base-100">
      <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
        <div className="flex flex-col items-center gap-3">
          <div className="border border-primary p-4 rounded-2xl shadow-lg bg-base-200">
            <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-primary animate-bounce" />
          </div>
          <h1 className="text-4xl font-extrabold text-center">Welcome back 👋</h1>
          <p className="text-base-content/60 text-center">
            Sign in to continue chatting
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <EnvelopeIcon className="w-5 h-5 text-base-content/50" />
              <input
                type="email"
                className="grow bg-transparent focus:outline-none"
                placeholder="Email address"
                autoComplete="email"
                {...register("email", { required: "Email is required" })}
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
                placeholder="Password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
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
              "Sign In"
            )}
          </button>

          <p className="text-center text-sm text-base-content/70">
            Don&apos;t have an account?{" "}
            <span
              className="text-primary font-semibold cursor-pointer hover:underline"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>
        </form>
      </div>

      <div className="hidden lg:block">
        <AuthImagePattern
          title="Hello again!"
          subtitle="Your conversations are waiting. Let's catch up."
        />
      </div>
    </div>
  );
};

export default Login;
