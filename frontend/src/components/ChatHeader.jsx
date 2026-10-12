import { X, Phone, Video, Search, Star } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    searchQuery,
    setSearchQuery,
    showStarredOnly,
    setShowStarredOnly,
  } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();

  const [isTyping, setIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    socket.on("typing", (data) => {
      if (data.senderId === selectedUser._id) {
        setIsTyping(true);
      }
    });

    socket.on("stopTyping", (data) => {
      if (data.senderId === selectedUser._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [socket, selectedUser]);

  const handleCall = (type) => {
    toast(`📞 ${type} call feature coming in the next update!`, {
      icon: "⚡",
    });
  };

  return (
    <div className="px-4 py-3 border-b border-base-300/60 bg-base-100/70 backdrop-blur-md flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar with status indicator */}
          <div className="relative">
            <div className="size-10 sm:size-11 rounded-full overflow-hidden ring-2 ring-base-300/80 shadow-xs">
              <img
                src={selectedUser.profilePic ? selectedUser.profilePic.replace(/\.heic$/i, ".jpg") : "/avatar.png"}
                alt={selectedUser.fullName}
                className="size-full object-cover"
              />
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full ring-2 ring-base-100 animate-pulse" />
            )}
          </div>

          {/* User info */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base leading-tight">
              {selectedUser.fullName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isTyping ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-primary font-medium">typing</span>
                  <span className="flex gap-0.5">
                    <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1 rounded-full bg-primary animate-bounce" />
                  </span>
                </div>
              ) : (
                <span
                  className={`text-xs font-medium ${
                    isOnline ? "text-emerald-500" : "text-base-content/40"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Starred Messages Filter (WhatsApp style) */}
          <button
            type="button"
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={`btn btn-circle btn-sm transition-all ${
              showStarredOnly
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "btn-ghost text-base-content/60 hover:text-amber-500"
            }`}
            title={showStarredOnly ? "Showing Starred Messages only" : "View Starred Messages"}
          >
            <Star className={`size-4 ${showStarredOnly ? "fill-current" : ""}`} />
          </button>

          {/* In-Chat Search Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
            className={`btn btn-circle btn-sm transition-all ${
              showSearch
                ? "bg-primary text-white hover:bg-primary/90"
                : "btn-ghost text-base-content/60 hover:text-primary"
            }`}
            title="Search messages"
          >
            <Search className="size-4" />
          </button>

          {/* Call buttons */}
          <button
            type="button"
            onClick={() => handleCall("Voice")}
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-primary transition-colors hidden sm:flex"
            title="Voice call"
          >
            <Phone className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleCall("Video")}
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-primary transition-colors hidden sm:flex"
            title="Video call"
          >
            <Video className="size-4" />
          </button>

          {/* Close chat button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-error hover:bg-error/10 transition-colors ml-1"
            title="Close chat"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>
      </div>

      {/* In-chat search bar dropdown */}
      {showSearch && (
        <div className="mt-2 pt-2 border-t border-base-300/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm w-full pl-8 pr-8 rounded-xl bg-base-200/70 border-base-300/60 focus:border-primary text-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
