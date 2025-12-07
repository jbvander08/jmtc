// netlify/functions/login.cjs
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  console.log("=== LOGIN FUNCTION START ===");
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Invalid JSON format" }),
      };
    }

    const { username, password, force = false } = body;

    console.log(`Login attempt for: ${username}`);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Missing username or password" }),
      };
    }

    // Validate environment variables
    if (!process.env.DATABASE_URL && !process.env.NETLIFY_DATABASE_URL) {
      console.error("No database URL found");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: "Server configuration error",
          error: "Database URL not configured" 
        }),
      };
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: "Server configuration error",
          error: "JWT secret not configured" 
        }),
      };
    }

    // Initialize Neon connection
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(connectionString);
    
    // Fetch user with new syntax
    console.log("Querying user...");
    const users = await sql`
      SELECT * FROM "user" 
      WHERE username = ${username}
    `;
    
    if (!users || users.length === 0) {
      console.log("User not found");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }

    const user = users[0];
    console.log(`User found: ID=${user.user_id}, Role=${user.role}`);

    // Validate password with bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("Invalid password");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }

    // Check if user is already logged in
    if (user.state === 1) {
      if (!force) {
        console.log("User already logged in elsewhere");
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            message: "User is already logged in elsewhere",
            alreadyLoggedIn: true,
          }),
        };
      } else {
        // Force logout previous session
        console.log("Force logging out previous session");
        await sql`
          UPDATE "user" 
          SET state = 0 
          WHERE user_id = ${user.user_id}
        `;
      }
    }

    // Update user state to logged in
    console.log("Updating user state to logged in");
    await sql`
      UPDATE "user" 
      SET state = 1 
      WHERE user_id = ${user.user_id}
    `;

    // Generate JWT token with jwt library
    console.log("Generating JWT token");
    const tokenPayload = {
      user_ID: user.user_id,
      user_id: user.user_id, // Include both for compatibility
      username: user.username,
      role: user.role,
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log("✅ Login successful for:", user.username);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        user_ID: user.user_id,
        username: user.username,
        role: user.role,
        message: "Login successful",
      }),
    };

  } catch (error) {
    console.error("Login error:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  } finally {
    console.log("=== LOGIN FUNCTION END ===");
  }
};