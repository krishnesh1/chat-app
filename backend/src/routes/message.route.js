// routes/message.routes.js

const express = require("express");
const { protectRoute } = require("../middleware/auth.middleware.js");
const {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  reactToMessage,
  deleteMessage,
  toggleStarMessage,
  markViewOnceAsViewed,
  markMessagesAsRead,
  editMessage,
} = require("../controllers/message.controller.js");

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/edit/:id", protectRoute, editMessage);
router.put("/react/:id", protectRoute, reactToMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.put("/star/:id", protectRoute, toggleStarMessage);
router.put("/view-once/:id", protectRoute, markViewOnceAsViewed);
router.put("/read/:id", protectRoute, markMessagesAsRead);

module.exports = router;
