import Navbar from "./components/Navbar";
import CallModal from "./components/CallModal";

import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import { useChatStore } from "./store/useChatStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { theme } = useThemeStore();
  const { initCallListeners } = useCallStore();
  const { subscribeToMessages } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (socket) {
      initCallListeners();
      subscribeToMessages();
    }
  }, [socket, initCallListeners, subscribeToMessages]);

  // Handle mobile/browser back-press events for 1-step back navigation
  useEffect(() => {
    if (!useChatStore.getState().selectedUser && window.history.state?.chatAppStep) {
      window.history.replaceState(null, "");
    }

    const handlePopState = (event) => {
      const currentSelectedUser = useChatStore.getState().selectedUser;
      if (currentSelectedUser) {
        if (!event.state || event.state.chatAppStep !== "chat") {
          useChatStore.getState().setSelectedUser(null, false);
        } else if (
          event.state.chatAppStep === "chat" &&
          event.state.userId !== currentSelectedUser._id
        ) {
          const user = useChatStore
            .getState()
            .users.find((u) => u._id === event.state.userId);
          if (user) {
            useChatStore.getState().setSelectedUser(user, false);
          } else {
            useChatStore.getState().setSelectedUser(null, false);
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/chat" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/chat" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/chat" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <CallModal />
      <Toaster />
    </div>
  );
};
export default App;