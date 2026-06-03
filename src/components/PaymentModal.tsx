import React, { useState } from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  order: Order;
  onConfirm: (orderId: string, method: "cash" | "pin", tip: number) => void;
  onCancel: () => void;
};

export default function PaymentModal({ order, onConfirm, onCancel }: Props) {
  const [paymentStep, setPaymentStep] = useState<"method" | "tip">("method");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pin" | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

  const tipOptions = [0, 1, 2, 5];
  const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleMethodSelect = (method: "cash" | "pin") => {
    setPaymentMethod(method);
    setPaymentStep("tip");
  };

  const handleConfirmPayment = () => {
    if (!paymentMethod) return;
    onConfirm(order.id, paymentMethod, tipAmount);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "2rem",
        width: "340px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ marginTop: 0 }}>Afrekenen — Tafel {order.table}</h3>

        <ul style={{ margin: "0.5rem 0 0.75rem 0", paddingLeft: "1.2rem" }}>
          {order.items.map((item, idx) => (
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
                  onClick={() => { setTipAmount(t); setCustomTip(""); }}
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
          onClick={onCancel}
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
  );
}