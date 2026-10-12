import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

let peerConnection = null;
let queuedCandidates = [];
let callTimerInterval = null;

export const useCallStore = create((set, get) => ({
  callState: "idle", // 'idle' | 'calling' | 'incoming' | 'connected'
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
    const { socket, authUser } = useAuthStore.getState();
    if (!socket || !targetUser) return;

    try {
      // 1. Get local user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });

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
        }
      };

      // 5. ICE candidate listener
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            to: targetUser._id,
            candidate: event.candidate,
          });
        }
      };

      // 6. Create WebRTC offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // 7. Emit callUser to signaling server
      socket.emit("callUser", {
        userToCall: targetUser._id,
        signalData: offer,
        from: authUser._id,
        fromName: authUser.fullName,
        fromPic: authUser.profilePic,
        isVideoCall: isVideo,
      });

      set({
        callState: "calling",
        isVideoCall: isVideo,
        receiver: targetUser,
        localStream: stream,
        callDuration: 0,
        isMuted: false,
        isVideoOff: false,
        isMinimized: false,
      });
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Could not access camera or microphone");
      get().cleanupCall();
    }
  },

  answerCall: async () => {
    const { socket, authUser } = useAuthStore.getState();
    const { caller, incomingSignal, isVideoCall } = get();
    if (!socket || !caller || !incomingSignal) return;

    try {
      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

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
        }
      };

      // 5. ICE candidate listener
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            to: caller.id,
            candidate: event.candidate,
          });
        }
      };

      // 6. Set remote description from caller's offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingSignal));

      // 7. Process any queued ICE candidates
      while (queuedCandidates.length > 0) {
        const candidate = queuedCandidates.shift();
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // 8. Create and set local answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 9. Send answer back to caller
      socket.emit("answerCall", {
        to: caller.id,
        signal: answer,
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
      toast.error("Could not access camera or microphone");
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const { socket } = useAuthStore.getState();
    const { caller } = get();
    if (socket && caller) {
      socket.emit("rejectCall", { to: caller.id });
    }
    get().cleanupCall();
  },

  endCall: () => {
    const { socket } = useAuthStore.getState();
    const { caller, receiver } = get();
    const otherId = receiver?._id || caller?.id;

    if (socket && otherId) {
      socket.emit("endCall", { to: otherId });
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
    socket.off("callAccepted");
    socket.off("callRejected");
    socket.off("callEnded");
    socket.off("callFailed");
    socket.off("iceCandidate");

    socket.on("incomingCall", ({ from, fromName, fromPic, signal, isVideoCall }) => {
      set({
        callState: "incoming",
        isVideoCall,
        caller: { id: from, name: fromName, pic: fromPic },
        incomingSignal: signal,
        callDuration: 0,
      });
    });

    socket.on("callAccepted", async ({ signal }) => {
      try {
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

          // Process any queued candidates
          while (queuedCandidates.length > 0) {
            const candidate = queuedCandidates.shift();
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }

          // Start call timer
          if (callTimerInterval) clearInterval(callTimerInterval);
          callTimerInterval = setInterval(() => {
            set((state) => ({ callDuration: state.callDuration + 1 }));
          }, 1000);

          set({ callState: "connected" });
        }
      } catch (err) {
        console.error("Error setting remote description on callAccepted:", err);
      }
    });

    socket.on("callRejected", () => {
      toast("Call was declined", { icon: "🚫" });
      get().cleanupCall();
    });

    socket.on("callEnded", () => {
      toast("Call ended", { icon: "📴" });
      get().cleanupCall();
    });

    socket.on("callFailed", ({ reason }) => {
      toast.error(reason || "Call failed");
      get().cleanupCall();
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      try {
        if (peerConnection && peerConnection.remoteDescription) {
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
