import React, { useState } from "react";
import { Order } from "../types";
import { useOrdersContext } from "../hooks/useOrders";

type Props = {
  order: Order;
  onConfirm: (orderId: string, method: "cash" | "pin", tip: number) => void;
  onCancel: () => void;
};

const DISC_OPTIONS = [0, 30, 50, 100];

const itemFullPrice = (item: Order["items"][0]) => {
  const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.price, 0);
  return (item.price + modTotal) * item.qty;
};

export default function PaymentModal({ order, onConfirm, onCancel }: Props) {
  
  const [paymentStep, setPaymentStep] = useState<"discount" | "method" | "tip" | "waiting">("discount");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [setPaymentMethod] = useState<"cash" | "pin" | null>(null);

  const [itemDiscounts, setItemDiscounts] = useState<number[]>(order.items.map(() => 0));
  const [itemCustomDisc, setItemCustomDisc] = useState<string[]>(order.items.map(() => ""));
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderCustomDisc, setOrderCustomDisc] = useState<string>("");

  const tipOptions = [0, 1, 2, 5];

  const subtotal = order.items.reduce(
    (sum, item, i) => sum + itemFullPrice(item) * (1 - itemDiscounts[i] / 100),
    0
  );
  const orderDiscAmt = subtotal * orderDiscount / 100;
  const total = subtotal - orderDiscAmt;
  const origTotal = order.items.reduce((sum, item) => sum + itemFullPrice(item), 0);
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

  const handleCashConfirm = () => {
    onConfirm(order.id, "cash", tipAmount);
  };

  const handlePinClick = async () => {
    setPinError(null);
    setPaymentStep("waiting");

    try {
      const totalWithTip = total + tipAmount;

      // Sla sumupTransactionId op in Firestore bij de order
      // We gebruiken het order ID als client_transaction_id zodat de webhook hem kan vinden
      const response = await fetch("/api/sumup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          amount: parseFloat(totalWithTip.toFixed(2)),
          description: `Tafel ${order.table}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Betaling aanmaken mislukt");
      }

      // Sla de transactie ID op in de order in Firestore
      // zodat de webhook de juiste order kan vinden
      await fetch("/api/update-order-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          sumupTransactionId: data.clientTransactionId,
        }),
      });

      // Modal blijft open met "Wachten op betaling..." totdat webhook de status bijwerkt
      // De webhook zet de order op "Betaald" en de UI update automatisch via Firestore onSnapshot

    } catch (error: any) {
      console.error("[PaymentModal] Pin fout:", error.message);
      setPinError(error.message || "Er ging iets mis. Probeer opnieuw.");
      setPaymentStep("method");
    }
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

  const ItemOverview = ({ showDiscount = false }: { showDiscount?: boolean }) => (
    <ul style={{ margin: "0 0 1rem 0", padding: 0, listStyle: "none" }}>
      {order.items.map((item, i) => {
        const disc = itemDiscounts[i];
        const orig = itemFullPrice(item);
        const final = orig * (1 - disc / 100);
        return (
          <li key={i} style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
              <span style={{ fontWeight: "500" }}>{item.qty}× {item.name}</span>
              <span>
                {showDiscount && disc > 0 && (
                  <span style={{ textDecoration: "line-through", color: "#999", marginRight: "6px", fontSize: "0.8rem" }}>
                    €{orig.toFixed(2)}
                  </span>
                )}
                €{final.toFixed(2)}
              </span>
            </div>
            {(item.modifiers ?? []).map((mod, mIdx) => (
              <div key={mIdx} style={{
                display: "flex", justifyContent: "space-between",
                paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#555", marginBottom: "2px",
              }}>
                <span>↳ {mod.name}</span>
                {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
              </div>
            ))}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "2rem",
        width: "400px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ marginTop: 0 }}>Afrekenen — Tafel {order.table}</h3>

        {/* ── WACHTEN OP BETALING ── */}
        {paymentStep === "waiting" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💳</div>
            <h3 style={{ marginBottom: "0.5rem" }}>Wachten op betaling...</h3>
            <p style={{ color: "#555", marginBottom: "0.5rem" }}>
              Bedrag op de terminal: <strong>€{(total + tipAmount).toFixed(2)}</strong>
            </p>
            <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Vraag de klant zijn pas of telefoon tegen de terminal te houden.
              De bon wordt automatisch verwerkt zodra de betaling geslaagd is.
            </p>
            <button onClick={onCancel} style={{
              background: "#eee", border: "none", padding: "0.5rem 1rem",
              borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem",
            }}>
              Annuleren
            </button>
          </div>
        )}

        {/* ── STAP 1: KORTING ── */}
        {paymentStep === "discount" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Korting per regel:</p>
            {order.items.map((item, i) => {
              const orig = itemFullPrice(item);
              const disc = itemDiscounts[i];
              const final = orig * (1 - disc / 100);
              return (
                <div key={i} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: "500" }}>{item.qty}× {item.name}</span>
                    <span>
                      {disc > 0 && (
                        <span style={{ textDecoration: "line-through", color: "#999", marginRight: "6px" }}>
                          €{orig.toFixed(2)}
                        </span>
                      )}
                      <strong>€{final.toFixed(2)}</strong>
                    </span>
                  </div>
                  {(item.modifiers ?? []).map((mod, mIdx) => (
                    <div key={mIdx} style={{
                      display: "flex", justifyContent: "space-between",
                      paddingLeft: "1.25rem", fontSize: "0.82rem", color: "#555", marginBottom: "0.2rem",
                    }}>
                      <span>↳ {mod.name}</span>
                      {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "0.5rem", marginBottom: "0.4rem" }}>
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
            }}>Doorgaan →</button>
            <button onClick={onCancel} style={{
              marginTop: "0.5rem", width: "100%", background: "#fff",
              border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px",
              cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}

        {/* ── STAP 2: BETAALMETHODE ── */}
        {paymentStep === "method" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Overzicht:</p>
            <ItemOverview showDiscount />
            {savings > 0.001 && (
              <p style={{ fontSize: "0.9rem", color: "#2e7d32", margin: "0 0 0.25rem" }}>
                Korting: −€{savings.toFixed(2)}
              </p>
            )}
            <strong style={{ fontSize: "1.1rem", display: "block", marginBottom: "1rem" }}>
              Totaal: €{total.toFixed(2)}
            </strong>

            {pinError && (
              <div style={{
                background: "#fff5f5", border: "1px solid #ffcccc",
                borderRadius: "8px", padding: "0.75rem", marginBottom: "1rem",
                color: "#d9534f", fontSize: "0.9rem",
              }}>
                ❌ {pinError}
              </div>
            )}

            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Betaalmethode:</p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => { setPaymentMethod("cash"); setPaymentStep("tip"); }} style={{
                flex: 1, background: "#4CAF50", color: "white",
                border: "none", padding: "0.75rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "1rem",
              }}>💵 Cash</button>
              <button onClick={handlePinClick} style={{
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

        {/* ── STAP 3: FOOI (alleen bij cash) ── */}
        {paymentStep === "tip" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Overzicht:</p>
            <ItemOverview showDiscount />

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
                Betaalmethode: <strong>💵 Cash</strong>
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

            <button onClick={handleCashConfirm} style={{
              width: "100%", background: "#4CAF50", color: "white",
              border: "none", padding: "0.75rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "1rem", fontWeight: "bold",
            }}>✅ Bevestig betaling</button>
            <button onClick={() => setPaymentStep("method")} style={{
              marginTop: "0.5rem", width: "100%", background: "#eee",
              border: "none", padding: "0.5rem", borderRadius: "8px", cursor: "pointer",
            }}>← Terug</button>
            <button onClick={onCancel} style={{
              marginTop: "0.5rem", width: "100%", background: "#fff",
              border: "1px solid #ccc", padding: "0.5rem", borderRadius: "8px",
              cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}
      </div>
    </div>
  );
}