
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const groupRoutes = require("./routes/groupRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
}));

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Classync API is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);
// Group routes
app.use("/api/groups", groupRoutes);
// Student routes
app.use("/api/student", studentRoutes);
// Admin routes
app.use("/api/admin", adminRoutes);

// Start server after checking database
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");

    console.log("PostgreSQL connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
