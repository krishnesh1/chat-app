import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ImageLightbox from "./ImageLightbox";
import ForwardModal from "./ForwardModal";
import AudioMessage from "./AudioMessage";
import { formatMessageTime, downloadImage } from "../lib/utils";
import {
  Download,
  Share2,
  ZoomIn,
  Copy,
  Check,
  CheckCheck,
  Reply,
  Star,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Smile,
} from "lucide-react";
import toast from "react-hot-toast";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    setReplyingTo,
    reactToMessage,
    deleteMessage,
    toggleStarMessage,
    markViewOnceAsViewed,
    searchQuery,
    showStarredOnly,
  } = useChatStore();
  const { authUser, socket, onlineUsers } = useAuthStore();

  const messageEndRef = useRef(null);
  const messageRefs = useRef({});
  const [typingUser, setTypingUser] = useState("");

  // Modals and interactive states
  const [lightboxImage, setLightboxImage] = useState(null);
  const [forwardMessageData, setForwardMessageData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeReactionMenuId, setActiveReactionMenuId] = useState(null);
  const [revealedSecrets, setRevealedSecrets] = useState({});

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    socket.on("typing", ({ senderName, senderId, receiverId }) => {
      if (receiverId === authUser._id && senderId === selectedUser._id) {
        setTypingUser(senderName);
      }
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      if (receiverId === authUser._id && senderId === selectedUser._id) {
        setTypingUser("");
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [socket, selectedUser, authUser]);

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Message copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (e, url) => {
    e.stopPropagation();
    downloadImage(url);
  };

  const scrollToMessage = (messageId) => {
    const el = messageRefs.current[messageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-2xl");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "rounded-2xl");
      }, 1500);
    }
  };

  const toggleSecretReveal = (id) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter messages by search and starred
  const filteredMessages = messages.filter((m) => {
    if (showStarredOnly && !m.isStarredBy?.includes(authUser._id)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hasText = m.text?.toLowerCase().includes(q);
      return hasText;
    }
    return true;
  });

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-base-100/50">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100/40 relative">
      <ChatHeader />

      {/* Messages Scroll Area with Premium Ambient Wallpaper */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-radial from-base-200/10 via-base-100/40 to-base-200/20">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-base-content/50 gap-2">
            <div className="size-16 rounded-full bg-base-200 flex items-center justify-center text-2xl">
              {showStarredOnly ? "⭐" : searchQuery ? "🔍" : "👋"}
            </div>
            <p className="font-semibold text-sm">
              {showStarredOnly
                ? "No starred messages"
                : searchQuery
                ? "No messages match your search"
                : "No messages yet"}
            </p>
            <p className="text-xs text-base-content/40">
              {showStarredOnly
                ? "Star messages to access them easily here"
                : searchQuery
                ? `Try a different keyword for "${searchQuery}"`
                : `Say hello to ${selectedUser.fullName}!`}
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isMe = message.senderId === authUser._id;
            const imageUrl = message.image ? message.image.replace(/\.heic$/i, ".jpg") : null;
            const isStarred = message.isStarredBy?.includes(authUser._id);
            const isViewOnceOpened =
              message.isViewOnce &&
              (message.viewedBy?.includes(authUser._id) || (isMe && message.viewedBy?.length > 0));
            const isSecretRevealed = revealedSecrets[message._id];

            // Group reactions by emoji
            const reactionCounts = (message.reactions || []).reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {});
            const myReactions = (message.reactions || [])
              .filter((r) => r.userId === authUser._id)
              .map((r) => r.emoji);

            return (
              <div
                key={message._id}
                ref={(el) => {
                  if (el) messageRefs.current[message._id] = el;
                }}
                className={`chat ${isMe ? "chat-end" : "chat-start"} group/msg relative transition-all duration-300`}
              >
                {/* Avatar */}
                <div className="chat-image avatar">
                  <div className="size-8 sm:size-9 rounded-full border border-base-300 overflow-hidden shadow-xs">
                    <img
                      src={
                        (isMe ? authUser.profilePic : selectedUser.profilePic)
                          ? (isMe ? authUser.profilePic : selectedUser.profilePic).replace(
                              /\.heic$/i,
                              ".jpg"
                            )
                          : "/avatar.png"
                      }
                      alt="avatar"
                      className="size-full object-cover"
                    />
                  </div>
                </div>

                {/* Message Header (Time & Real-Time WhatsApp Ticks) */}
                <div className="chat-header mb-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-base-content/50">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isStarred && <Star className="size-2.5 text-amber-500 fill-amber-500 inline" />}
                  {isMe && (
                    <span className="inline-flex items-center">
                      {message.status === "read" ? (
                        <CheckCheck
                          className="size-4 text-sky-400 font-black shrink-0 drop-shadow-[0_0_2px_rgba(56,189,248,0.6)]"
                          title="Seen by recipient (Double blue ticks)"
                        />
                      ) : message.status === "delivered" || onlineUsers.includes(selectedUser._id) ? (
                        <CheckCheck
                          className="size-4 text-base-content/60 shrink-0"
                          title="Delivered - User is online (Double grey ticks)"
                        />
                      ) : (
                        <Check
                          className="size-3.5 text-base-content/40 shrink-0"
                          title="Sent - User is offline (Single grey tick)"
                        />
                      )}
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`chat-bubble relative flex flex-col p-3 rounded-2xl shadow-sm max-w-[85%] sm:max-w-[75%] ${
                    message.isDeleted
                      ? "bg-base-200/50 text-base-content/50 italic border border-base-300/40"
                      : isMe
                      ? "bg-gradient-to-br from-primary via-primary to-primary/95 text-primary-content rounded-tr-xs shadow-md shadow-primary/10"
                      : "bg-base-100 dark:bg-base-200/90 text-base-content border border-base-300/70 rounded-tl-xs shadow-xs"
                  }`}
                >
                  {/* QUOTED REPLY PREVIEW (WhatsApp style) */}
                  {message.replyTo && !message.isDeleted && (
                    <div
                      onClick={() => scrollToMessage(message.replyTo._id)}
                      className="mb-2 p-2 rounded-xl bg-black/10 dark:bg-white/10 border-l-4 border-current text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <p className="font-semibold text-[10px] opacity-80">
                        {message.replyTo.senderId === authUser._id ? "You" : selectedUser.fullName}
                      </p>
                      <p className="truncate opacity-75 text-[11px]">
                        {message.replyTo.image
                          ? "📷 Photo"
                          : message.replyTo.audio
                          ? "🎙️ Voice message"
                          : message.replyTo.text || "Message"}
                      </p>
                    </div>
                  )}

                  {/* DELETED MESSAGE */}
                  {message.isDeleted ? (
                    <p className="text-xs italic opacity-70 flex items-center gap-1">
                      <span>🚫</span>
                      <span>This message was deleted</span>
                    </p>
                  ) : (
                    <>
                      {/* VIEW ONCE PHOTO (WhatsApp feature) */}
                      {message.isViewOnce && imageUrl ? (
                        isViewOnceOpened ? (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-medium opacity-60 select-none">
                            <span className="size-5 rounded-full border border-current flex items-center justify-center text-[10px] font-black">
                              1
                            </span>
                            <span>Photo • Opened</span>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setLightboxImage(imageUrl);
                              markViewOnceAsViewed(message._id);
                            }}
                            className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold cursor-pointer transition-all shadow-xs"
                          >
                            <span className="size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                              1
                            </span>
                            <div className="flex flex-col">
                              <span>View once photo</span>
                              <span className="text-[10px] opacity-75 font-normal">Tap to view</span>
                            </div>
                          </div>
                        )
                      ) : (
                        /* STANDARD IMAGE ATTACHMENT */
                        imageUrl && (
                          <div
                            className={`relative group/img rounded-xl overflow-hidden mb-2 border border-black/10 bg-black/5 ${
                              message.isSecret && !isSecretRevealed
                                ? "filter blur-lg select-none cursor-pointer"
                                : ""
                            }`}
                            onClick={() => {
                              if (message.isSecret && !isSecretRevealed) {
                                toggleSecretReveal(message._id);
                              }
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt="Attachment"
                              onClick={() => !message.isSecret || isSecretRevealed ? setLightboxImage(imageUrl) : null}
                              className="w-full max-h-80 object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                            />

                            {/* Floating Action Overlay on Image */}
                            {(!message.isSecret || isSecretRevealed) && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2.5 pointer-events-none">
                                <span className="text-[10px] text-white/90 font-medium bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                  Click to expand
                                </span>

                                <div className="flex items-center gap-1.5 pointer-events-auto">
                                  <button
                                    onClick={(e) => handleDownload(e, imageUrl)}
                                    className="btn btn-xs btn-circle bg-black/60 hover:bg-black/90 text-white border-white/20"
                                    title="Save to device"
                                  >
                                    <Download className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForwardMessageData(message);
                                    }}
                                    className="btn btn-xs btn-circle bg-black/60 hover:bg-black/90 text-white border-white/20"
                                    title="Forward photo"
                                  >
                                    <Share2 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setLightboxImage(imageUrl)}
                                    className="btn btn-xs btn-circle bg-black/60 hover:bg-black/90 text-white border-white/20"
                                    title="View full screen"
                                  >
                                    <ZoomIn className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}

                      {/* VOICE AUDIO MESSAGE (WhatsApp feature) */}
                      {message.audio && (
                        <div
                          className={
                            message.isSecret && !isSecretRevealed
                              ? "filter blur-md select-none cursor-pointer"
                              : ""
                          }
                          onClick={() => {
                            if (message.isSecret && !isSecretRevealed) {
                              toggleSecretReveal(message._id);
                            }
                          }}
                        >
                          <AudioMessage audioUrl={message.audio} isMe={isMe} />
                        </div>
                      )}

                      {/* TEXT CONTENT WITH SECRET/SPOILER MODE (Unique Feature) */}
                      {message.text && (
                        <div
                          onClick={() => {
                            if (message.isSecret && !isSecretRevealed) {
                              toggleSecretReveal(message._id);
                            }
                          }}
                          className={`relative ${
                            message.isSecret && !isSecretRevealed
                              ? "filter blur-sm select-none cursor-pointer bg-black/20 p-2 rounded-lg"
                              : ""
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                        </div>
                      )}

                      {/* SECRET/CONFIDENTIAL REVEAL INDICATOR */}
                      {message.isSecret && (
                        <div
                          onClick={() => toggleSecretReveal(message._id)}
                          className="mt-1 flex items-center gap-1 text-[10px] opacity-75 cursor-pointer hover:underline"
                        >
                          <Lock className="size-3" />
                          <span>
                            {isSecretRevealed ? "Secret revealed (Tap to blur)" : "Confidential • Tap to reveal"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* EMOJI REACTION PILLS UNDER BUBBLE (WhatsApp style) */}
                {Object.keys(reactionCounts).length > 0 && !message.isDeleted && (
                  <div
                    className={`flex items-center gap-1 mt-1 flex-wrap ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {Object.entries(reactionCounts).map(([emoji, count]) => {
                      const hasReacted = myReactions.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => reactToMessage(message._id, emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shadow-xs transition-transform active:scale-90 ${
                            hasReacted
                              ? "bg-primary/20 border-primary/40 text-primary font-bold"
                              : "bg-base-200/80 border-base-300/80 text-base-content/80 hover:bg-base-200"
                          }`}
                          title={hasReacted ? "Click to remove reaction" : "Click to react"}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-semibold">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* FLOATING ACTION TOOLBAR ON HOVER */}
                {!message.isDeleted && (
                  <div
                    className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 z-20 ${
                      isMe ? "right-14" : "left-14"
                    }`}
                  >
                    <div className="bg-base-200/95 backdrop-blur-md border border-base-300 rounded-xl px-1.5 py-0.5 shadow-xl flex items-center gap-1">
                      {/* Quick React Picker Trigger */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveReactionMenuId(
                              activeReactionMenuId === message._id ? null : message._id
                            )
                          }
                          className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary"
                          title="React"
                        >
                          <Smile className="size-3.5" />
                        </button>

                        {/* Quick Reaction Bar Popover */}
                        {activeReactionMenuId === message._id && (
                          <div className="absolute bottom-full mb-1 left-0 bg-base-100/95 backdrop-blur-xl border border-base-300 shadow-2xl rounded-2xl p-1 flex items-center gap-1 z-30 animate-in fade-in zoom-in-95">
                            {QUICK_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  reactToMessage(message._id, emoji);
                                  setActiveReactionMenuId(null);
                                }}
                                className="text-base p-1 hover:scale-130 active:scale-95 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reply Quoting */}
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary"
                        title="Reply to message"
                      >
                        <Reply className="size-3.5" />
                      </button>

                      {/* Star Message */}
                      <button
                        onClick={() => toggleStarMessage(message._id)}
                        className={`btn btn-ghost btn-xs btn-square ${
                          isStarred ? "text-amber-500" : "text-base-content/70 hover:text-amber-500"
                        }`}
                        title={isStarred ? "Unstar message" : "Star message"}
                      >
                        <Star className={`size-3.5 ${isStarred ? "fill-current" : ""}`} />
                      </button>

                      {/* Forward */}
                      <button
                        onClick={() => setForwardMessageData(message)}
                        className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary"
                        title="Forward message"
                      >
                        <Share2 className="size-3.5" />
                      </button>

                      {/* Copy Text */}
                      {message.text && (
                        <button
                          onClick={() => handleCopyText(message.text, message._id)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-base-content"
                          title="Copy message"
                        >
                          {copiedId === message._id ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      )}

                      {/* Download photo to device */}
                      {imageUrl && !message.isViewOnce && (
                        <button
                          onClick={(e) => handleDownload(e, imageUrl)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-base-content"
                          title="Save to local device"
                        >
                          <Download className="size-3.5" />
                        </button>
                      )}

                      {/* Delete for everyone (Sender only) */}
                      {isMe && (
                        <button
                          onClick={() => deleteMessage(message._id)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-error"
                          title="Delete for everyone"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Real-time Typing Indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 pl-2 text-xs text-base-content/60 animate-fadeIn">
            <span className="loading loading-dots loading-xs text-primary" />
            <span className="italic">{typingUser} is typing...</span>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <MessageInput />

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
        onForward={(data) => {
          setLightboxImage(null);
          setForwardMessageData(data);
        }}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={!!forwardMessageData}
        messageToForward={forwardMessageData}
        onClose={() => setForwardMessageData(null)}
      />
    </div>
  );
};

export default ChatContainer;
