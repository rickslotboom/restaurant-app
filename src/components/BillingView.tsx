import React, { useState } from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

type PaymentStep = "method" | "tip" | null;

export default function BillingView({ orders, onUpdateStatus }: Props) {
  const [tab, setTab] = useState<"open" | "paid">("open");
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pin" | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

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

  const handleAfrekenen = (orderId: string) => {
    console.log("Afrekenen geklikt, orderId:", orderId);
    setConfirmOrderId(orderId);
    setPaymentStep("method");
    setPaymentMethod(null);
    setTipAmount(0);
    setCustomTip("");
  };

  const handleMethodSelect = (method: "cash" | "pin") => {
    setPaymentMethod(method);
    setPaymentStep("tip");
  };

  const handleTipSelect = (amount: number) => {
    setTipAmount(amount);
  };

  const handleConfirmPayment = () => {
    if (!confirmOrderId) return;
    console.log("Betaald via:", paymentMethod, "Fooi:", tipAmount);
    onUpdateStatus(confirmOrderId, "Betaald");
    setConfirmOrderId(null);
    setPaymentStep(null);
    setPaymentMethod(null);
    setTipAmount(0);
    setCustomTip("");
  };

  const handleCancel = () => {
    setConfirmOrderId(null);
    setPaymentStep(null);
    setPaymentMethod(null);
    setTipAmount(0);
    setCustomTip("");
  };

  const confirmOrder = confirmOrderId ? orders.find((o) => o.id === confirmOrderId) : null;
  const total = confirmOrder ? getTotal(confirmOrder) : 0;

  const tipOptions = [0, 1, 2, 5];

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Rekeningen</h2>

      {/* Modal */}
      {confirmOrder && paymentStep && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "2rem",
            width: "340px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ marginTop: 0 }}>Afrekenen — Tafel {confirmOrder.table}</h3>

            <ul style={{ margin: "0.5rem 0 0.75rem 0", paddingLeft: "1.2rem" }}>
              {confirmOrder.items.map((item, idx) => (
                <li key={idx}>{item.qty}× {item.name} — €{(item.price * item.qty).toFixed(2)}</li>
              ))}
            </ul>
            <strong style={{ fontSize: "1.1rem" }}>Totaal: €{total.toFixed(2)}</strong>

            {/* Stap 1: Betaalmethode */}
            {paymentStep === "method" && (
              <>
                <p style={{ marginTop: "1.25rem", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  Betaalmethode:
                </p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={() => handleMethodSelect("cash")}
                    style={{
                      flex: 1, background: "#4CAF50", color: "white",
                      border: "none", padding: "0.75rem", borderRadius: "8px",
                      cursor: "pointer", fontSize: "1rem",
                    }}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => handleMethodSelect("pin")}
                    style={{
                      flex: 1, background: "#2196F3", color: "white",
                      border: "none", padding: "0.75rem", borderRadius: "8px",
                      cursor: "pointer", fontSize: "1rem",
                    }}
                  >
                    💳 Pin
                  </button>
                </div>
              </>
            )}

            {/* Stap 2: Fooi */}
            {paymentStep === "tip" && (
              <>
                <p style={{ marginTop: "1.25rem", marginBottom: "0.5rem", fontWeight: "bold" }}>
                  Fooi toevoegen?
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {tipOptions.map((t) => (
                    <button
                      key={t}
                      onClick={() => { handleTipSelect(t); setCustomTip(""); }}
                      style={{
                        padding: "0.5rem 0.75rem", borderRadius: "8px",
                        border: "2px solid",
                        borderColor: tipAmount === t && customTip === "" ? "#2196F3" : "#ccc",
                        background: tipAmount === t && customTip === "" ? "#e3f2fd" : "#fff",
                        cursor: "pointer", fontWeight: "bold",
                      }}
                    >
                      {t === 0 ? "Geen fooi" : `€${t}`}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.9rem" }}>Ander bedrag:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="€ 0.00"
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value);
                      setTipAmount(parseFloat(e.target.value) || 0);
                    }}
                    style={{
                      width: "80px", padding: "0.4rem", borderRadius: "6px",
                      border: "1px solid #ccc", fontSize: "0.95rem",
                    }}
                  />
                </div>

                <div style={{ background: "#f5f5f5", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                    Betaalmethode: <strong>{paymentMethod === "cash" ? "💵 Cash" : "💳 Pin"}</strong>
                  </p>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#555" }}>
                    Fooi: <strong>€{tipAmount.toFixed(2)}</strong>
                  </p>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "1rem", fontWeight: "bold" }}>
                    Totaal incl. fooi: €{(total + tipAmount).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  style={{
                    width: "100%", background: "#4CAF50", color: "white",
                    border: "none", padding: "0.75rem", borderRadius: "8px",
                    cursor: "pointer", fontSize: "1rem", fontWeight: "bold",
                  }}
                >
                  ✅ Bevestig betaling
                </button>

                <button
                  onClick={() => setPaymentStep("method")}
                  style={{
                    marginTop: "0.5rem", width: "100%", background: "#eee",
                    border: "none", padding: "0.5rem", borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ← Terug
                </button>
              </>
            )}

            <button
              onClick={handleCancel}
              style={{
                marginTop: "0.5rem", width: "100%", background: "#fff",
                border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px",
                cursor: "pointer", color: "#d9534f",
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
                    onClick={() => handleAfrekenen(order.id)}
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