import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  replyingTo: null,
  searchQuery: "",
  showStarredOnly: false,

  setReplyingTo: (message) => set({ replyingTo: message }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowStarredOnly: (val) => set({ showStarredOnly: val }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, users, replyingTo } = get();
    try {
      const payload = {
        ...messageData,
        replyTo: replyingTo ? replyingTo._id : undefined,
      };

      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);

      // Update sidebar last message and sort to top
      const updatedUsers = users.map((u) => {
        if (u._id === selectedUser._id) {
          return {
            ...u,
            lastMessage: {
              text: res.data.text,
              hasImage: Boolean(res.data.image),
              hasAudio: Boolean(res.data.audio),
              createdAt: res.data.createdAt,
              senderId: res.data.senderId,
              status: res.data.status,
            },
          };
        }
        return u;
      });

      updatedUsers.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      set({
        messages: [...messages, res.data],
        users: updatedUsers,
        replyingTo: null,
      });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to send message");
      return false;
    }
  },

  forwardMessage: async (targetUserId, messageData) => {
    try {
      const res = await axiosInstance.post(`/messages/send/${targetUserId}`, messageData);
      const { selectedUser, messages } = get();
      if (selectedUser && selectedUser._id === targetUserId) {
        set({ messages: [...messages, res.data] });
      }
      toast.success("Message forwarded successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to forward message");
      return false;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({
        messages: get().messages.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: "This message was deleted", image: null, audio: null }
            : m
        ),
      });
      toast.success("Message deleted for everyone");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  toggleStarMessage: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/star/${messageId}`);
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, isStarredBy: res.data.isStarredBy } : m
        ),
      });
    } catch (error) {
      console.error("Failed to star message:", error);
    }
  },

  markViewOnceAsViewed: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/view-once/${messageId}`);
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, viewedBy: res.data.viewedBy } : m
        ),
      });
    } catch (error) {
      console.error("Failed to mark view once:", error);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();
      const isFromCurrentChat = selectedUser && selectedUser._id === newMessage.senderId;

      if (isFromCurrentChat) {
        // Chat is currently open: append and mark read in real time
        set({
          messages: [...messages, newMessage],
          users: users.map((u) => {
            if (u._id === newMessage.senderId) {
              return {
                ...u,
                unreadCount: 0,
                lastMessage: {
                  text: newMessage.text,
                  hasImage: Boolean(newMessage.image),
                  hasAudio: Boolean(newMessage.audio),
                  createdAt: newMessage.createdAt,
                  senderId: newMessage.senderId,
                  status: "read",
                },
              };
            }
            return u;
          }),
        });

        // Mark read in DB and trigger blue ticks
        axiosInstance.put(`/messages/read/${newMessage.senderId}`).catch(() => {});
      } else {
        // Message came UNSEEN from another contact: increment unread count & sort
        const updatedUsers = users.map((u) => {
          if (u._id === newMessage.senderId) {
            return {
              ...u,
              unreadCount: (u.unreadCount || 0) + 1,
              lastMessage: {
                text: newMessage.text,
                hasImage: Boolean(newMessage.image),
                hasAudio: Boolean(newMessage.audio),
                createdAt: newMessage.createdAt,
                senderId: newMessage.senderId,
                status: newMessage.status,
              },
            };
          }
          return u;
        });

        // Move contact with fresh unread message to top of list
        updatedUsers.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        set({ users: updatedUsers });
      }
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: "This message was deleted", image: null, audio: null }
            : m
        ),
      });
    });

    socket.on("messageViewedOnce", ({ messageId, viewedBy }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, viewedBy } : m
        ),
      });
    });

    socket.on("messagesRead", ({ readerId }) => {
      const { selectedUser, messages, users } = get();
      if (selectedUser && readerId === selectedUser._id) {
        // All sent messages to this user have been read -> double blue ticks!
        set({
          messages: messages.map((m) => ({ ...m, status: "read" })),
        });
      }

      set({
        users: users.map((u) => {
          if (u._id === readerId && u.lastMessage) {
            return {
              ...u,
              lastMessage: { ...u.lastMessage, status: "read" },
            };
          }
          return u;
        }),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageReaction");
    socket.off("messageDeleted");
    socket.off("messageViewedOnce");
    socket.off("messagesRead");
  },

  setSelectedUser: (selectedUser) => {
    if (selectedUser) {
      // Clear unread count for this user in sidebar & mark read on server
      const updatedUsers = get().users.map((u) =>
        u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u
      );
      set({
        selectedUser,
        users: updatedUsers,
        replyingTo: null,
        searchQuery: "",
        showStarredOnly: false,
      });

      axiosInstance.put(`/messages/read/${selectedUser._id}`).catch(() => {});
    } else {
      set({ selectedUser: null, replyingTo: null, searchQuery: "", showStarredOnly: false });
    }
  },
}));
