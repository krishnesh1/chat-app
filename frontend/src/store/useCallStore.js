import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

let peerConnection = null;
let queuedCandidates = [];
let callTimerInterval = null;
let callTimeoutRef = null;
let ringtoneInterval = null;
let audioCtx = null;

// Synthetic Web Audio ringtones (Zero external audio assets required)
const getAudioContext = () => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
};

const playTone = (freq, duration, type = "sine", volume = 0.12) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Audio autoplay or user interaction restriction
    void err;
  }
};

const startOutgoingRingtone = () => {
  stopRingtone();
  // Standard ring-back tone (soft dual beep every 2.8 seconds)
  const ring = () => {
    playTone(440, 0.35, "sine", 0.08);
    setTimeout(() => playTone(480, 0.35, "sine", 0.08), 80);
  };
  ring();
  ringtoneInterval = setInterval(ring, 2800);
};

const startIncomingRingtone = () => {
  stopRingtone();
  // Pleasant melodic WhatsApp-style incoming chime
  const ring = () => {
    playTone(523.25, 0.12, "triangle", 0.14); // C5
    setTimeout(() => playTone(659.25, 0.12, "triangle", 0.14), 140); // E5
    setTimeout(() => playTone(783.99, 0.22, "triangle", 0.14), 280); // G5
    setTimeout(() => playTone(1046.5, 0.35, "triangle", 0.12), 440); // C6
  };
  ring();
  ringtoneInterval = setInterval(ring, 2400);
};

const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
};

