import React, { useState } from "react";
import { Order } from "../types";

type Props = {
  orders: Order[];
  onTableSelect: (table: string) => void;
  onMoveTable?: (fromTable: string, toTable: string) => void;
  onSplitBill?: (table: string) => void;
};

export default function FloorPlan({ orders, onTableSelect, onMoveTable, onSplitBill }: Props) {
  const [floor, setFloor] = useState<"binnen" | "buiten">("binnen");
  const [moveMode, setMoveMode] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [sourceTable, setSourceTable] = useState<string | null>(null);

  const hasOpenOrder = (tableId: string) =>
    orders.some((o) => o.table === tableId && o.status !== "Betaald");

  const handleTableClick = (id: string) => {
    if (moveMode) {
      if (!sourceTable) {
        if (!hasOpenOrder(id)) return;
        setSourceTable(id);
      } else {
        if (id === sourceTable) { setSourceTable(null); return; }
        if (hasOpenOrder(id)) {
          alert(`Tafel ${id} heeft al een open bestelling. Kies een vrije tafel.`);
          return;
        }
        onMoveTable?.(sourceTable, id);
        setSourceTable(null);
        setMoveMode(false);
      }
      return;
    }

    if (splitMode) {
      if (!hasOpenOrder(id)) return;
      onSplitBill?.(id);
      setSplitMode(false);
      return;
    }

    onTableSelect(id);
  };

  const cancelModes = () => {
    setMoveMode(false);
    setSplitMode(false);
    setSourceTable(null);
  };

  const getTableStyle = (id: string): React.CSSProperties => {
    const open = hasOpenOrder(id);

    if (moveMode) {
      if (id === sourceTable) {
        return { backgroundColor: "#1565C0", border: "3px solid #0D47A1", boxShadow: "0 0 12px rgba(21,101,192,0.7)", cursor: "pointer" };
      }
      if (open) {
        return { backgroundColor: "#E65100", border: "3px solid #BF360C", boxShadow: "0 0 10px rgba(230,81,0,0.5)", cursor: "pointer" };
      }
      return { backgroundColor: "#2e7d32", border: "3px dashed #1b5e20", boxShadow: "none", cursor: sourceTable ? "pointer" : "not-allowed", opacity: sourceTable ? 1 : 0.4 };
    }

    if (splitMode) {
      if (open) {
        return { backgroundColor: "#7B1FA2", border: "3px solid #4A148C", boxShadow: "0 0 10px rgba(123,31,162,0.5)", cursor: "pointer" };
      }
      return { backgroundColor: "#4a5568", border: "3px solid transparent", boxShadow: "none", cursor: "not-allowed", opacity: 0.35 };
    }

    return {
      backgroundColor: open ? "#4CAF50" : "#4a5568",
      border: open ? "3px solid #2e7d32" : "3px solid transparent",
      boxShadow: open ? "0 0 10px rgba(76,175,80,0.5)" : "0 2px 6px rgba(0,0,0,0.3)",
      cursor: "pointer",
    };
  };

  const getTooltip = (id: string) => {
    const open = hasOpenOrder(id);
    if (moveMode) {
      if (id === sourceTable) return `Tafel ${id} — wordt verplaatst`;
      if (open) return `Tafel ${id} — klik om te verplaatsen`;
      return `Tafel ${id} — verplaats hierheen`;
    }
    if (splitMode) {
      return open ? `Tafel ${id} — splits rekening` : `Tafel ${id} — geen open order`;
    }
    return open ? `Tafel ${id} — open order` : `Tafel ${id}`;
  };

  const TableItem = ({ id, shape = "square" }: { id: string; shape?: "square" | "round" | "bar" }) => {
    const isBar = shape === "bar";
    const isRound = shape === "round";

    return (
      <div
        onClick={() => handleTableClick(id)}
        title={getTooltip(id)}
        style={{
          width: isBar ? "140px" : "72px",
          height: "72px",
          borderRadius: isRound ? "50%" : "10px",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: isBar ? "16px" : "18px",
          transition: "transform 0.15s, box-shadow 0.15s",
          userSelect: "none",
          flexShrink: 0,
          ...getTableStyle(id),
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {id}
      </div>
    );
  };

  const activeMode = moveMode || splitMode;

  return (
    <div style={{ padding: "1.5rem", overflowX: "auto" }}>

      {/* Tabs + knoppen */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {(["binnen", "buiten"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFloor(f)}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
              background: floor === f ? "#2196F3" : "#eee",
              color: floor === f ? "white" : "#333",
              fontWeight: "600", cursor: "pointer", fontSize: "14px",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        {!activeMode && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            {onMoveTable && (
              <button
                onClick={() => setMoveMode(true)}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
                  background: "#4a5568", color: "white", fontWeight: "600",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                🔀 Tafel verplaatsen
              </button>
            )}
            {onSplitBill && (
              <button
                onClick={() => setSplitMode(true)}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
                  background: "#7B1FA2", color: "white", fontWeight: "600",
                  cursor: "pointer", fontSize: "14px",
                }}
              >
                ✂️ Splits rekening
              </button>
            )}
          </div>
        )}

        {activeMode && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              padding: "0.5rem 1rem", borderRadius: "8px",
              background: moveMode ? "#fff3cd" : "#f3e5f5",
              color: moveMode ? "#856404" : "#4A148C",
              fontWeight: "600", fontSize: "14px",
              border: `1px solid ${moveMode ? "#ffc107" : "#CE93D8"}`,
            }}>
              {moveMode
                ? (!sourceTable ? "🟠 Klik op de tafel die je wilt verplaatsen" : "🔵 Klik op de doeltafel")
                : "🟣 Klik op de tafel om te splitsen"}
            </span>
            <button
              onClick={cancelModes}
              style={{
                padding: "0.5rem 1rem", borderRadius: "8px",
                border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: "14px",
              }}
            >
              ✕ Annuleren
            </button>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", fontSize: "13px", color: "#555", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 14, height: 14, background: "#4a5568", borderRadius: "3px" }} /> Vrij
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 14, height: 14, background: "#4CAF50", borderRadius: "3px" }} /> Open order
        </div>
        {moveMode && <>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 14, height: 14, background: "#E65100", borderRadius: "3px" }} /> Verplaatsbaar
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 14, height: 14, background: "#1565C0", borderRadius: "3px" }} /> Geselecteerd
          </div>
        </>}
        {splitMode && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 14, height: 14, background: "#7B1FA2", borderRadius: "3px" }} /> Splitsen
          </div>
        )}
      </div>

      {floor === "binnen" ? (
        <div style={{ minWidth: "900px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "80px", flexWrap: "nowrap" }}>
            {["10","9","8","7","6","5","4","3","2","1"].map((id) => (
              <TableItem key={id} id={id} shape="square" />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <TableItem id="BAR" shape="bar" />
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "80px", alignItems: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: "12px" }}>
                {["E","C","A","F","D","B"].map((id) => (
                  <TableItem key={id} id={id} shape="round" />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <TableItem id="vr1" shape="round" />
                <TableItem id="vr2" shape="round" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ minWidth: "900px", position: "relative", minHeight: "500px" }}>
          <div style={{ display: "flex", gap: "80px", marginBottom: "60px", paddingLeft: "260px" }}>
            <TableItem id="25" shape="square" />
            <TableItem id="26" shape="square" />
            <TableItem id="27" shape="square" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "40px" }}>
            <div style={{ display: "flex", gap: "12px", alignSelf: "flex-end" }}>
              <TableItem id="19" shape="square" />
              <TableItem id="20" shape="square" />
              <TableItem id="21" shape="square" />
            </div>
            <div style={{ marginLeft: "100px" }}>
              <TableItem id="22" shape="square" />
            </div>
            <div style={{ display: "flex", gap: "80px", marginLeft: "100px", marginTop: "60px" }}>
              <TableItem id="23" shape="square" />
              <TableItem id="24" shape="square" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}