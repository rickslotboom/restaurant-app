import React, { useState } from "react";
import { Order, OrderItem } from "../types";

type Props = {
  order: Order;
  onConfirm: (remainingItems: OrderItem[], method: "cash" | "pin", tip: number) => void;
  onCancel: () => void;
};

type SplitLine = {
  dishId: string;
  name: string;
  price: number;
  modifiers: { id: string; name: string; price: number }[];
  selected: boolean;
  discount: number;
  customDisc: string;
};

const DISC_OPTIONS = [0, 30, 50, 100];

export default function SplitPaymentModal({ order, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<"select" | "discount" | "method" | "tip" | "waiting">("select");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pin" | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  const [lines, setLines] = useState<SplitLine[]>(() =>
    order.items.flatMap((item) =>
      Array.from({ length: item.qty }, () => ({
        dishId: item.dishId,
        name: item.name,
        price: item.price,
        modifiers: item.modifiers ?? [],
        selected: false,
        discount: 0,
        customDisc: "",
      }))
    )
  );

  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderCustomDisc, setOrderCustomDisc] = useState<string>("");

  const tipOptions = [0, 1, 2, 5];

  const toggleLine = (idx: number) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, selected: !line.selected } : line))
    );
  };

  const setLineDisc = (idx: number, pct: number) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx ? { ...line, discount: pct, customDisc: "" } : line
      )
    );
  };

  const setLineDiscCustom = (idx: number, val: string) => {
    const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx ? { ...line, discount: pct, customDisc: val } : line
      )
    );
  };

  const selectedLines = lines.filter((l) => l.selected);
  const anySelected = selectedLines.length > 0;

  const lineFullPrice = (line: SplitLine) => {
    const modTotal = line.modifiers.reduce((s, m) => s + m.price, 0);
    return line.price + modTotal;
  };

  const subtotal = selectedLines.reduce(
    (sum, l) => sum + lineFullPrice(l) * (1 - l.discount / 100),
    0
  );
  const orderDiscAmt = subtotal * orderDiscount / 100;
  const total = subtotal - orderDiscAmt;
  const origSubtotal = selectedLines.reduce((sum, l) => sum + lineFullPrice(l), 0);
  const savings = origSubtotal - total;

  const handleCashConfirm = () => {
    const unselectedLines = lines.filter((l) => !l.selected);
    const remainingMap: Record<string, OrderItem> = {};
    unselectedLines.forEach((line) => {
      if (remainingMap[line.dishId]) {
        remainingMap[line.dishId].qty += 1;
      } else {
        remainingMap[line.dishId] = {
          dishId: line.dishId,
          name: line.name,
          price: line.price,
          qty: 1,
          modifiers: line.modifiers,
        };
      }
    });
    onConfirm(Object.values(remainingMap), "cash", tipAmount);
  };

  const handlePinClick = async () => {
    setPinError(null);
    setStep("waiting");

    try {
      const totalWithTip = total + tipAmount;

      // Unieke transactie ID voor dit split-deel
      const splitTransactionId = `${order.id}-split-${Date.now()}`;

      const response = await fetch("/api/sumup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: splitTransactionId,
          amount: parseFloat(totalWithTip.toFixed(2)),
          description: `Tafel ${order.table} (deel)`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Betaling aanmaken mislukt");
      }

      // Bij split-betaling slaan we de transactie ID niet op in de order
      // want de order wordt pas volledig "Betaald" als alle delen betaald zijn
      // De bediening bevestigt handmatig via onConfirm zodra de terminal betaald is
      // (we luisteren hier niet naar de webhook, want het is maar een deel)

      // Wachtstatus tonen — bediening klikt "Bevestigen" als klant heeft betaald
    } catch (error: any) {
      console.error("[SplitPaymentModal] Pin fout:", error.message);
      setPinError(error.message || "Er ging iets mis. Probeer opnieuw.");
      setStep("method");
    }
  };

  const handlePinConfirm = () => {
    // Bediening bevestigt handmatig dat de pin-betaling geslaagd is op de terminal
    const unselectedLines = lines.filter((l) => !l.selected);
    const remainingMap: Record<string, OrderItem> = {};
    unselectedLines.forEach((line) => {
      if (remainingMap[line.dishId]) {
        remainingMap[line.dishId].qty += 1;
      } else {
        remainingMap[line.dishId] = {
          dishId: line.dishId,
          name: line.name,
          price: line.price,
          qty: 1,
          modifiers: line.modifiers,
        };
      }
    });
    onConfirm(Object.values(remainingMap), "pin", tipAmount);
  };

  const discBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.35rem 0.6rem", borderRadius: "8px",
    border: `2px solid ${active ? "#2196F3" : "#ccc"}`,
    background: active ? "#e3f2fd" : "#fff",
    cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem",
  });

  const inputStyle: React.CSSProperties = {
    width: "70px", padding: "0.35rem", borderRadius: "6px",
    border: "1px solid #ccc", fontSize: "0.9rem",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "2rem",
        width: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ marginTop: 0 }}>Splits rekening — Tafel {order.table}</h3>

        {/* ── WACHTEN OP BETALING ── */}
        {step === "waiting" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💳</div>
            <h3 style={{ marginBottom: "0.5rem" }}>Wachten op betaling...</h3>
            <p style={{ color: "#555", marginBottom: "0.5rem" }}>
              Bedrag op de terminal: <strong>€{(total + tipAmount).toFixed(2)}</strong>
            </p>
            <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Vraag de klant zijn pas of telefoon tegen de terminal te houden.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button onClick={handlePinConfirm} style={{
                background: "#4CAF50", color: "white", border: "none",
                padding: "0.75rem 1.5rem", borderRadius: "8px",
                cursor: "pointer", fontWeight: "bold",
              }}>✅ Betaling geslaagd</button>
              <button onClick={onCancel} style={{
                background: "#eee", border: "none",
                padding: "0.75rem 1rem", borderRadius: "8px", cursor: "pointer",
              }}>Annuleren</button>
            </div>
          </div>
        )}

        {/* STAP 1: Selecteer items */}
        {step === "select" && (
          <>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Vink aan wat deze persoon afrekent:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {lines.map((line, idx) => (
                <label key={idx} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.75rem",
                  padding: "0.6rem 0.75rem", borderRadius: "8px", cursor: "pointer",
                  background: line.selected ? "#e3f2fd" : "#f9f9f9",
                  border: `2px solid ${line.selected ? "#2196F3" : "#e0e0e0"}`,
                }}>
                  <input type="checkbox" checked={line.selected}
                    onChange={() => toggleLine(idx)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{line.name}</span>
                      <span style={{ fontWeight: "bold" }}>€{lineFullPrice(line).toFixed(2)}</span>
                    </div>
                    {line.modifiers.map((mod, mIdx) => (
                      <div key={mIdx} style={{
                        display: "flex", justifyContent: "space-between",
                        paddingLeft: "0.75rem", fontSize: "0.8rem", color: "#555", marginTop: "2px",
                      }}>
                        <span>↳ {mod.name}</span>
                        {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                </label>
              ))}
            </div>

            <div style={{
              background: "#f5f5f5", borderRadius: "8px", padding: "0.75rem",
              marginBottom: "1rem", display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: "bold" }}>Geselecteerd:</span>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                €{selectedLines.reduce((s, l) => s + lineFullPrice(l), 0).toFixed(2)}
              </span>
            </div>

            <button onClick={() => setStep("discount")} disabled={!anySelected} style={{
              width: "100%", background: anySelected ? "#2196F3" : "#ccc",
              color: "white", border: "none", padding: "0.75rem",
              borderRadius: "8px", cursor: anySelected ? "pointer" : "not-allowed",
              fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem",
            }}>Verder →</button>
            <button onClick={onCancel} style={{
              width: "100%", background: "#fff", border: "1px solid #ccc",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}

        {/* STAP 2: Korting */}
        {step === "discount" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Korting per gerecht:</p>
            {selectedLines.map((line, i) => {
              const globalIdx = lines.indexOf(line);
              const orig = lineFullPrice(line);
              const final = orig * (1 - line.discount / 100);
              return (
                <div key={i} style={{
                  marginBottom: "0.85rem", paddingBottom: "0.85rem", borderBottom: "1px solid #eee",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: "500" }}>{line.name}</span>
                    <span>
                      {line.discount > 0 && (
                        <span style={{ textDecoration: "line-through", color: "#999", marginRight: "6px", fontSize: "0.85rem" }}>
                          €{orig.toFixed(2)}
                        </span>
                      )}
                      <strong>€{final.toFixed(2)}</strong>
                    </span>
                  </div>
                  {line.modifiers.map((mod, mIdx) => (
                    <div key={mIdx} style={{
                      display: "flex", justifyContent: "space-between",
                      paddingLeft: "1rem", fontSize: "0.8rem", color: "#555", marginBottom: "2px",
                    }}>
                      <span>↳ {mod.name}</span>
                      {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "0.4rem", marginBottom: "0.3rem" }}>
                    {DISC_OPTIONS.map(p => (
                      <button key={p} onClick={() => setLineDisc(globalIdx, p)}
                        style={discBtnStyle(line.discount === p && line.customDisc === "")}>
                        {p === 0 ? "Geen" : `${p}%`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.8rem" }}>Eigen %:</label>
                    <input type="number" min="0" max="100" step="1" placeholder="0"
                      value={line.customDisc}
                      onChange={e => setLineDiscCustom(globalIdx, e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>
              );
            })}

            <p style={{ fontWeight: "bold", margin: "0.75rem 0 0.5rem" }}>Korting op dit deel:</p>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "0.4rem" }}>
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
                  Besparing: −€{savings.toFixed(2)}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>
                Te betalen: €{total.toFixed(2)}
              </p>
            </div>

            <button onClick={() => setStep("method")} style={{
              width: "100%", background: "#2196F3", color: "white",
              border: "none", padding: "0.75rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem",
            }}>Doorgaan →</button>
            <button onClick={() => setStep("select")} style={{
              width: "100%", background: "#eee", border: "none",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", marginBottom: "0.5rem",
            }}>← Terug</button>
            <button onClick={onCancel} style={{
              width: "100%", background: "#fff", border: "1px solid #ccc",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}

        {/* STAP 3: Betaalmethode */}
        {step === "method" && (
          <>
            <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Overzicht:</p>
            <ul style={{ margin: "0 0 1rem 0", padding: 0, listStyle: "none" }}>
              {selectedLines.map((line, idx) => (
                <li key={idx} style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>{line.name}{line.discount > 0 && (
                      <span style={{ color: "#2e7d32", marginLeft: "6px", fontSize: "0.8rem" }}>−{line.discount}%</span>
                    )}</span>
                    <span>€{(lineFullPrice(line) * (1 - line.discount / 100)).toFixed(2)}</span>
                  </div>
                  {line.modifiers.map((mod, mIdx) => (
                    <div key={mIdx} style={{
                      display: "flex", justifyContent: "space-between",
                      paddingLeft: "1rem", fontSize: "0.8rem", color: "#555",
                    }}>
                      <span>↳ {mod.name}</span>
                      {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
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

            <p style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>Betaalmethode:</p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={() => setStep("tip")} style={{
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
            <button onClick={() => setStep("discount")} style={{
              width: "100%", background: "#eee", border: "none",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", marginBottom: "0.5rem",
            }}>← Terug</button>
            <button onClick={onCancel} style={{
              width: "100%", background: "#fff", border: "1px solid #ccc",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}

        {/* STAP 4: Fooi (alleen bij cash) */}
        {step === "tip" && (
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
              cursor: "pointer", fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem",
            }}>✅ Bevestig betaling</button>
            <button onClick={() => setStep("method")} style={{
              width: "100%", background: "#eee", border: "none",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", marginBottom: "0.5rem",
            }}>← Terug</button>
            <button onClick={onCancel} style={{
              width: "100%", background: "#fff", border: "1px solid #ccc",
              padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
            }}>Annuleren</button>
          </>
        )}
      </div>
    </div>
  );
}