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
    const {
      reservation_id,
      customer_id,
      vehicle_id,
      startdate,
      enddate,
      handled_by,
      driver_id,
      reserv_status
    } = JSON.parse(event.body);

    if (!reservation_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "reservation_id is required" }),
      };
    }

    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(connectionString);

    const result = await sql`
      UPDATE reservation 
      SET 
        customer_id = COALESCE(${customer_id}, customer_id),
        vehicle_id = COALESCE(${vehicle_id}, vehicle_id),
        startdate = COALESCE(${startdate}, startdate),
        enddate = COALESCE(${enddate}, enddate),
        handled_by = COALESCE(${handled_by}, handled_by),
        driver_id = COALESCE(${driver_id}, driver_id),
        reserv_status = COALESCE(${reserv_status}, reserv_status)
      WHERE reservation_id = ${reservation_id}
      RETURNING *
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result[0]),
    };
  } catch (error) {
    console.error("Error updating reservation:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to update reservation" }),
    };
  }
};