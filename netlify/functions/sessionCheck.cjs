import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

/**
 * Verifies a user's JWT token and checks if the user is logged in.
 * If the token is invalid or the user is not active, it updates state to 0.
 * @param {string} token - JWT token from the client
 * @returns {object} decoded user info if valid
 * @throws Error if token is missing, invalid, expired, or user not logged in
 */
export const verifyUser = async (token) => {
  if (!token) throw new Error("Missing token");

  try {
    // Verify token (throws if invalid or expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Initialize Neon SQL client
    const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

    // Fetch user state
    const result = await sql(
      'SELECT state FROM "user" WHERE "user_ID" = $1',
      [decoded.user_ID]
    );

    if (result.length === 0) {
      throw new Error("User not found");
    }

    const userState = result[0].state;

    if (userState !== 1) {
      throw new Error("User is not logged in");
    }

    return decoded; // user is authenticated
  } catch (err) {
    // Optional: Force logout if token invalid or expired
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      try {
        const decoded = jwt.decode(token); // decode without verifying
        if (decoded?.user_ID) {
          const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
          await sql(
            'UPDATE "user" SET state = 0 WHERE "user_ID" = $1',
            [decoded.user_ID]
          );
        }
      } catch (updateError) {
        // ignore update errors during cleanup
        console.error('Failed to update user state:', updateError.message);
      }
    }

    // Throw the error for the API function to handle
    throw new Error(err.message || "Authentication failed");
  }
};