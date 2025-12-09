import { neon } from '@neondatabase/serverless';

export const handler = async (event) => {
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
    // Check for database connection
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("No database connection string configured");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Database connection not configured" }),
      };
    }

    const sql = neon(connectionString);

    console.log("Fetching vehicles...");
    const vehicles = await sql`
      SELECT 
        v.vehicle_id,
        v.brand,
        v.model,
        v.plate_number,
        v.status,
        COALESCE((SELECT current_odometer FROM usage_log WHERE vehicle_id = v.vehicle_id ORDER BY timestamp DESC LIMIT 1), 0) as latest_odometer
      FROM vehicle v
      ORDER BY v.plate_number
    `;

    console.log(`Found ${vehicles.length} vehicles`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ vehicles }),
    };
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to fetch vehicles", details: error.toString() }),
    };
  }
};