import React, { useState } from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

export default function BillingView({ orders, onUpdateStatus }: Props) {
  const [tab, setTab] = useState<"open" | "paid">("open");
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  const openBills = orders.filter((o) => o.status !== "Betaald");
  const paidBills = orders.filter((o) => o.status === "Betaald");
  const displayed = tab === "open" ? openBills : paidBills;

  const getTotal = (order: Order) =>
    order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("nl-NL", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const handleCash = (orderId: string) => {
    console.log("handleCash aangeroepen voor order:", orderId);
    onUpdateStatus(orderId, "Betaald");
    setConfirmOrderId(null);
  };

  const confirmOrder = confirmOrderId ? orders.find((o) => o.id === confirmOrderId) : null;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Rekeningen</h2>

      {/* Betaal modal */}
      {confirmOrder && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "2rem",
            width: "320px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ marginTop: 0 }}>Afrekenen — Tafel {confirmOrder.table}</h3>
            <ul style={{ margin: "0.5rem 0 1rem 0" }}>
              {confirmOrder.items.map((item, idx) => (
                <li key={idx}>{item.qty}× {item.name} — €{(item.price * item.qty).toFixed(2)}</li>
              ))}
            </ul>
            <strong style={{ fontSize: "1.1rem" }}>Totaal: €{getTotal(confirmOrder).toFixed(2)}</strong>

            <p style={{ marginTop: "1rem", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Betaalmethode:
            </p>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => handleCash(confirmOrder.id)}
                style={{
                  flex: 1, background: "#4CAF50", color: "white",
                  border: "none", padding: "0.75rem", borderRadius: "8px",
                  cursor: "pointer", fontSize: "1rem",
                }}
              >
                💵 Cash
              </button>
            </div>

            <button
              onClick={() => setConfirmOrderId(null)}
              style={{
                marginTop: "1rem", width: "100%", background: "#eee",
                border: "none", padding: "0.5rem", borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setTab("open")}
          style={{
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: tab === "open" ? "#2196F3" : "#eee",
            color: tab === "open" ? "white" : "black",
          }}
        >
          Open bonnen ({openBills.length})
        </button>
        <button
          onClick={() => setTab("paid")}
          style={{
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: tab === "paid" ? "#2196F3" : "#eee",
            color: tab === "paid" ? "white" : "black",
          }}
        >
          Betaalde bonnen ({paidBills.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <p>Geen bonnen.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {displayed.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #ccc", borderRadius: "10px", padding: "1rem",
                backgroundColor: order.status === "Betaald" ? "#e8f5e9" : "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 0.3rem 0" }}>🍽️ Tafel {order.table}</h3>
              <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem", color: "#555" }}>
                {formatTimestamp(order.timestamp)} — Bediener: {order.waiter}
              </p>
              <p style={{ margin: "0 0 0.3rem 0", fontSize: "0.9rem", color: "#888" }}>
                Status: {order.status}
              </p>

              <ul style={{ margin: "0.5rem 0" }}>
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.qty}× {item.name} — €{(item.price * item.qty).toFixed(2)}
                  </li>
                ))}
              </ul>

              <strong>Totaal: €{getTotal(order).toFixed(2)}</strong>

              {tab === "open" && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={() => setConfirmOrderId(order.id)}
                    style={{
                      background: "#4CAF50", color: "white", border: "none",
                      padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer",
                    }}
                  >
                    ✅ Afrekenen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}