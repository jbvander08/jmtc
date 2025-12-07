// netlify/functions/auth.js
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

export const handler = async (event, context) => {
  console.log("=== AUTH FUNCTION START ===");
  
  // Enable CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Extract token from Authorization header
  const authHeader = event.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  console.log("Auth header present:", !!authHeader);
  console.log("Token extracted:", token ? "Yes" : "No");

  if (!token) {
    console.log("No token provided");
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ 
        authorized: false,
        message: "No token provided" 
      }),
    };
  }

  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          authorized: false,
          message: "Server configuration error"
        }),
      };
    }

    // Verify JWT token
    console.log("Verifying JWT token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded successfully:", {
      user_ID: decoded.user_ID || decoded.user_id,
      username: decoded.username,
      role: decoded.role
    });

    // Use user_ID or user_id (handle both cases)
    const userId = decoded.user_ID || decoded.user_id;
    
    if (!userId) {
      console.error("No user ID in token");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          authorized: false,
          message: "Invalid token format"
        }),
      };
    }

    // Check for database connection string
    if (!process.env.DATABASE_URL && !process.env.NETLIFY_DATABASE_URL) {
      console.error("No database URL configured");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          authorized: false,
          message: "Server configuration error"
        }),
      };
    }

    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(connectionString);

    // Check user state in database - NEW SYNTAX
    console.log(`Checking user state for ID: ${userId}`);
    const userResult = await sql`
      SELECT state FROM "user" 
      WHERE user_id = ${userId}
    `;

    if (userResult.length === 0) {
      console.log("User not found in database");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          authorized: false,
          message: "User not found"
        }),
      };
    }

    const userState = userResult[0].state;
    console.log(`User state: ${userState}`);

    if (userState !== 1) {
      console.log("User is not logged in (state != 1)");
      
      // Optional: Update state to 0 if it's somehow not 0 already
      if (userState !== 0) {
        await sql`
          UPDATE "user" 
          SET state = 0 
          WHERE user_id = ${userId}
        `;
      }
      
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          authorized: false,
          message: "Session expired or logged out"
        }),
      };
    }

    console.log("✅ Authentication successful");
    
    // Prepare response
    const response = {
      authorized: true,
      user: {
        user_ID: userId,
        username: decoded.username,
        role: decoded.role
      }
    };

    // For Netlify Functions middleware, we can't modify context directly
    // Return the user data instead
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (err) {
    console.error("Auth error:", err.message);
    
    // Handle specific JWT errors
    let errorMessage = "Invalid token";
    if (err.name === "TokenExpiredError") {
      errorMessage = "Token expired";
    } else if (err.name === "JsonWebTokenError") {
      errorMessage = "Invalid token signature";
    } else if (err.name === "NotBeforeError") {
      errorMessage = "Token not active yet";
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        authorized: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    console.log("=== AUTH FUNCTION END ===");
  }
};