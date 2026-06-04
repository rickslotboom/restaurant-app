import React, { useState } from "react";
import { Order } from "../types";

type Props = {
  orders: Order[];
  onTableSelect: (table: string) => void;
  onMoveTable?: (fromTable: string, toTable: string) => void;
};

export default function FloorPlan({ orders, onTableSelect, onMoveTable }: Props) {
  const [floor, setFloor] = useState<"binnen" | "buiten">("binnen");
  const [moveMode, setMoveMode] = useState(false);
  const [sourceTable, setSourceTable] = useState<string | null>(null);

  const hasOpenOrder = (tableId: string) =>
    orders.some((o) => o.table === tableId && o.status !== "Betaald");

  const handleTableClick = (id: string) => {
    if (!moveMode) {
      onTableSelect(id);
      return;
    }

    if (!sourceTable) {
      // Eerste klik: kies brontafel (moet een open order hebben)
      if (!hasOpenOrder(id)) return;
      setSourceTable(id);
    } else {
      // Tweede klik: kies doeltafel
      if (id === sourceTable) {
        // Klik op dezelfde tafel annuleert selectie
        setSourceTable(null);
        return;
      }
      if (hasOpenOrder(id)) {
        alert(`Tafel ${id} heeft al een open bestelling. Kies een vrije tafel.`);
        return;
      }
      onMoveTable?.(sourceTable, id);
      setSourceTable(null);
      setMoveMode(false);
    }
  };

  const cancelMoveMode = () => {
    setMoveMode(false);
    setSourceTable(null);
  };

  const getTableStyle = (id: string): React.CSSProperties => {
    const open = hasOpenOrder(id);

    if (moveMode) {
      if (id === sourceTable) {
        // Geselecteerde brontafel: blauw
        return {
          backgroundColor: "#1565C0",
          border: "3px solid #0D47A1",
          boxShadow: "0 0 12px rgba(21,101,192,0.7)",
          cursor: "pointer",
        };
      }
      if (open) {
        // Tafels met open order die verplaatst kunnen worden: oranje
        return {
          backgroundColor: "#E65100",
          border: "3px solid #BF360C",
          boxShadow: "0 0 10px rgba(230,81,0,0.5)",
          cursor: "pointer",
        };
      }
      // Vrije tafels als potentiële bestemming
      return {
        backgroundColor: "#2e7d32",
        border: "3px dashed #1b5e20",
        boxShadow: "none",
        cursor: sourceTable ? "pointer" : "not-allowed",
        opacity: sourceTable ? 1 : 0.4,
      };
    }

    // Normale modus
    return {
      backgroundColor: open ? "#4CAF50" : "#4a5568",
      border: open ? "3px solid #2e7d32" : "3px solid transparent",
      boxShadow: open
        ? "0 0 10px rgba(76,175,80,0.5)"
        : "0 2px 6px rgba(0,0,0,0.3)",
      cursor: "pointer",
    };
  };

  const TableItem = ({
    id,
    shape = "square",
  }: {
    id: string;
    shape?: "square" | "round" | "bar";
  }) => {
    const isBar = shape === "bar";
    const isRound = shape === "round";
    const tableStyle = getTableStyle(id);

    let tooltipText = `Tafel ${id}`;
    if (moveMode) {
      if (id === sourceTable) tooltipText = `Tafel ${id} — wordt verplaatst`;
      else if (hasOpenOrder(id)) tooltipText = `Tafel ${id} — klik om te verplaatsen`;
      else tooltipText = `Tafel ${id} — verplaats hierheen`;
    } else if (hasOpenOrder(id)) {
      tooltipText = `Tafel ${id} — open order`;
    }

    return (
      <div
        onClick={() => handleTableClick(id)}
        title={tooltipText}
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
          ...tableStyle,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.07)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {id}
      </div>
    );
  };

  return (
    <div style={{ padding: "1.5rem", overflowX: "auto" }}>

      {/* Tabs binnen/buiten */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
        {(["binnen", "buiten"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFloor(f)}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: floor === f ? "#2196F3" : "#eee",
              color: floor === f ? "white" : "#333",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        {/* Verplaats-knop */}
        {onMoveTable && !moveMode && (
          <button
            onClick={() => setMoveMode(true)}
            style={{
              marginLeft: "auto",
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              border: "none",
              background: "#4a5568",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🔀 Tafel verplaatsen
          </button>
        )}

        {moveMode && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "#fff3cd",
              color: "#856404",
              fontWeight: "600",
              fontSize: "14px",
              border: "1px solid #ffc107",
            }}>
              {!sourceTable
                ? "🟠 Klik op de tafel die je wilt verplaatsen"
                : "🔵 Klik op de doeltafel"}
            </span>
            <button
              onClick={cancelMoveMode}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                background: "white",
                cursor: "pointer",
                fontSize: "14px",
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
          <div style={{ width: 14, height: 14, background: "#4a5568", borderRadius: "3px" }} />
          Vrij
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 14, height: 14, background: "#4CAF50", borderRadius: "3px" }} />
          Open order
        </div>
        {moveMode && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 14, height: 14, background: "#E65100", borderRadius: "3px" }} />
              Verplaatsbaar
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 14, height: 14, background: "#1565C0", borderRadius: "3px" }} />
              Geselecteerd
            </div>
          </>
        )}
      </div>

      {floor === "binnen" ? (
        <div style={{ minWidth: "900px" }}>
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "80px",
            flexWrap: "nowrap",
          }}>
            {["10","9","8","7","6","5","4","3","2","1"].map((id) => (
              <TableItem key={id} id={id} shape="square" />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
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