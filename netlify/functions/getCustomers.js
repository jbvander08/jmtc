import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("No database connection string configured");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Database connection not configured" }),
      };
    }

    const sql = neon(connectionString);

    console.log("Fetching customers...");
    const customers = await sql`
      SELECT customer_id, fullname, contactnumber, email
      FROM customer 
      ORDER BY fullname ASC
    `;

    console.log(`Found ${customers.length} customers`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ customers }),
    };
  } catch (error) {
    console.error("Database error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to fetch customers", details: error.toString() }),
    };
  }
};