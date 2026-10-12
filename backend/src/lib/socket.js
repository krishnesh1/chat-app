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
  if (!userId) return null;
  return userSocketMap[userId.toString()] || userSocketMap[userId];
}

io.on("connection", async (socket) => {
  console.log("✅ User connected:", socket.id);

  const rawUserId = socket.handshake.query.userId;
  const userId = rawUserId ? rawUserId.toString() : null;
  if (userId) {
    socket.join(userId);
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
          io.to(sId.toString()).emit("messagesDelivered", { receiverId: userId });
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

        // Notify caller that receiver reconnected and call is now ringing
        io.to(pending.callerId.toString()).emit("callRinging", { targetUserId: userId });
        if (pending.callerSocketId) {
          io.to(pending.callerSocketId).emit("callRinging", { targetUserId: userId });
        }
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
    if (!userToCall) return;
    const targetUserId = userToCall.toString();
    const receiverSocketId = getReceiverSocketId(targetUserId);

    // Check if target has an active socket or room
    const targetRoom = io.sockets.adapter.rooms.get(targetUserId);
    const isTargetOnline = (targetRoom && targetRoom.size > 0) || Boolean(receiverSocketId);

    if (isTargetOnline) {
      // Receiver is online: deliver incomingCall to user room AND direct socket
      io.to(targetUserId).emit("incomingCall", {
        signal: signalData,
        from,
        fromName,
        fromPic,
        isVideoCall,
      });
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incomingCall", {
          signal: signalData,
          from,
          fromName,
          fromPic,
          isVideoCall,
        });
      }
      socket.emit("callRinging", { targetUserId });
      console.log(`📞 Call initiated from ${fromName} (${from}) to ${targetUserId} (Online: Ringing)`);
    } else {
      // Receiver is offline: save pending call, caller client enters "Calling..." state
      activePendingCalls[targetUserId] = {
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
      socket.emit("callStatus", { status: "calling", targetUserId });
      console.log(`📞 Call initiated from ${fromName} (${from}) to ${targetUserId} (Offline: Queued as Calling)`);
    }
  });

  socket.on("answerCall", ({ to, signal }) => {
    if (!to) return;
    const callerId = to.toString();
    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }
    const callerSocketId = getReceiverSocketId(callerId);

    // Deliver callAccepted to caller's room AND direct socket ID
    io.to(callerId).emit("callAccepted", { signal });
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { signal });
    }
    console.log(`✅ Call accepted by ${userId} for caller ${callerId}`);
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    const targetUserId = to.toString();
    const targetSocketId = getReceiverSocketId(targetUserId);

    // Forward ICE candidate to target's room AND direct socket
    io.to(targetUserId).emit("iceCandidate", { candidate });
    if (targetSocketId) {
      io.to(targetSocketId).emit("iceCandidate", { candidate });
    } else if (activePendingCalls[targetUserId] && activePendingCalls[targetUserId].callerId === userId) {
      // Buffer candidate while target is offline
      activePendingCalls[targetUserId].candidates.push(candidate);
    }
  });

  socket.on("endCall", ({ to }) => {
    if (!to) return;
    const targetUserId = to.toString();

    // Clean up any pending call
    if (activePendingCalls[targetUserId] && activePendingCalls[targetUserId].callerId === userId) {
      delete activePendingCalls[targetUserId];
    }
    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }

    const targetSocketId = getReceiverSocketId(targetUserId);
    io.to(targetUserId).emit("callEnded");
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
    }
    console.log(`📴 Call ended by ${userId} with ${targetUserId}`);
  });

  socket.on("rejectCall", ({ to }) => {
    if (!to) return;
    const callerId = to.toString();

    if (activePendingCalls[userId]) {
      delete activePendingCalls[userId];
    }
    const callerSocketId = getReceiverSocketId(callerId);
    io.to(callerId).emit("callRejected");
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected");
    }
    console.log(`🚫 Call rejected by ${userId} for caller ${callerId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    if (userId) {
      const room = io.sockets.adapter.rooms.get(userId.toString());
      if (!room || room.size === 0) {
        delete userSocketMap[userId];
      } else if (userSocketMap[userId] === socket.id) {
        // Fallback to another remaining socket in the room
        userSocketMap[userId] = Array.from(room)[0];
      }
    }
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
