
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/db");

const createAdmin = async () => {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error("Admin environment variables are missing");
    }

    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log("Account already exists. No changes made.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'admin')`,
      [name, email, hashedPassword]
    );

    console.log("Admin account created successfully!");

  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;

  } finally {
    await pool.end();
  }
};

createAdmin();
