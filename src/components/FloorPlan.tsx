import React, { useState } from "react";
import { Order } from "../types";

type Props = {
  orders: Order[];
  onTableSelect: (table: string) => void;
};

export default function FloorPlan({ orders, onTableSelect }: Props) {
  const [floor, setFloor] = useState<"binnen" | "buiten">("binnen");

  const hasOpenOrder = (tableId: string) =>
    orders.some((o) => o.table === tableId && o.status != "Betaald");

  const TableItem = ({
    id,
    shape = "square",
  }: {
    id: string;
    shape?: "square" | "round" | "bar";
  }) => {
    const open = hasOpenOrder(id);
    const isBar = shape === "bar";
    const isRound = shape === "round";

    return (
      <div
        onClick={() => onTableSelect(id)}
        title={open ? `Tafel ${id} — open order` : `Tafel ${id}`}
        style={{
          width: isBar ? "140px" : "72px",
          height: "72px",
          borderRadius: isRound ? "50%" : "10px",
          backgroundColor: open ? "#4CAF50" : "#4a5568",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: isBar ? "16px" : "18px",
          cursor: "pointer",
          border: open ? "3px solid #2e7d32" : "3px solid transparent",
          boxShadow: open
            ? "0 0 10px rgba(76,175,80,0.5)"
            : "0 2px 6px rgba(0,0,0,0.3)",
          transition: "transform 0.15s, box-shadow 0.15s",
          userSelect: "none",
          flexShrink: 0,
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
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
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
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", fontSize: "13px", color: "#555" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 14, height: 14, background: "#4a5568", borderRadius: "3px" }} />
          Vrij
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 14, height: 14, background: "#4CAF50", borderRadius: "3px" }} />
          Open order
        </div>
      </div>

      {floor === "binnen" ? (
        <div style={{ minWidth: "900px" }}>

          {/* Bovenste rij: 10 t/m 1 op één horizontale lijn */}
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

          {/* Onderste sectie */}
          <div style={{ display: "flex", alignItems: "center", gap: "0" }}>

            {/* Links: BAR in het midden van de linkerhelft */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <TableItem id="BAR" shape="bar" />
            </div>

            {/* Rechts: ronde tafels A-F in 2x3 grid */}
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "80px", alignItems: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: "12px" }}>
                {["E","C","A","F","D","B"].map((id) => (
                  <TableItem key={id} id={id} shape="round" />
                ))}
              </div>

              {/* vr1 en vr2 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <TableItem id="vr1" shape="round" />
                <TableItem id="vr2" shape="round" />
              </div>
            </div>

          </div>
        </div>

      ) : (
        /* ── BUITEN ── */
        <div style={{ minWidth: "900px", position: "relative", minHeight: "500px" }}>

          {/* Bovenste rij: 25 (midden), 26 (rechts-midden), 27 (rechts) */}
          <div style={{ display: "flex", gap: "80px", marginBottom: "60px", paddingLeft: "260px" }}>
            <TableItem id="25" shape="square" />
            <TableItem id="26" shape="square" />
            <TableItem id="27" shape="square" />
          </div>

          {/* Middelste sectie */}
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "40px" }}>

            {/* Links: 19, 20, 21 */}
            <div style={{ display: "flex", gap: "12px", alignSelf: "flex-end" }}>
              <TableItem id="19" shape="square" />
              <TableItem id="20" shape="square" />
              <TableItem id="21" shape="square" />
            </div>

            {/* Midden: 22 */}
            <div style={{ marginLeft: "100px" }}>
              <TableItem id="22" shape="square" />
            </div>

            {/* Rechts: 23 en 24 */}
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