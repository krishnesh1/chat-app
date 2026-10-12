import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

const CallModal = () => {
  const {
    callState,
    isVideoCall,
    caller,
    receiver,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    isMinimized,
    setIsMinimized,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  if (callState === "idle") return null;

  const targetPerson = callState === "incoming" ? caller : receiver;
  const avatarUrl = targetPerson?.pic
    ? targetPerson.pic.replace(/\.heic$/i, ".jpg")
    : "/avatar.png";

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  // ===== MINIMIZED FLOATING CALL PILL =====
  if (isMinimized && callState === "connected") {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-base-100/90 backdrop-blur-xl border border-primary/40 shadow-2xl rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform animate-in fade-in"
      >
        <div className="relative">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="size-10 rounded-xl object-cover ring-2 ring-primary"
          />
          <span className="absolute -top-1 -right-1 size-3 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <div className="text-xs pr-2">
          <p className="font-bold text-base-content leading-tight">
            {targetPerson?.name || "Active Call"}
          </p>
          <p className="text-[11px] font-mono text-primary font-semibold">
            {formatDuration(callDuration)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="btn btn-circle btn-xs btn-error text-white"
          title="End Call"
        >
          <PhoneOff className="size-3" />
        </button>
      </div>
    );
  }

  // ===== 1. INCOMING CALL SCREEN =====
  if (callState === "incoming") {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-base-100/90 border border-base-300/80 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
          {/* Ambient glow behind avatar */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Caller Avatar with Pulse */}
          <div className="relative">
            <div className="size-28 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-xl relative z-10">
              <img src={avatarUrl} alt={targetPerson?.name} className="size-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping -z-0" />
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight text-base-content">
              {targetPerson?.name}
            </h3>
            <p className="text-sm text-base-content/60 mt-1 flex items-center justify-center gap-1.5">
              {isVideoCall ? <Video className="size-4 text-primary" /> : <Phone className="size-4 text-emerald-500" />}
              <span>Incoming {isVideoCall ? "Video" : "Voice"} Call...</span>
            </p>
          </div>

          {/* Accept / Decline Buttons */}
          <div className="flex items-center gap-8 pt-2">
            {/* Decline */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={rejectCall}
                className="size-16 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/30 hover:scale-110 active:scale-95 transition-transform"
                title="Decline"
              >
                <PhoneOff className="size-7" />
              </button>
              <span className="text-xs text-base-content/60 font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={answerCall}
                className="size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-transform animate-bounce"
                title="Accept"
              >
                <Phone className="size-7" />
              </button>
              <span className="text-xs text-emerald-500 font-bold">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== 2. OUTGOING CALL SCREEN (Ringing...) =====
  if (callState === "calling") {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-base-100/90 border border-base-300/80 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Receiver Avatar with Pulse */}
          <div className="relative">
            <div className="size-28 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-xl relative z-10">
              <img src={avatarUrl} alt={targetPerson?.fullName} className="size-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse -z-0" />
          </div>

          <div>
            <h3 className="text-xl font-bold tracking-tight text-base-content">
              {targetPerson?.fullName}
            </h3>
            <p className="text-sm text-base-content/60 mt-1 flex items-center justify-center gap-1.5">
              {isVideoCall ? <Video className="size-4 text-primary" /> : <Phone className="size-4 text-emerald-500" />}
              <span>Ringing {isVideoCall ? "video" : "voice"} call...</span>
            </p>
          </div>

          {/* End / Cancel Call Button */}
          <div className="pt-2">
            <button
              onClick={endCall}
              className="size-16 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/30 hover:scale-110 active:scale-95 transition-transform"
              title="End Call"
            >
              <PhoneOff className="size-7" />
            </button>
            <span className="text-xs text-base-content/60 font-medium block mt-2">Cancel</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== 3. CONNECTED CALL SCREEN (Active) =====
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20 text-white py-2">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl overflow-hidden ring-1 ring-white/30">
            <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base leading-tight">
              {targetPerson?.fullName || targetPerson?.name}
            </h4>
            <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
              {formatDuration(callDuration)}
            </p>
          </div>
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="btn btn-ghost btn-circle btn-sm text-white/80 hover:text-white hover:bg-white/10"
          title="Minimize call"
        >
          <Minimize2 className="size-4" />
        </button>
      </div>

      {/* Main Video / Audio Area */}
      <div className="flex-1 w-full max-w-5xl relative rounded-3xl overflow-hidden my-3 flex items-center justify-center bg-zinc-950/80 border border-white/10 shadow-2xl">
        {isVideoCall ? (
          <>
            {/* Remote Fullscreen Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-3xl"
            />

            {/* Fallback avatar if remote video stream has not sent video frames */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3">
                <div className="size-28 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-2xl">
                  <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                </div>
                <p className="text-sm font-medium animate-pulse">Connecting video stream...</p>
              </div>
            )}

            {/* Local Video PiP (Picture in Picture) */}
            <div className="absolute top-4 right-4 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  isVideoOff ? "hidden" : "block"
                }`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/60 p-2 text-center text-xs">
                  <VideoOff className="size-6 mb-1 text-error" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Visualizer Screen */
          <div className="flex flex-col items-center justify-center gap-6 text-white text-center">
            <div className="relative">
              <div className="size-36 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-2xl relative z-10">
                <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping -z-0" />
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight">
                {targetPerson?.fullName || targetPerson?.name}
              </h3>
              <p className="text-sm text-emerald-400 font-mono font-bold mt-1">
                {formatDuration(callDuration)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="flex items-center gap-4 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 px-6 py-3.5 rounded-full shadow-2xl z-20">
        {/* Toggle Mute */}
        <button
          onClick={toggleMute}
          className={`size-12 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? "bg-error text-white hover:bg-error/90"
              : "bg-white/15 text-white hover:bg-white/25"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>

        {/* Toggle Video */}
        {isVideoCall && (
          <button
            onClick={toggleVideo}
            className={`size-12 rounded-full flex items-center justify-center transition-all ${
              isVideoOff
                ? "bg-error text-white hover:bg-error/90"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="size-14 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/40 hover:scale-110 active:scale-95 transition-transform"
          title="End Call"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
};

export default CallModal;
