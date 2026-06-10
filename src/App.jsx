import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import Navbar from "./shared/Navbar";
import AppRoutes from "./routes/Approutes";
import { useTheme } from "./store/useTheme";
import { AuthProvider } from "./context/AuthContext";
import { setQueryClientRef } from "./store/useSocketStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

setQueryClientRef(queryClient);

export default function App() {
  const { theme } = useTheme();

  return (
    <div data-theme={theme}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Router future={{ v7_startTransition: true }}>
            <Navbar />
            <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: { borderRadius: "10px", fontWeight: 500 },
              }}
            />
          </Router>
        </QueryClientProvider>
      </AuthProvider>
    </div>
  );
}
