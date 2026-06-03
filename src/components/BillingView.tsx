import React, { useState } from "react";
import { Order, OrderStatus } from "../types";
import PaymentModal from "./PaymentModal";

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

  const confirmOrder = confirmOrderId ? orders.find((o) => o.id === confirmOrderId) : null;

  const handlePaymentConfirm = (orderId: string, method: "cash" | "pin", tip: number) => {
    console.log("Betaald via:", method, "Fooi:", tip);
    onUpdateStatus(orderId, "Betaald");
    setConfirmOrderId(null);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Rekeningen</h2>

      {confirmOrder && (
        <PaymentModal
          order={confirmOrder}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setConfirmOrderId(null)}
        />
      )}

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