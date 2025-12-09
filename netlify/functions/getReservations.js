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

    console.log("Fetching reservations...");
    const reservations = await sql`
      SELECT 
        r.reservation_id,
        r.startdate,
        r.enddate,
        r.reserv_status,
        r.vehicle_id,
        r.customer_id,
        r.driver_id,
        c.fullname as customer_name,
        c.contactnumber as contact_number,
        v.plate_number,
        v.brand,
        v.model,
        r.handled_by
      FROM reservation r
      LEFT JOIN customer c ON r.customer_id = c.customer_id
      LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      ORDER BY r.startdate DESC
    `;

    console.log(`Found ${reservations.length} reservations`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reservations }),
    };
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Failed to fetch reservations", details: error.toString() }),
    };
  }
};