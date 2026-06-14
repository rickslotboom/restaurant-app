import React, { useState } from "react";
import { Order } from "../types";
import { useFloorPlanContext, TableDef, TableSize } from "../hooks/useFloorPlan";

type Props = {
  orders: Order[];
  onTableSelect: (table: string) => void;
  onMoveTable?: (fromTable: string, toTable: string) => void;
  onSplitBill?: (table: string) => void;
};

const SIZE_DIMS: Record<TableSize, { width: number; height: number }> = {
  small:  { width: 56,  height: 56  },
  medium: { width: 72,  height: 72  },
  large:  { width: 96,  height: 96  },
  wide:   { width: 140, height: 72  },
};

export default function FloorPlan({ orders, onTableSelect, onMoveTable, onSplitBill }: Props) {
  const { tables } = useFloorPlanContext();
  const [floor, setFloor] = useState<"binnen" | "buiten">("binnen");
  const [moveMode, setMoveMode] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [sourceTable, setSourceTable] = useState<string | null>(null);

  const hasOpenOrder = (name: string) =>
    orders.some((o) => o.table === name && o.status !== "Betaald");

  const floorTables = tables.filter((t) => t.floor === floor);

  // Bereken canvas grootte op basis van tafels
  const canvasWidth = Math.max(900, ...floorTables.map((t) => t.x + SIZE_DIMS[t.size].width + 40));
  const canvasHeight = Math.max(400, ...floorTables.map((t) => t.y + SIZE_DIMS[t.size].height + 40));

  const handleTableClick = (t: TableDef) => {
    const id = t.name;
    if (moveMode) {
      if (!sourceTable) {
        if (!hasOpenOrder(id)) return;
        setSourceTable(id);
      } else {
        if (id === sourceTable) { setSourceTable(null); return; }
        if (hasOpenOrder(id)) {
          alert(`Tafel ${id} heeft al een open bestelling.`);
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

  const getTableStyle = (t: TableDef): React.CSSProperties => {
    const open = hasOpenOrder(t.name);
    if (moveMode) {
      if (t.name === sourceTable) return { backgroundColor: "#1565C0", border: "3px solid #0D47A1", boxShadow: "0 0 12px rgba(21,101,192,0.7)", cursor: "pointer" };
      if (open) return { backgroundColor: "#E65100", border: "3px solid #BF360C", cursor: "pointer" };
      return { backgroundColor: "#2e7d32", border: "3px dashed #1b5e20", cursor: sourceTable ? "pointer" : "not-allowed", opacity: sourceTable ? 1 : 0.4 };
    }
    if (splitMode) {
      if (open) return { backgroundColor: "#7B1FA2", border: "3px solid #4A148C", cursor: "pointer" };
      return { backgroundColor: "#4a5568", border: "3px solid transparent", cursor: "not-allowed", opacity: 0.35 };
    }
    return {
      backgroundColor: open ? "#4CAF50" : "#4a5568",
      border: open ? "3px solid #2e7d32" : "3px solid transparent",
      boxShadow: open ? "0 0 10px rgba(76,175,80,0.5)" : "0 2px 6px rgba(0,0,0,0.3)",
      cursor: "pointer",
    };
  };

  const cancelModes = () => {
    setMoveMode(false);
    setSplitMode(false);
    setSourceTable(null);
  };

  const activeMode = moveMode || splitMode;

  return (
    <div style={{ padding: "1.5rem", overflowX: "auto" }}>

      {/* Tabs + knoppen */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {(["binnen", "buiten"] as const).map((f) => (
          <button key={f} onClick={() => setFloor(f)} style={{
            padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
            background: floor === f ? "#2196F3" : "#eee",
            color: floor === f ? "white" : "#333",
            fontWeight: "600", cursor: "pointer", fontSize: "14px",
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        {!activeMode && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            {onMoveTable && (
              <button onClick={() => setMoveMode(true)} style={{
                padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
                background: "#4a5568", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "14px",
              }}>🔀 Tafel verplaatsen</button>
            )}
            {onSplitBill && (
              <button onClick={() => setSplitMode(true)} style={{
                padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
                background: "#7B1FA2", color: "white", fontWeight: "600", cursor: "pointer", fontSize: "14px",
              }}>✂️ Splits rekening</button>
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
            <button onClick={cancelModes} style={{
              padding: "0.5rem 1rem", borderRadius: "8px",
              border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: "14px",
            }}>✕ Annuleren</button>
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
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", width: canvasWidth, height: canvasHeight }}>
        {floorTables.map((t) => {
          const dims = SIZE_DIMS[t.size];
          return (
            <div
              key={t.id}
              onClick={() => handleTableClick(t)}
              title={t.name}
              style={{
                position: "absolute",
                left: t.x,
                top: t.y,
                width: dims.width,
                height: dims.height,
                borderRadius: t.shape === "round" ? "50%" : "10px",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: dims.width > 80 ? "14px" : "16px",
                transition: "transform 0.15s",
                userSelect: "none",
                ...getTableStyle(t),
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {t.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}