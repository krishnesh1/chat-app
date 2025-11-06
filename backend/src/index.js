const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const { connectDB } = require("./lib/db.js");
const authRoutes = require("./routes/auth.route.js");
const messageRoutes = require("./routes/message.route.js");
const { app, server } = require("./lib/socket.js");

dotenv.config();

const PORT = process.env.PORT;

// ❌ Remove this line:
// const __dirname = path.resolve();

app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // credentials: true is what allows your cookie to actually travel from backend → browser → frontend.
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("✅ Server is running on PORT: " + PORT);
  connectDB();
});