export const useCallStore = create((set, get) => ({
  callState: "idle", // 'idle' | 'calling' | 'incoming' | 'connected'
  outgoingStatus: "calling", // 'calling' | 'ringing'
  isVideoCall: true,
  caller: null, // { id, name, pic }
  receiver: null, // { id, name, pic }
  incomingSignal: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  callDuration: 0,
  isMinimized: false,

  setIsMinimized: (val) => set({ isMinimized: val }),

  startCall: async (targetUser, isVideo = true) => {
    const { socket, authUser, onlineUsers } = useAuthStore.getState();
    if (!socket || !targetUser) return;

    // Check if target user is currently online
    const isTargetOnline = onlineUsers.includes(targetUser._id);

    try {
      // 1. Get local user media with graceful fallback if camera is unavailable
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: true,
        });
      } catch {
        if (isVideo) {
          toast("Camera not detected, starting voice call", { icon: "🎤" });
          isVideo = false;
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
        } else {
          throw new Error("Microphone access denied or unavailable");
        }
      }

      // 2. Initialize RTCPeerConnection
      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      queuedCandidates = [];

      // 3. Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // 4. Remote track listener
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        } else {
          let currentStream = get().remoteStream;
          if (!currentStream) {
            currentStream = new MediaStream();
            set({ remoteStream: currentStream });
          }
          currentStream.addTrack(event.track);
        }
      };

      // Connection state tracking
      peerConnection.onconnectionstatechange = () => {
        console.log("WebRTC Caller Connection State:", peerConnection?.connectionState);
        if (peerConnection?.connectionState === "connected") {
          set({ callState: "connected" });
        }
      };

      // 5. ICE candidate listener
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            to: targetUser._id.toString(),
            candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          });
        }
      };

      // 6. Create WebRTC offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // 7. Emit callUser to signaling server
      socket.emit("callUser", {
        userToCall: targetUser._id.toString(),
        signalData: { type: offer.type, sdp: offer.sdp },
        from: authUser._id.toString(),
        fromName: authUser.fullName,
        fromPic: authUser.profilePic,
        isVideoCall: isVideo,
      });

      set({
        callState: "calling",
        outgoingStatus: isTargetOnline ? "ringing" : "calling",
        isVideoCall: isVideo,
        receiver: targetUser,
        localStream: stream,
        callDuration: 0,
        isMuted: false,
        isVideoOff: false,
        isMinimized: false,
      });

      // Start outgoing dial/ringing sound
      startOutgoingRingtone();

      // Auto-cancel call if unanswered after 45 seconds
      if (callTimeoutRef) clearTimeout(callTimeoutRef);
      callTimeoutRef = setTimeout(() => {
        if (get().callState === "calling") {
          toast("No answer from contact", { icon: "⏳" });
          get().endCall();
        }
      }, 45000);
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error(error.message || "Could not access media devices");
      get().cleanupCall();
    }
  },

  answerCall: async () => {
    const { socket } = useAuthStore.getState();
    const { caller, incomingSignal, isVideoCall } = get();
    if (!socket || !caller || !incomingSignal) return;

    stopRingtone();

    try {
      // 1. Get local media with graceful fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall,
          audio: true,
        });
      } catch {
        if (isVideoCall) {
          toast("Camera not detected, answering with voice only", { icon: "🎤" });
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
        } else {
          throw new Error("Microphone access denied or unavailable");
        }
      }

      // 2. Create peer connection
      peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // 3. Add tracks
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // 4. Remote track listener
      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        } else {
          let currentStream = get().remoteStream;
          if (!currentStream) {
            currentStream = new MediaStream();
            set({ remoteStream: currentStream });
          }
          currentStream.addTrack(event.track);
        }
      };

      // Connection state tracking
      peerConnection.onconnectionstatechange = () => {
        console.log("WebRTC Receiver Connection State:", peerConnection?.connectionState);
        if (peerConnection?.connectionState === "connected") {
          set({ callState: "connected" });
        }
      };

      // 5. ICE candidate listener
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            to: caller.id.toString(),
            candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          });
        }
      };

      // 6. Set remote description from caller's offer
      const offerDesc = incomingSignal?.type
        ? incomingSignal
        : { type: "offer", sdp: incomingSignal?.sdp || incomingSignal };
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));

      // 7. Process any queued ICE candidates
      while (queuedCandidates.length > 0) {
        const candidate = queuedCandidates.shift();
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding queued candidate in answerCall:", err);
        }
      }

      // 8. Create and set local answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 9. Send answer back to caller
      socket.emit("answerCall", {
        to: caller.id.toString(),
        signal: { type: answer.type, sdp: answer.sdp },
      });

      // 10. Start call duration timer
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        set((state) => ({ callDuration: state.callDuration + 1 }));
      }, 1000);

      set({
        callState: "connected",
        localStream: stream,
        isMuted: false,
        isVideoOff: false,
      });
    } catch (error) {
      console.error("Failed to answer call:", error);
      toast.error(error.message || "Could not answer call");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    stopRingtone();
    const { socket } = useAuthStore.getState();
    const { caller } = get();
    if (socket && caller?.id) {
      socket.emit("rejectCall", { to: caller.id.toString() });
    }
    get().cleanupCall();
  },

  endCall: () => {
    stopRingtone();
    const { socket } = useAuthStore.getState();
    const { caller, receiver } = get();
    const otherId = receiver?._id || caller?.id;

    if (socket && otherId) {
      socket.emit("endCall", { to: otherId.toString() });
    }
    get().cleanupCall();
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        set({ isMuted: !isMuted });
      }
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        set({ isVideoOff: !isVideoOff });
      }
    }
  },

  cleanupCall: () => {
    stopRingtone();

    if (callTimeoutRef) {
      clearTimeout(callTimeoutRef);
      callTimeoutRef = null;
    }

    if (callTimerInterval) {
      clearInterval(callTimerInterval);
      callTimerInterval = null;
    }

    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    queuedCandidates = [];

    set({
      callState: "idle",
      outgoingStatus: "calling",
      caller: null,
      receiver: null,
      incomingSignal: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isMinimized: false,
    });
  },

  initCallListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove any stale listeners
    socket.off("incomingCall");
    socket.off("callRinging");
    socket.off("callStatus");
    socket.off("callAccepted");
    socket.off("callRejected");
    socket.off("callEnded");
    socket.off("callFailed");
    socket.off("iceCandidate");

    socket.on("incomingCall", ({ from, fromName, fromPic, signal, isVideoCall }) => {
      // If already in an active call, automatically reject / busy
      if (get().callState !== "idle") {
        socket.emit("rejectCall", { to: from });
        return;
      }

      queuedCandidates = [];

      set({
        callState: "incoming",
        isVideoCall,
        caller: { id: from, name: fromName, pic: fromPic },
        incomingSignal: signal,
        callDuration: 0,
      });

      startIncomingRingtone();
    });

    socket.on("callRinging", () => {
      set({ outgoingStatus: "ringing" });
    });

    socket.on("callStatus", ({ status }) => {
      if (status) set({ outgoingStatus: status });
    });

    socket.on("callAccepted", async ({ signal }) => {
      console.log("📞 Call accepted by remote party");
      stopRingtone();
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
        callTimeoutRef = null;
      }

      // Immediately start timer and unblock caller screen to connected
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        set((state) => ({ callDuration: state.callDuration + 1 }));
      }, 1000);

      set({ callState: "connected" });

      try {
        if (peerConnection && signal) {
          const answerDesc = signal.type
            ? signal
            : { type: "answer", sdp: signal.sdp || signal };

          if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
          }

          // Process any queued candidates
          while (queuedCandidates.length > 0) {
            const candidate = queuedCandidates.shift();
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn("Error adding queued candidate on callAccepted:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error setting remote description on callAccepted:", err);
      }
    });

    socket.on("callRejected", () => {
      stopRingtone();
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
        callTimeoutRef = null;
      }
      toast("Call was declined", { icon: "🚫" });
      get().cleanupCall();
    });

    socket.on("callEnded", () => {
      stopRingtone();
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
        callTimeoutRef = null;
      }
      toast("Call ended", { icon: "📴" });
      get().cleanupCall();
    });

    socket.on("callFailed", ({ reason }) => {
      stopRingtone();
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
        callTimeoutRef = null;
      }
      toast.error(reason || "Call failed");
      get().cleanupCall();
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      if (!candidate) return;
      try {
        if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          queuedCandidates.push(candidate);
        }
      } catch (err) {
        console.error("Error adding ice candidate:", err);
      }
    });
  },
}));
