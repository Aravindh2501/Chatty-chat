import {
  ChatBubbleBottomCenterTextIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../store/useTheme";
import { THEMES } from "../content/data";
import { useAuth } from "../context/AuthContext";
import { useUserStore } from "../store/userStore";

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const currentUser = useUserStore((state) => state.currentUser);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="w-full flex justify-between items-center px-4 sm:px-6 py-3 fixed top-0 z-50 shadow-sm bg-base-200/90 backdrop-blur-md border-b border-base-300">
      <button
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="p-1.5 rounded-lg bg-primary/10">
          <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-primary">Chatty</h1>
      </button>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="btn btn-sm btn-ghost border border-base-300 capitalize text-xs"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {theme}
          </button>
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-44 bg-base-100 border border-base-300 rounded-xl shadow-xl z-50"
              role="listbox"
            >
              <ul className="text-sm max-h-64 overflow-y-auto p-1">
                {THEMES.map((t) => (
                  <li
                    key={t}
                    role="option"
                    aria-selected={theme === t}
                    onClick={() => {
                      setTheme(t);
                      setDropdownOpen(false);
                    }}
                    className={`cursor-pointer px-3 py-2 rounded-lg capitalize transition-colors text-xs ${
                      theme === t
                        ? "bg-primary/15 text-primary font-semibold"
                        : "hover:bg-base-200"
                    }`}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {currentUser && (
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-primary gap-1.5"
            title="Sign out"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
