// controllers/chat.controller.js

const User = require("../models/user.model.js");
const Message = require("../models/message.model.js");
const cloudinary = require("../lib/cloudinary.js");
const { getReceiverSocketId, io } = require("../lib/socket.js");

// ===== GET USERS FOR SIDEBAR WITH UNREAD COUNTS & LAST MESSAGE =====
const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    const usersWithStats = await Promise.all(
      filteredUsers.map(async (user) => {
        // Count unread messages sent by this user to loggedInUserId
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          status: { $ne: "read" },
        });

        // Get the latest message between loggedInUserId and user
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .select("text image audio createdAt senderId status isDeleted");

        return {
          ...user.toObject(),
          unreadCount,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                hasImage: Boolean(lastMessage.image),
                hasAudio: Boolean(lastMessage.audio),
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                status: lastMessage.status,
                isDeleted: lastMessage.isDeleted,
              }
            : null,
        };
      })
    );

    // Sort users so the contact with the most recent message appears first
    usersWithStats.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(usersWithStats);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== MARK MESSAGES AS READ (REAL TIME) =====
const markMessagesAsRead = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, status: { $ne: "read" } },
      { status: "read" }
    );

    // Notify sender in real time that receiver read their messages
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { readerId: myId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== GET MESSAGES =====
const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).populate("replyTo", "text image audio senderId");

    // Mark unread messages sent by userToChatId as read
    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, status: { $ne: "read" } },
      { status: "read" }
    );

    // Notify sender that their messages have been read (Double Blue Ticks)
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { readerId: myId });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== SEND MESSAGE =====
const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, replyTo, isViewOnce, isSecret } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      if (image.startsWith("http://") || image.startsWith("https://")) {
        // Already uploaded image URL (e.g. forwarded message)
        imageUrl = image;
      } else {
        // Upload base64 image to cloudinary with high quality preservation
        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: "image",
          format: "jpg",
          quality: "auto:best",
        });
        imageUrl = uploadResponse.secure_url.replace(/\.heic$/i, ".jpg");
      }
    }

    let audioUrl;
    if (audio) {
      if (audio.startsWith("http://") || audio.startsWith("https://")) {
        audioUrl = audio;
      } else {
        // Upload audio note to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(audio, {
          resource_type: "video", // Cloudinary processes audio under video
        });
        audioUrl = uploadResponse.secure_url;
      }
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    // If receiver is currently online, message is delivered immediately (Double ticks)
    const initialStatus = receiverSocketId ? "delivered" : "sent";

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audio: audioUrl,
      replyTo: replyTo || null,
      isViewOnce: Boolean(isViewOnce),
      isSecret: Boolean(isSecret),
      status: initialStatus,
    });

    await newMessage.save();

    // Populate replyTo if present for immediate UI display
    if (replyTo) {
      await newMessage.populate("replyTo", "text image audio senderId");
    }

    // Emit to recipient's room and direct socket ID for reliable real-time reception
    io.to(receiverId.toString()).emit("newMessage", newMessage);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== REACT TO MESSAGE =====
const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Check if user already reacted
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Remove reaction if same emoji tapped again
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update reaction
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Notify other party in real time
    const otherUserId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId.toString()
        : message.senderId.toString();

    const otherSocketId = getReceiverSocketId(otherUserId);
    if (otherSocketId) {
      io.to(otherSocketId).emit("messageReaction", {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== DELETE MESSAGE FOR EVERYONE =====
const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Only sender can delete for everyone
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized to delete this message" });
    }

    message.isDeleted = true;
    message.text = "This message was deleted";
    message.image = null;
    message.audio = null;
    await message.save();

    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== TOGGLE STAR MESSAGE =====
const toggleStarMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const starIndex = message.isStarredBy.indexOf(userId);
    if (starIndex > -1) {
      message.isStarredBy.splice(starIndex, 1);
    } else {
      message.isStarredBy.push(userId);
    }

    await message.save();
    res.status(200).json(message);
  } catch (error) {
    console.log("Error in toggleStarMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== MARK VIEW ONCE AS VIEWED =====
const markViewOnceAsViewed = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (!message.viewedBy.includes(userId)) {
      message.viewedBy.push(userId);
      await message.save();

      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageViewedOnce", {
          messageId: message._id,
          viewedBy: message.viewedBy,
        });
      }
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in markViewOnceAsViewed controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ===== EXPORTS =====
module.exports = {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  reactToMessage,
  deleteMessage,
  toggleStarMessage,
  markViewOnceAsViewed,
  markMessagesAsRead,
};
