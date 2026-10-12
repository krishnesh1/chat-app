import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Search, Share2, Send, Check, ImageIcon } from "lucide-react";

const ForwardModal = ({ isOpen, onClose, messageToForward }) => {
  const { users, forwardMessage } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId(null);
      setSearch("");
      setIsSending(false);
    }
  }, [isOpen]);

  if (!isOpen || !messageToForward) return null;

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = users.find((u) => u._id === selectedUserId);
  const isMultiple = Array.isArray(messageToForward);
  const messageCount = isMultiple ? messageToForward.length : 1;
  const firstMessage = isMultiple ? messageToForward[0] : messageToForward;

  const handleForward = async () => {
    if (!selectedUserId || isSending) return;

    setIsSending(true);
    let success = false;
    if (isMultiple) {
      for (const msg of messageToForward) {
        await forwardMessage(selectedUserId, {
          text: msg.text || "",
          image: msg.image || null,
        });
      }
      success = true;
    } else {
      success = await forwardMessage(selectedUserId, {
        text: messageToForward.text || "",
        image: messageToForward.image || null,
      });
    }
    setIsSending(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-base-100 border border-base-300 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isMultiple ? `Forward ${messageCount} Messages` : "Forward Message"}
              </h3>
              <p className="text-xs text-base-content/60">Choose a contact to share with</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="size-4" />
          </button>
        </div>

        {/* Message Preview Chip */}
        <div className="px-5 py-3 bg-base-200/50 border-b border-base-300/60 flex items-center gap-3">
          {isMultiple ? (
            <div className="size-10 rounded-xl bg-primary text-primary-content flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
              {messageCount}
            </div>
          ) : firstMessage?.image ? (
            <div className="relative size-12 rounded-xl overflow-hidden border border-base-300 flex-shrink-0 bg-base-300">
              <img
                src={firstMessage.image}
                alt="Forward preview"
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <ImageIcon className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase text-primary tracking-wider">
              {isMultiple
                ? `${messageCount} Messages Selected`
                : firstMessage?.image
                ? "Photo Attachment"
                : "Text Message"}
            </span>
            <p className="text-xs text-base-content/80 truncate">
              {isMultiple
                ? `${firstMessage?.text || "Message"} and ${messageCount - 1} more`
                : firstMessage?.text || "(Image with no caption)"}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-base-300/60">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm sm:input-md input-bordered w-full pl-10 rounded-2xl bg-base-200/50 text-xs sm:text-sm focus:outline-primary"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-xs text-base-content/50">
              No contacts found
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserId === user._id;
              const isOnline = onlineUsers.includes(user._id);

              return (
                <div
                  key={user._id}
                  onClick={() => setSelectedUserId(user._id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/15 border border-primary/40 shadow-sm"
                      : "hover:bg-base-200/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="size-11 rounded-full overflow-hidden border border-base-300">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="size-full object-cover"
                        />
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full ring-2 ring-base-100" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm leading-tight">{user.fullName}</h4>
                      <p className="text-[11px] text-base-content/60">
                        {isOnline ? (
                          <span className="text-emerald-500 font-medium">Online</span>
                        ) : (
                          "Offline"
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`size-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-primary text-primary-content border-primary"
                        : "border-base-content/30"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300 flex items-center justify-end gap-2 bg-base-200/30">
          <button onClick={onClose} className="btn btn-sm btn-ghost rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedUserId || isSending}
            className="btn btn-sm btn-primary rounded-xl px-5 gap-2 shadow-md shadow-primary/20"
          >
            {isSending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <>
                <Send className="size-3.5" />
                <span>
                  {selectedUser ? `Send to ${selectedUser.fullName.split(" ")[0]}` : "Forward"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
