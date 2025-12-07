// netlify/functions/checkOverdueVehicles.js
import { neon } from '@neondatabase/serverless';

export const handler = async (event) => {
  const driver_id = event.queryStringParameters?.driver_id;

  if (!driver_id) {
    return { 
      statusCode: 400, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Missing driver_id" }) 
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Get current date
    const now = new Date();
    
    // Find trips that ended MORE THAN 2 HOURS AGO but still have "ongoing" status
    // This gives drivers reasonable travel time back to headquarters
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago

    const result = await sql`
      SELECT 
        r.reservation_id,
        r.enddate,
        r.reserv_status,
        c.fullname AS customer_name,
        v.brand,
        v.model,
        v.plate_number,
        v.vehicle_id,
        -- Calculate how many hours overdue
        EXTRACT(EPOCH FROM (NOW() - r.enddate)) / 3600 as hours_overdue
      FROM reservation r
      LEFT JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      LEFT JOIN customer c ON r.customer_id = c.customer_id
      WHERE r.driver_id = ${driver_id}
        AND r.enddate < ${twoHoursAgo.toISOString()} -- Only trips that ended 2+ hours ago
        AND r.reserv_status IN ('ongoing', 'active', 'OnGoing', 'Active', 'Ongoing')
      ORDER BY r.enddate ASC
    `;

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        overdue_vehicles: result,
        count: result.length,
        current_date: now.toISOString(),
        check_time: now.toLocaleTimeString()
      }),
    };
  } catch (err) {
    console.error("Error checking overdue vehicles:", err);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: "Server Error" }) 
    };
  }
};