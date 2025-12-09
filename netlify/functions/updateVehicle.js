import { neon } from '@neondatabase/serverless';

export const handler = async (event) => {
  if (event.httpMethod !== "PUT") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { vehicle_id, brand, model, plate_number, status } = body;

    if (!vehicle_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "vehicle_id is required" }),
      };
    }

    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(connectionString);

    const result = await sql`
      UPDATE vehicle 
      SET 
        brand = COALESCE(${brand}, brand),
        model = COALESCE(${model}, model),
        plate_number = COALESCE(${plate_number}, plate_number),
        status = COALESCE(${status}, status)
      WHERE vehicle_id = ${vehicle_id}
      RETURNING *
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to update vehicle" }),
    };
  }
};