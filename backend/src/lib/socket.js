// lib/socket.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// used to store online users
const userSocketMap = {}; // { userId: socketId }

// used to store pending calls when receiver is offline:
// { [receiverUserId]: { callerId, callerSocketId, signalData, from, fromName, fromPic, isVideoCall, candidates: [], createdAt } }
const activePendingCalls = {};

function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", async (socket) => {
  console.log("✅ User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId.toString());
    userSocketMap[userId] = socket.id;

    // When this user comes online, update any pending "sent" messages to "delivered"
    try {
      const Message = require("../models/message.model.js");
      const pendingMessages = await Message.find({ receiverId: userId, status: "sent" });

      if (pendingMessages.length > 0) {
        await Message.updateMany({ receiverId: userId, status: "sent" }, { status: "delivered" });

        // Notify each sender that their messages have been delivered (Double Grey Ticks)
        const senderIds = [...new Set(pendingMessages.map((m) => m.senderId.toString()))];
        senderIds.forEach((sId) => {
          io.to(sId).emit("messagesDelivered", { receiverId: userId });
          const sSocket = getReceiverSocketId(sId);
          if (sSocket) io.to(sSocket).emit("messagesDelivered", { receiverId: userId });
        });
      }
    } catch (err) {
      console.error("Error updating delivered status on connection:", err.message);
    }

    // Check if there is an active pending call waiting for this user (user was called while offline)
    if (activePendingCalls[userId]) {
      const pending = activePendingCalls[userId];
      // Deliver if call was initiated within the last 60 seconds
      if (Date.now() - pending.createdAt < 60000) {
        socket.emit("incomingCall", {
          signal: pending.signalData,
          from: pending.from,
          fromName: pending.fromName,
          fromPic: pending.fromPic,
          isVideoCall: pending.isVideoCall,
        });

        // Forward all buffered ICE candidates gathered while receiver was offline
        if (pending.candidates && pending.candidates.length > 0) {
          pending.candidates.forEach((cand) => {
            socket.emit("iceCandidate", { candidate: cand });
          });
        }

        // Notify the caller that receiver has reconnected and the call is now ringing
        io.to(pending.callerSocketId).emit("callRinging", { targetUserId: userId });
        console.log(`📞 Pending call delivered to reconnected user ${userId}`);
      }
      delete activePendingCalls[userId];
    }
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // ✅ Real-time message read acknowledgement (Double Blue Ticks)
  socket.on("markAsRead", async ({ senderId }) => {
    try {
      const Message = require("../models/message.model.js");
      await Message.updateMany(
        { senderId, receiverId: userId, status: { $ne: "read" } },
        { status: "read" }
      );

      io.to(senderId.toString()).emit("messagesRead", { readerId: userId });
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", { readerId: userId });
      }
    } catch (err) {
      console.error("Error in markAsRead event:", err.message);
    }
  });

  // ✅ Typing event handler
  socket.on("typing", ({ receiverId, senderName }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        senderId: userId,
        senderName,
      });
      console.log(`✍️ ${senderName} is typing to ${receiverId}`);
    }
  });

  // ✅ Stop typing event handler
  socket.on("stopTyping", ({ receiverId, senderName }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", {
        senderId: userId,
        senderName,
      });
      console.log(`🛑 ${senderName} stopped typing to ${receiverId}`);
    }
  });

  // 📞 WebRTC Call Signaling Handlers
  socket.on("callUser", ({ userToCall, signalData, from, fromName, fromPic, isVideoCall }) => {
    const receiverSocketId = getReceiverSocketId(userToCall);
    if (receiverSocketId) {
      // Receiver is online: deliver incomingCall and tell caller's client it is ringing
      io.to(receiverSocketId).emit("incomingCall", {
        signal: signalData,
        from,
        fromName,
        fromPic,
        isVideoCall,
      });
      socket.emit("callRinging", { targetUserId: userToCall });
      console.log(`📞 Call initiated from ${fromName} (${from}) to ${userToCall} (Online: Ringing)`);
    } else {
      // Receiver is offline: save pending call, caller client enters "Calling..." state
      activePendingCalls[userToCall] = {
        callerId: from,
        callerSocketId: socket.id,
        signalData,
        from,
        fromName,
        fromPic,
        isVideoCall,
        candidates: [],
        createdAt: Date.now(),
      };
      socket.emit("callStatus", { status: "calling", targetUserId: userToCall });
      console.log(`📞 Call initiated from ${fromName} (${from}) to ${userToCall} (Offline: Queued as Calling)`);
    }
  });

  socket.on("answerCall", ({ to, signal }) => {
    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { signal });
      console.log(`✅ Call accepted by ${userId} for caller ${to}`);
    }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { candidate });
    } else if (activePendingCalls[to] && activePendingCalls[to].callerId === userId) {
      // Buffer candidate while target is offline
      activePendingCalls[to].candidates.push(candidate);
    }
  });

  socket.on("endCall", ({ to }) => {
    // If there was a pending call to this target from the current caller, clean it up
    if (to && activePendingCalls[to] && activePendingCalls[to].callerId === userId) {
      delete activePendingCalls[to];
    }
    // If the caller itself has a pending call directed at them, clean it up
    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }

    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
      console.log(`📴 Call ended by ${userId} with ${to}`);
    }
  });

  socket.on("rejectCall", ({ to }) => {
    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }
    const callerSocketId = getReceiverSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
      console.log(`🚫 Call rejected by ${userId} for caller ${to}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Clean up any pending calls initiated by or waiting for this user
    Object.keys(activePendingCalls).forEach((targetId) => {
      if (activePendingCalls[targetId].callerId === userId || targetId === userId) {
        delete activePendingCalls[targetId];
      }
    });
  });
});

module.exports = { io, app, server, getReceiverSocketId };
