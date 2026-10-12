import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Image,
  Send,
  X,
  Mic,
  Square,
  Trash2,
  Reply,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);

  const { sendMessage, selectedUser, replyingTo, setReplyingTo } = useChatStore();
  const { authUser, socket } = useAuthStore();

  // Cleanup audio recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleTyping = (e) => {
    setText(e.target.value);

    if (!socket || !selectedUser) return;

    // Send typing event
    socket.emit("typing", {
      receiverId: selectedUser._id,
      senderName: authUser.fullName,
      senderId: authUser._id,
    });

    // Stop typing after 2s of no input
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", {
        receiverId: selectedUser._id,
        senderId: authUser._id,
      });
    }, 2000);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageMime = file.type && file.type.startsWith("image/");
    const isImageExt = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg|tiff|ico|jfif)$/i.test(file.name);

    if (!isImageMime && !isImageExt) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Image size must be less than 50MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setIsViewOnce(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ===== AUDIO RECORDING METHODS =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access error:", error);
      toast.error("Microphone access denied or not available");
    }
  };

  const cancelRecording = () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const finishAndSendAudio = () => {
    if (!mediaRecorderRef.current) return;

    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        try {
          await sendMessage({
            audio: base64Audio,
            isSecret,
          });
          setIsSecret(false);
        } catch {
          toast.error("Failed to send voice note");
        }
      };
      reader.readAsDataURL(audioBlob);

      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingDuration(0);
    };

    mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // ===== SEND TEXT / IMAGE MESSAGE =====
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        isViewOnce,
        isSecret,
      });

      setText("");
      setImagePreview(null);
      setIsViewOnce(false);
      setIsSecret(false);
      setShowAiSuggestions(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      socket?.emit("stopTyping", {
        receiverId: selectedUser._id,
        senderId: authUser._id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const quickReplies = [
    "Sounds great! Let's do it. 👍",
    "On my way right now! 🚗💨",
    "Can you share more details? 📄",
    "Thanks a lot for the update! 🙌",
    "Let's talk soon! ✨",
  ];

  return (
    <div className="p-2 sm:p-3 md:p-4 w-full flex-shrink-0 border-t border-base-300/60 bg-base-100/70 backdrop-blur-md relative">
      {/* 1. QUOTED REPLY PREVIEW BANNER */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between bg-base-200/90 border-l-4 border-primary px-3 py-1.5 rounded-r-xl border border-base-300/70 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 overflow-hidden text-xs">
            <Reply className="size-3.5 text-primary shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-primary block text-[11px]">
                Replying to{" "}
                {replyingTo.senderId === authUser._id ? "yourself" : selectedUser.fullName}
              </span>
              <span className="text-base-content/70 truncate block">
                {replyingTo.image
                  ? "📷 Photo"
                  : replyingTo.audio
                  ? "🎙️ Voice message"
                  : replyingTo.text || "Message"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content shrink-0"
            title="Cancel reply"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 2. IMAGE PREVIEW WITH VIEW ONCE (1) TOGGLE */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-3 bg-base-200/90 p-2.5 rounded-2xl border border-base-300/80 w-fit max-w-full animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-md">
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className="size-16 object-cover rounded-xl border border-primary/30 shadow-xs"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-error text-white
              flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform"
              type="button"
              title="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>

          <div className="text-xs pr-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                High Quality
              </span>
              {/* WhatsApp View Once "1" Badge Toggle */}
              <button
                type="button"
                onClick={() => setIsViewOnce(!isViewOnce)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] transition-all border ${
                  isViewOnce
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                    : "bg-base-300 text-base-content/70 border-base-content/10 hover:border-emerald-500/50"
                }`}
                title="View Once: Photo can be viewed only once"
              >
                <span className="size-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-black">
                  1
                </span>
                <span>{isViewOnce ? "View Once Active" : "View Once"}</span>
              </button>
            </div>
            <p className="text-[11px] text-base-content/60">
              {isViewOnce ? "Recipient can open this photo only once" : "Standard high-resolution upload"}
            </p>
          </div>
        </div>
      )}

      {/* 3. AI SMART REPLIES POPUP */}
      {showAiSuggestions && (
        <div className="absolute bottom-full left-4 mb-2 bg-base-100/95 backdrop-blur-xl border border-primary/30 shadow-2xl rounded-2xl p-3 w-80 max-w-[calc(100vw-2rem)] z-30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-base-300/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              <span>Smart AI Quick Replies</span>
            </div>
            <button
              onClick={() => setShowAiSuggestions(false)}
              className="btn btn-ghost btn-circle btn-xs"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setText(reply);
                  setShowAiSuggestions(false);
                }}
                className="text-left text-xs p-2 rounded-xl bg-base-200/60 hover:bg-primary hover:text-white transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN INPUT / AUDIO RECORDING ROW */}
      {isRecording ? (
        /* LIVE AUDIO RECORDING BAR (WhatsApp style) */
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="size-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-sm font-semibold text-red-500">
              {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-xs text-base-content/60 hidden sm:inline">
              Recording voice note...
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Trash / Cancel */}
            <button
              type="button"
              onClick={cancelRecording}
              className="btn btn-circle btn-sm btn-ghost text-error hover:bg-error/20"
              title="Cancel recording"
            >
              <Trash2 className="size-4" />
            </button>

            {/* Finish & Send */}
            <button
              type="button"
              onClick={finishAndSendAudio}
              className="btn btn-circle btn-sm btn-primary shadow-md"
              title="Send voice note"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD INPUT FORM */
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-2 bg-base-200/60 hover:bg-base-200/80 transition-colors rounded-2xl px-2 sm:px-3 py-1.5 border border-base-300/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            {/* Attach Image button */}
            <button
              type="button"
              className={`btn btn-xs sm:btn-sm btn-ghost btn-circle shrink-0 transition-all ${
                imagePreview ? "text-primary bg-primary/10" : "text-base-content/60 hover:text-primary"
              }`}
              onClick={() => fileInputRef.current?.click()}
              title="Attach high quality photo or camera image"
            >
              <Image className="size-4 sm:size-5" />
            </button>

            {/* Secret Whisper Toggle (Unique Feature) */}
            <button
              type="button"
              onClick={() => setIsSecret(!isSecret)}
              className={`btn btn-xs sm:btn-sm btn-ghost btn-circle shrink-0 transition-all ${
                isSecret ? "text-amber-500 bg-amber-500/10" : "text-base-content/60 hover:text-amber-500"
              }`}
              title={isSecret ? "Confidential/Spoiler blur ACTIVE" : "Make message confidential/spoiler"}
            >
              {isSecret ? <Lock className="size-4" /> : <EyeOff className="size-4" />}
            </button>

            {/* AI Smart Assist */}
            <button
              type="button"
              onClick={() => setShowAiSuggestions(!showAiSuggestions)}
              className={`btn btn-xs sm:btn-sm btn-ghost btn-circle shrink-0 transition-all ${
                showAiSuggestions ? "text-primary bg-primary/10" : "text-base-content/60 hover:text-primary"
              }`}
              title="Smart AI replies & tone polish"
            >
              <Sparkles className="size-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              className="w-full min-w-0 bg-transparent border-0 outline-none focus:outline-none text-xs sm:text-base placeholder:text-base-content/40 px-1 py-1"
              placeholder={isSecret ? "Type confidential message..." : "Type a message..."}
              value={text}
              onChange={handleTyping}
            />

            {/* Mic / Voice Note Record Button */}
            {!text.trim() && !imagePreview && (
              <button
                type="button"
                onClick={startRecording}
                className="btn btn-xs sm:btn-sm btn-ghost btn-circle shrink-0 text-base-content/60 hover:text-primary hover:bg-primary/10 transition-all"
                title="Record voice note"
              >
                <Mic className="size-4 sm:size-5" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            className={`btn btn-sm sm:btn-md btn-circle shadow-md shrink-0 transition-all ${
              text.trim() || imagePreview
                ? "btn-primary hover:scale-105 active:scale-95"
                : "btn-ghost text-base-content/30 cursor-not-allowed"
            }`}
            disabled={!text.trim() && !imagePreview}
            title="Send message"
          >
            <Send className="size-4 sm:size-5" />
          </button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;
