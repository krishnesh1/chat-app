import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Search, X, CheckCheck, Check, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { formatMessageTime } from "../lib/utils";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = users
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))
    .filter((user) =>
      user.fullName.toLowerCase().includes(search.toLowerCase())
    );

  if (isUsersLoading) return <SidebarSkeleton />;

  const onlineCount = Math.max(0, onlineUsers.length - 1);
  const totalUnreadCount = users.reduce((acc, u) => acc + (u.unreadCount || 0), 0);

  return (
    <aside
      className={`h-full border-r border-base-300/80 bg-base-100/70 backdrop-blur-2xl flex flex-col transition-all duration-300 select-none ${
        isCollapsed ? "w-20" : "w-20 sm:w-72 md:w-80"
      }`}
    >
      {/* Top Header */}
      <div className="border-b border-base-300/80 p-3 sm:p-4 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative">
              <Users className="size-4" />
              {totalUnreadCount > 0 && isCollapsed && (
                <span className="absolute -top-1 -right-1 size-3 bg-emerald-500 rounded-full ring-2 ring-base-100 animate-pulse" />
              )}
            </div>
            <div className={`hidden ${isCollapsed ? "" : "sm:flex"} items-center gap-2`}>
              <span className="font-bold text-base tracking-tight">Messages</span>
              {totalUnreadCount > 0 && (
                <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {totalUnreadCount} new
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div
              className={`hidden ${
                isCollapsed ? "" : "sm:flex"
              } items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineCount} online</span>
            </div>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content hidden sm:flex"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Contact Search Bar */}
        <div className={`hidden ${isCollapsed ? "" : "sm:block"} relative`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-base-content/40" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm w-full pl-9 pr-8 rounded-xl text-xs bg-base-200/60 border-base-300/60 focus:border-primary/50 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Online filter toggle */}
        <div className={`hidden ${isCollapsed ? "" : "sm:flex"} items-center justify-between text-xs`}>
          <label className="cursor-pointer flex items-center gap-2 font-medium text-base-content/70 hover:text-base-content">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-xs checkbox-primary rounded-md"
            />
            <span>Online contacts only</span>
          </label>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4 text-xs text-base-content/50">
            <div className="size-10 rounded-full bg-base-200/70 mx-auto mb-2 flex items-center justify-center text-base-content/30">
              <Users className="size-5" />
            </div>
            <p className="font-medium">No contacts found</p>
            {search && <p className="text-[10px] mt-1 text-base-content/40">Try a different name</p>}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedUser?._id === user._id;
            const isOnline = onlineUsers.includes(user._id);
            const unread = user.unreadCount || 0;
            const lastMsg = user.lastMessage;
            const isMyLastMsg = lastMsg && lastMsg.senderId === authUser._id;

            return (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`
                  w-full p-2 sm:p-2.5 flex items-center gap-3 rounded-2xl transition-all duration-200 relative group
                  ${
                    isSelected
                      ? "bg-primary text-primary-content shadow-md shadow-primary/20 font-medium"
                      : unread > 0
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10 text-base-content border border-emerald-500/20"
                      : "hover:bg-base-200/60 text-base-content"
                  }
                `}
              >
                {/* Avatar with Status Pulse & Unread Pill */}
                <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                  <div className="size-11 sm:size-12 rounded-2xl overflow-hidden border border-base-300 shadow-xs">
                    <img
                      src={user.profilePic ? user.profilePic.replace(/\.heic$/i, ".jpg") : "/avatar.png"}
                      alt={user.fullName}
                      className="size-full object-cover"
                    />
                  </div>

                  {/* Online dot */}
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full ring-2 ring-base-100" />
                  )}

                  {/* Unread badge on avatar in compact mode */}
                  {unread > 0 && isCollapsed && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold size-5 rounded-full flex items-center justify-center ring-2 ring-base-100 shadow-md animate-bounce">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>

                {/* User info, last message snippet & Unread count badge */}
                <div className={`hidden ${isCollapsed ? "" : "sm:block"} text-left min-w-0 flex-1`}>
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-sm font-semibold truncate leading-tight ${
                        unread > 0 ? "text-emerald-500 dark:text-emerald-400 font-bold" : ""
                      }`}
                    >
                      {user.fullName}
                    </h4>

                    {lastMsg && (
                      <span
                        className={`text-[10px] shrink-0 ${
                          isSelected
                            ? "text-primary-content/80"
                            : unread > 0
                            ? "text-emerald-500 font-bold"
                            : "text-base-content/40"
                        }`}
                      >
                        {formatMessageTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Last message snippet and unread counter badge */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p
                      className={`text-xs truncate flex items-center gap-1 ${
                        isSelected
                          ? "text-primary-content/85"
                          : unread > 0
                          ? "text-base-content font-medium"
                          : "text-base-content/50"
                      }`}
                    >
                      {lastMsg ? (
                        <>
                          {isMyLastMsg && (
                            <span className="inline-flex items-center">
                              {lastMsg.status === "read" ? (
                                <CheckCheck className="size-3 text-sky-400 inline" />
                              ) : (
                                <Check className="size-3 opacity-60 inline" />
                              )}
                            </span>
                          )}
                          <span className="truncate">
                            {lastMsg.isDeleted
                              ? "🚫 Message deleted"
                              : lastMsg.hasImage
                              ? "📷 Photo"
                              : lastMsg.hasAudio
                              ? "🎙️ Voice message"
                              : lastMsg.text || "Message"}
                          </span>
                        </>
                      ) : (
                        <span className="italic opacity-60">
                          {isOnline ? "Active now" : "Offline"}
                        </span>
                      )}
                    </p>

                    {/* Unread Counter Badge (WhatsApp Green Badge) */}
                    {unread > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 min-w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/40">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
