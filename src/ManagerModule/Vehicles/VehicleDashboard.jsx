import { useState, useEffect } from "react";

export default function VehicleDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    underRepair: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("jmtc_token");
      const response = await fetch("/.netlify/functions/getVehicles", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Dashboard - Vehicles loaded:", data);
      const vehicles = data.vehicles || [];

      const total = vehicles.length;
      const available = vehicles.filter((v) => v.status === "Available").length;
      const reserved = vehicles.filter((v) => v.status === "Reserved").length;
      const underRepair = vehicles.filter((v) => v.status === "Under Repair").length;

      setStats({ total, available, reserved, underRepair });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: "#fff",
    padding: "16px",
    borderRadius: "6px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
    flex: 1,
    minWidth: "140px",
  };

  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  };

  const numberStyle = {
    fontSize: "1.8rem",
    fontWeight: "bold",
    color: "#0e2a47",
    margin: "8px 0",
  };

  const labelStyle = {
    fontSize: "0.85rem",
    color: "#666",
    fontWeight: "500",
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "16px", color: "#0e2a47" }}>
        Dashboard
      </h2>
      <div style={containerStyle}>
        <div style={{ ...cardStyle, borderTop: "4px solid #0e2a47" }}>
          <div style={labelStyle}>Total Vehicles</div>
          <div style={numberStyle}>{stats.total}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #10b981" }}>
          <div style={labelStyle}>Available</div>
          <div style={numberStyle}>{stats.available}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #e5b038" }}>
          <div style={labelStyle}>Reserved</div>
          <div style={numberStyle}>{stats.reserved}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: "4px solid #ef4444" }}>
          <div style={labelStyle}>Under Repair</div>
          <div style={numberStyle}>{stats.underRepair}</div>
        </div>
      </div>
    </div>
  );
}