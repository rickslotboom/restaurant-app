import React, { useState } from "react";
import { Order } from "../types";

type Props = {
  order: Order;
  onConfirm: (orderId: string, method: "cash" | "pin", tip: number) => void;
  onCancel: () => void;
};

const DISC_OPTIONS = [0, 30, 50, 100];

export default function PaymentModal({ order, onConfirm, onCancel }: Props) {
  const [paymentStep, setPaymentStep] = useState<"discount" | "method" | "tip">("discount");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pin" | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

  // Per-item discounts
  const [itemDiscounts, setItemDiscounts] = useState<number[]>(order.items.map(() => 0));
  const [itemCustomDisc, setItemCustomDisc] = useState<string[]>(order.items.map(() => ""));
  // Order-level discount
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderCustomDisc, setOrderCustomDisc] = useState<string>("");

  const tipOptions = [0, 1, 2, 5];

  const subtotal = order.items.reduce(
    (sum, item, i) => sum + item.price * item.qty * (1 - itemDiscounts[i] / 100),
    0
  );
  const orderDiscAmt = subtotal * orderDiscount / 100;
  const total = subtotal - orderDiscAmt;
  const origTotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const savings = origTotal - total;

  const setItemDisc = (i: number, pct: number) => {
    const d = [...itemDiscounts]; d[i] = pct;
    const c = [...itemCustomDisc]; c[i] = "";
    setItemDiscounts(d); setItemCustomDisc(c);
  };

  const setItemDiscCustom = (i: number, val: string) => {
    const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
    const d = [...itemDiscounts]; d[i] = pct;
    const c = [...itemCustomDisc]; c[i] = val;
    setItemDiscounts(d); setItemCustomDisc(c);
  };

  const handleMethodSelect = (method: "cash" | "pin") => {
    setPaymentMethod(method);
    setPaymentStep("tip");
  };

  const handleConfirmPayment = () => {
    if (!paymentMethod) return;
    onConfirm(order.id, paymentMethod, tipAmount);
  };

  const inputStyle = {
    width: "80px", padding: "0.4rem", borderRadius: "6px",
    border: "1px solid #ccc", fontSize: "0.95rem",
  };
  const discBtnStyle = (active: boolean) => ({
    padding: "0.4rem 0.7rem", borderRadius: "8px",
    border: `2px solid ${active ? "#2196F3" : "#ccc"}`,
    background: active ? "#e3f2fd" : "#fff",
    cursor: "pointer", fontWeight: "bold" as const, fontSize: "0.85rem",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "2rem",
        width: "380px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ marginTop: 0 }}>Afrekenen — Tafel {order.table}</h3>

        {/* Stap 1: Korting */}
        {paymentStep === "discount" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Korting per regel:</p>
            {order.items.map((item, i) => {
              const orig = item.price * item.qty;
              const disc = itemDiscounts[i];
              const final = orig * (1 - disc / 100);
              return (
                <div key={i} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span>{item.qty}× {item.name}</span>
                    <span>
                      {disc > 0 && (
                        <span style={{ textDecoration: "line-through", color: "#999", marginRight: "6px" }}>
                          €{orig.toFixed(2)}
                        </span>
                      )}
                      <strong>€{final.toFixed(2)}</strong>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                    {DISC_OPTIONS.map(p => (
                      <button key={p} onClick={() => setItemDisc(i, p)}
                        style={discBtnStyle(disc === p && itemCustomDisc[i] === "")}>
                        {p === 0 ? "Geen" : `${p}%`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem" }}>Eigen %:</label>
                    <input type="number" min="0" max="100" step="1" placeholder="0"
                      value={itemCustomDisc[i]}
                      onChange={e => setItemDiscCustom(i, e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>
              );
            })}

            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Korting op hele order:</p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "0.4rem" }}>
              {DISC_OPTIONS.map(p => (
                <button key={p} onClick={() => { setOrderDiscount(p); setOrderCustomDisc(""); }}
                  style={discBtnStyle(orderDiscount === p && orderCustomDisc === "")}>
                  {p === 0 ? "Geen" : `${p}%`}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem" }}>Eigen %:</label>
              <input type="number" min="0" max="100" step="1" placeholder="0"
                value={orderCustomDisc}
                onChange={e => {
                  setOrderCustomDisc(e.target.value);
                  setOrderDiscount(Math.min(100, parseFloat(e.target.value) || 0));
                }}
                style={inputStyle} />
            </div>

            <div style={{ background: "#f5f5f5", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem" }}>
              {savings > 0.001 && (
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.9rem", color: "#2e7d32" }}>
                  Besparing: €{savings.toFixed(2)}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>
                Te betalen: €{total.toFixed(2)}
              </p>
            </div>

            <button onClick={() => setPaymentStep("method")} style={{
              width: "100%", background: "#2196F3", color: "white",
              border: "none", padding: "0.75rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "1rem", fontWeight: "bold",
            }}>
              Doorgaan →
            </button>
            <button onClick={onCancel} style={{
              marginTop: "0.5rem", width: "100%", background: "#fff",
              border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px",
              cursor: "pointer", color: "#d9534f",
            }}>
              Annuleren
            </button>
          </>
        )}

        {/* Stap 2: Betaalmethode */}
        {paymentStep === "method" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Betaalmethode:</p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => handleMethodSelect("cash")} style={{
                flex: 1, background: "#4CAF50", color: "white",
                border: "none", padding: "0.75rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "1rem",
              }}>💵 Cash</button>
              <button onClick={() => handleMethodSelect("pin")} style={{
                flex: 1, background: "#2196F3", color: "white",
                border: "none", padding: "0.75rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "1rem",
              }}>💳 Pin</button>
            </div>
            <button onClick={() => setPaymentStep("discount")} style={{
              marginTop: "0.75rem", width: "100%", background: "#eee",
              border: "none", padding: "0.5rem", borderRadius: "8px", cursor: "pointer",
            }}>← Terug</button>
          </>
        )}

        {/* Stap 3: Fooi */}
        {paymentStep === "tip" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Fooi toevoegen?</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {tipOptions.map((t) => (
                <button key={t} onClick={() => { setTipAmount(t); setCustomTip(""); }}
                  style={{
                    padding: "0.5rem 0.75rem", borderRadius: "8px", border: "2px solid",
                    borderColor: tipAmount === t && customTip === "" ? "#2196F3" : "#ccc",
                    background: tipAmount === t && customTip === "" ? "#e3f2fd" : "#fff",
                    cursor: "pointer", fontWeight: "bold",
                  }}>
                  {t === 0 ? "Geen fooi" : `€${t}`}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.9rem" }}>Ander bedrag:</label>
              <input type="number" min="0" step="0.50" placeholder="€ 0.00" value={customTip}
                onChange={e => { setCustomTip(e.target.value); setTipAmount(parseFloat(e.target.value) || 0); }}
                style={{ width: "80px", padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }} />
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                Betaalmethode: <strong>{paymentMethod === "cash" ? "💵 Cash" : "💳 Pin"}</strong>
              </p>
              {savings > 0.001 && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#2e7d32" }}>
                  Korting toegepast: −€{savings.toFixed(2)}
                </p>
              )}
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#555" }}>
                Fooi: <strong>€{tipAmount.toFixed(2)}</strong>
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "1rem", fontWeight: "bold" }}>
                Totaal incl. fooi: €{(total + tipAmount).toFixed(2)}
              </p>
            </div>
            <button onClick={handleConfirmPayment} style={{
              width: "100%", background: "#4CAF50", color: "white",
              border: "none", padding: "0.75rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "1rem", fontWeight: "bold",
            }}>✅ Bevestig betaling</button>
            <button onClick={() => setPaymentStep("method")} style={{
              marginTop: "0.5rem", width: "100%", background: "#eee",
              border: "none", padding: "0.5rem", borderRadius: "8px", cursor: "pointer",
            }}>← Terug</button>
          </>
        )}
      </div>
    </div>
  );
}