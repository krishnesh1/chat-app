// routes/auth.routes.js

const express = require("express");
const { checkAuth, login, logout, signup, updateProfile } = require("../controllers/auth.controller.js");
const { protectRoute } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

module.exports = router;
