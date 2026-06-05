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
  selected: boolean;
};

export default function SplitPaymentModal({ order, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<"select" | "method" | "tip">("select");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pin" | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");

  // Splits elk item uit naar losse regels per stuk
  const [lines, setLines] = useState<SplitLine[]>(() =>
    order.items.flatMap((item) =>
      Array.from({ length: item.qty }, (_, i) => ({
        dishId: item.dishId,
        name: item.name,
        price: item.price,
        selected: false,
      }))
    )
  );

  const tipOptions = [0, 1, 2, 5];

  const toggleLine = (idx: number) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, selected: !line.selected } : line))
    );
  };

  const selectedLines = lines.filter((l) => l.selected);
  const selectedTotal = selectedLines.reduce((sum, l) => sum + l.price, 0);
  const anySelected = selectedLines.length > 0;

  const handleMethodSelect = (method: "cash" | "pin") => {
    setPaymentMethod(method);
    setStep("tip");
  };

  const handleConfirm = () => {
    if (!paymentMethod) return;

    // Bereken resterende items
    const remaining = [...lines];
    selectedLines.forEach((sel) => {
      
    });

    // Bouw resterende items terug op vanuit niet-geselecteerde regels
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
        };
      }
    });

    onConfirm(Object.values(remainingMap), paymentMethod, tipAmount);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "white", borderRadius: "12px", padding: "2rem",
        width: "380px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ marginTop: 0 }}>Splits rekening — Tafel {order.table}</h3>

        {/* STAP 1: Selecteer items */}
        {step === "select" && (
          <>
            <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Vink aan wat deze persoon afrekent:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {lines.map((line, idx) => (
                <label
                  key={idx}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.6rem 0.75rem", borderRadius: "8px", cursor: "pointer",
                    background: line.selected ? "#e3f2fd" : "#f9f9f9",
                    border: `2px solid ${line.selected ? "#2196F3" : "#e0e0e0"}`,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={line.selected}
                    onChange={() => toggleLine(idx)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ flex: 1 }}>{line.name}</span>
                  <span style={{ fontWeight: "bold" }}>€{line.price.toFixed(2)}</span>
                </label>
              ))}
            </div>

            <div style={{
              background: "#f5f5f5", borderRadius: "8px", padding: "0.75rem",
              marginBottom: "1rem", display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: "bold" }}>Te betalen:</span>
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                €{selectedTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => setStep("method")}
              disabled={!anySelected}
              style={{
                width: "100%", background: anySelected ? "#2196F3" : "#ccc",
                color: "white", border: "none", padding: "0.75rem",
                borderRadius: "8px", cursor: anySelected ? "pointer" : "not-allowed",
                fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem",
              }}
            >
              Verder →
            </button>

            <button
              onClick={onCancel}
              style={{
                width: "100%", background: "#fff", border: "1px solid #ccc",
                padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
              }}
            >
              Annuleren
            </button>
          </>
        )}

        {/* STAP 2: Betaalmethode */}
        {step === "method" && (
          <>
            <ul style={{ margin: "0 0 0.75rem 0", paddingLeft: "1.2rem" }}>
              {selectedLines.map((line, idx) => (
                <li key={idx}>{line.name} — €{line.price.toFixed(2)}</li>
              ))}
            </ul>
            <strong style={{ fontSize: "1.1rem" }}>Totaal: €{selectedTotal.toFixed(2)}</strong>

            <p style={{ marginTop: "1.25rem", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Betaalmethode:
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
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

            <button
              onClick={() => setStep("select")}
              style={{
                width: "100%", background: "#eee", border: "none",
                padding: "0.5rem", borderRadius: "8px", cursor: "pointer", marginBottom: "0.5rem",
              }}
            >
              ← Terug
            </button>
            <button
              onClick={onCancel}
              style={{
                width: "100%", background: "#fff", border: "1px solid #ccc",
                padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
              }}
            >
              Annuleren
            </button>
          </>
        )}

        {/* STAP 3: Fooi */}
        {step === "tip" && (
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
                Totaal incl. fooi: €{(selectedTotal + tipAmount).toFixed(2)}
              </p>
            </div>

            <button
              onClick={handleConfirm}
              style={{
                width: "100%", background: "#4CAF50", color: "white",
                border: "none", padding: "0.75rem", borderRadius: "8px",
                cursor: "pointer", fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem",
              }}
            >
              ✅ Bevestig betaling
            </button>

            <button
              onClick={() => setStep("method")}
              style={{
                width: "100%", background: "#eee", border: "none",
                padding: "0.5rem", borderRadius: "8px", cursor: "pointer", marginBottom: "0.5rem",
              }}
            >
              ← Terug
            </button>
            <button
              onClick={onCancel}
              style={{
                width: "100%", background: "#fff", border: "1px solid #ccc",
                padding: "0.5rem", borderRadius: "8px", cursor: "pointer", color: "#d9534f",
              }}
            >
              Annuleren
            </button>
          </>
        )}
      </div>
    </div>
  );
}