import { createContext, useContext, useEffect } from "react";
import { useSocketStore } from "../store/useSocketStore";
import { useUserStore } from "../store/userStore";
import apiClient from "../api/apiInstance";
import { LOGOUT } from "../api/endPoints";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { connectSocket, disconnectSocket } = useSocketStore();
  const { setCurrentUser, setToken, setIsLoggedIn, isLoggedIn, logout } =
    useUserStore();

  useEffect(() => {
    if (isLoggedIn) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isLoggedIn]);

  const login = ({ user, token }) => {
    setCurrentUser(user);
    setToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post(LOGOUT);
    } catch (_) {}
    disconnectSocket();
    logout();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
