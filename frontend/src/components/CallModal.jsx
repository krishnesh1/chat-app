import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Minimize2,
  SwitchCamera,
} from "lucide-react";

const CallModal = () => {
  const {
    callState,
    outgoingStatus,
    isVideoCall,
    caller,
    receiver,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    cameraFacing,
    switchCamera,
    callDuration,
    isMinimized,
    setIsMinimized,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState, isVideoCall]);

  // Attach remote stream to audio AND video elements for 100% guaranteed sound & vision
  useEffect(() => {
    if (remoteStream) {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((err) => {
          console.log("Audio play error:", err);
        });
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((err) => {
          console.log("Video play error:", err);
        });
      }
    }
  }, [remoteStream, callState, isVideoCall]);

  if (callState === "idle") return null;

  const targetPerson = receiver || caller;
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-base-100/95 backdrop-blur-xl border border-primary/40 shadow-2xl rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:scale-105 transition-transform animate-in fade-in max-w-[calc(100vw-2rem)]"
      >
        {/* Hidden permanent audio player in minimized mode */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="size-9 sm:size-10 rounded-xl object-cover ring-2 ring-primary"
          />
          <span className="absolute -top-1 -right-1 size-2.5 sm:size-3 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <div className="text-xs pr-1 sm:pr-2 min-w-0">
          <p className="font-bold text-base-content leading-tight truncate max-w-[120px] sm:max-w-[180px]">
            {targetPerson?.fullName || targetPerson?.name || "Active Call"}
          </p>
          <p className="text-[10px] sm:text-[11px] font-mono text-primary font-semibold">
            {formatDuration(callDuration)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="btn btn-circle btn-xs btn-error text-white shrink-0"
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
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
        <div className="bg-base-100/95 border border-base-300/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden max-h-[92dvh] overflow-y-auto">
          {/* Ambient glow behind avatar */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Caller Avatar with Pulse */}
          <div className="relative">
            <div className="size-24 sm:size-28 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-xl relative z-10">
              <img src={avatarUrl} alt={targetPerson?.name} className="size-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping -z-0" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-base-content truncate max-w-[240px]">
              {targetPerson?.name}
            </h3>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1 flex items-center justify-center gap-1.5 font-medium">
              {isVideoCall ? <Video className="size-4 text-primary" /> : <Phone className="size-4 text-emerald-500" />}
              <span>Incoming {isVideoCall ? "Video" : "Voice"} Call...</span>
            </p>
          </div>

          {/* Accept / Decline Buttons */}
          <div className="flex items-center gap-6 sm:gap-8 pt-1 sm:pt-2">
            {/* Decline */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={rejectCall}
                className="size-14 sm:size-16 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/30 hover:scale-110 active:scale-95 transition-transform"
                title="Decline"
              >
                <PhoneOff className="size-6 sm:size-7" />
              </button>
              <span className="text-xs text-base-content/60 font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={answerCall}
                className="size-14 sm:size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-transform animate-bounce"
                title="Accept"
              >
                <Phone className="size-6 sm:size-7" />
              </button>
              <span className="text-xs text-emerald-500 font-bold">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== 2. OUTGOING CALL SCREEN (Calling... vs Ringing...) =====
  if (callState === "calling") {
    const isRinging = outgoingStatus === "ringing";

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
        <div className="bg-base-100/95 border border-base-300/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden max-h-[92dvh] overflow-y-auto">
          {/* Ambient glow */}
          <div
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 ${
              isRinging ? "bg-emerald-500/20" : "bg-primary/20"
            } rounded-full blur-3xl pointer-events-none transition-colors duration-500`}
          />

          {/* Receiver Avatar with Pulse */}
          <div className="relative">
            <div
              className={`size-24 sm:size-28 rounded-full overflow-hidden ring-4 ${
                isRinging ? "ring-emerald-500/50 shadow-emerald-500/20" : "ring-primary/40 shadow-primary/20"
              } shadow-xl relative z-10 transition-all duration-500`}
            >
              <img src={avatarUrl} alt={targetPerson?.fullName} className="size-full object-cover" />
            </div>
            <div
              className={`absolute inset-0 rounded-full ${
                isRinging ? "bg-emerald-500/30 animate-ping" : "bg-primary/20 animate-pulse"
              } -z-0`}
            />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-base-content truncate max-w-[240px]">
              {targetPerson?.fullName || targetPerson?.name}
            </h3>
            <div className="flex flex-col items-center gap-1 mt-1.5">
              <p className="text-xs sm:text-sm flex items-center justify-center gap-1.5 font-semibold">
                {isVideoCall ? <Video className="size-4 text-primary" /> : <Phone className="size-4 text-emerald-500" />}
                <span className={isRinging ? "text-emerald-500" : "text-primary animate-pulse"}>
                  {isRinging ? "Ringing..." : "Calling..."}
                </span>
              </p>
              {!isRinging && (
                <span className="text-[10px] sm:text-[11px] text-base-content/50 font-normal">
                  Contact offline • Rings automatically once online
                </span>
              )}
            </div>
          </div>

          {/* End / Cancel Call Button */}
          <div className="pt-1 sm:pt-2">
            <button
              onClick={endCall}
              className="size-14 sm:size-16 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/30 hover:scale-110 active:scale-95 transition-transform"
              title="End Call"
            >
              <PhoneOff className="size-6 sm:size-7" />
            </button>
            <span className="text-xs text-base-content/60 font-medium block mt-2">Cancel</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== 3. CONNECTED CALL SCREEN (Active Call) =====
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-2.5 sm:p-6 h-[100dvh] max-h-[100dvh] overflow-hidden animate-in fade-in">
      {/* Permanent background audio element to guarantee remote voice in voice AND video calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20 text-white py-1.5 sm:py-2 px-1">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="size-8 sm:size-10 rounded-xl overflow-hidden ring-1 ring-white/30 shrink-0">
            <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-xs sm:text-base leading-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
              {targetPerson?.fullName || targetPerson?.name}
            </h4>
            <p className="text-[10px] sm:text-xs text-emerald-400 font-mono font-bold mt-0.5">
              {formatDuration(callDuration)}
            </p>
          </div>
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="btn btn-ghost btn-circle btn-xs sm:btn-sm text-white/80 hover:text-white hover:bg-white/10 shrink-0"
          title="Minimize call"
        >
          <Minimize2 className="size-3.5 sm:size-4" />
        </button>
      </div>

      {/* Main Video / Audio Area */}
      <div className="flex-1 w-full max-w-5xl relative rounded-2xl sm:rounded-3xl overflow-hidden my-1.5 sm:my-3 flex items-center justify-center bg-zinc-950/80 border border-white/10 shadow-2xl min-h-0">
        {isVideoCall ? (
          <>
            {/* Remote Fullscreen Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-2xl sm:rounded-3xl"
            />

            {/* Fallback avatar if remote video stream has not sent video frames */}
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 sm:gap-3">
                <div className="size-20 sm:size-28 rounded-full overflow-hidden ring-4 ring-primary/40 shadow-2xl">
                  <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                </div>
                <p className="text-xs sm:text-sm font-medium animate-pulse">Connecting video stream...</p>
              </div>
            )}

            {/* Local Video PiP (Picture in Picture) */}
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-24 h-36 sm:w-36 sm:h-52 md:w-44 md:h-60 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  cameraFacing === "user" ? "scale-x-[-1]" : ""
                } ${isVideoOff ? "hidden" : "block"}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/60 p-2 text-center text-[10px] sm:text-xs">
                  <VideoOff className="size-4 sm:size-6 mb-1 text-error" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Visualizer Screen */
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 text-white text-center p-4">
            <div className="relative">
              <div className="size-24 sm:size-36 rounded-full overflow-hidden ring-4 ring-emerald-500/40 shadow-2xl relative z-10">
                <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping -z-0" />
            </div>

            <div>
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight truncate max-w-xs">
                {targetPerson?.fullName || targetPerson?.name}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-400 font-mono font-bold mt-1">
                {formatDuration(callDuration)}
              </p>
            </div>

            {/* Voice call audio wave bars */}
            <div className="flex items-center gap-1 sm:gap-1.5 h-6 sm:h-8">
              {[0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.3, 0.7, 0.5].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-emerald-400/80 rounded-full animate-pulse"
                  style={{
                    height: `${h * 100}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "1s",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full shadow-2xl z-20 mb-1 sm:mb-0">
        {/* Toggle Mute */}
        <button
          onClick={toggleMute}
          className={`size-11 sm:size-12 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? "bg-error text-white hover:bg-error/90"
              : "bg-white/15 text-white hover:bg-white/25"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="size-4 sm:size-5" /> : <Mic className="size-4 sm:size-5" />}
        </button>

        {/* Toggle Video */}
        {isVideoCall && (
          <button
            onClick={toggleVideo}
            className={`size-11 sm:size-12 rounded-full flex items-center justify-center transition-all ${
              isVideoOff
                ? "bg-error text-white hover:bg-error/90"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="size-4 sm:size-5" /> : <Video className="size-4 sm:size-5" />}
          </button>
        )}

        {/* Switch Front/Back Camera */}
        {isVideoCall && (
          <button
            onClick={switchCamera}
            className="size-11 sm:size-12 rounded-full flex items-center justify-center transition-all bg-white/15 text-white hover:bg-white/25 active:scale-95"
            title={cameraFacing === "user" ? "Switch to back camera" : "Switch to front camera"}
          >
            <SwitchCamera className="size-4 sm:size-5" />
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="size-12 sm:size-14 rounded-full bg-error text-white flex items-center justify-center shadow-lg shadow-error/40 hover:scale-110 active:scale-95 transition-transform"
          title="End Call"
        >
          <PhoneOff className="size-5 sm:size-6" />
        </button>
      </div>
    </div>
  );
};

export default CallModal;
