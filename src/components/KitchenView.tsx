import React, { useState } from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onLogout: () => void;
};

export default function KitchenView({ orders, onUpdateStatus, onLogout }: Props) {
  const [tab, setTab] = useState<"open" | "history">("open");

  const openOrders = orders.filter((o) => o.status === "Open");
  const historyOrders = orders.filter((o) => o.status === "Afgehandeld");
  const displayed = tab === "open" ? openOrders : historyOrders;

  // 🔹 Helper om timestamp te formatteren
  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const dagNamen = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
    const dag = dagNamen[d.getDay()];
    const datum = d.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
    const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    return `${dag} ${datum} — ${tijd}`;
  };

  return (
    <div style={{ padding: "1rem", position: "relative" }}>
      {/* Uitloggen */}
      <button
        onClick={onLogout}
        style={{
          position: "absolute",
          right: "1rem",
          top: "1rem",
          background: "#d9534f",
          color: "white",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Uitloggen
      </button>

      <h2>Keukenoverzicht</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setTab("open")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            background: tab === "open" ? "#2196F3" : "#eee",
            color: tab === "open" ? "white" : "black",
          }}
        >
          Open orders ({openOrders.length})
        </button>

        <button
          onClick={() => setTab("history")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            background: tab === "history" ? "#2196F3" : "#eee",
            color: tab === "history" ? "white" : "black",
          }}
        >
          Geschiedenis ({historyOrders.length})
        </button>
      </div>

      {/* Orders lijst */}
      {displayed.length === 0 ? (
        <p>Geen bestellingen.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {displayed.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #ccc",
                borderRadius: "10px",
                padding: "1rem",
                backgroundColor: order.status === "Afgehandeld" ? "#e8f5e9" : "#fff",
              }}
            >
              <h3 style={{ marginBottom: "0.3rem" }}>🍽️ Tafel {order.table}</h3>
              
              {order.timestamp && (
                <p style={{ fontSize: "0.9rem", color: "#555", margin: "0 0 0.5rem 0" }}>
                  {formatTimestamp(order.timestamp)}
                </p>
              )}

              {order.waiter && (
                <p style={{ fontSize: "0.9rem", color: "#555", margin: "0 0 0.5rem 0" }}>
                  Bediener: {order.waiter}
                </p>
              )}

              <ul style={{ margin: "0.5rem 0" }}>
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.qty}× {item.name}
                  </li>
                ))}
              </ul>

              {/* Actiebutton alleen voor open orders */}
              {order.status === "Open" && tab === "open" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "Afgehandeld")}
                  style={{
                    marginTop: "0.5rem",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Markeer als klaar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
