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
      io.to(receiverSocketId).emit("incomingCall", {
        signal: signalData,
        from,
        fromName,
        fromPic,
        isVideoCall,
      });
      console.log(`📞 Call initiated from ${fromName} (${from}) to ${userToCall} (Video: ${isVideoCall})`);
    } else {
      socket.emit("callFailed", { reason: "User is currently offline" });
    }
  });

  socket.on("answerCall", ({ to, signal }) => {
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
    }
  });

  socket.on("endCall", ({ to }) => {
    const targetSocketId = getReceiverSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("callEnded");
      console.log(`📴 Call ended by ${userId} with ${to}`);
    }
  });

  socket.on("rejectCall", ({ to }) => {
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
  });
});

module.exports = { io, app, server, getReceiverSocketId };
