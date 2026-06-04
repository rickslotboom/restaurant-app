import React, { useState } from "react";
import { Order, OrderStatus } from "../types";
import PaymentModal from "./PaymentModal";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

export default function BillingView({ orders, onUpdateStatus }: Props) {
  const [tab, setTab] = useState<"open" | "paid">("open");
  const [confirmTable, setConfirmTable] = useState<string | null>(null);

  const openOrders = orders.filter((o) => o.status !== "Betaald");
  const paidOrders = orders.filter((o) => o.status === "Betaald");

  // Groepeer open orders per tafel
  const openByTable = openOrders.reduce<Record<string, Order[]>>((acc, order) => {
    if (!acc[order.table]) acc[order.table] = [];
    acc[order.table].push(order);
    return acc;
  }, {});

  // Groepeer betaalde orders per tafel
  const paidByTable = paidOrders.reduce<Record<string, Order[]>>((acc, order) => {
    if (!acc[order.table]) acc[order.table] = [];
    acc[order.table].push(order);
    return acc;
  }, {});

  const displayedByTable = tab === "open" ? openByTable : paidByTable;

  const getTableTotal = (tableOrders: Order[]) =>
    tableOrders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + item.price * item.qty, 0),
      0
    );

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("nl-NL", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  // Bouw gecombineerde order voor PaymentModal
  const confirmTableOrders = confirmTable ? openByTable[confirmTable] : null;
  const combinedOrder = confirmTableOrders ? {
    id: confirmTableOrders[0].id,
    table: confirmTable!,
    status: "Open" as OrderStatus,
    waiter: confirmTableOrders[0].waiter,
    timestamp: confirmTableOrders[0].timestamp,
    items: confirmTableOrders.flatMap((o) => o.items),
  } : null;

  const handlePaymentConfirm = (_orderId: string, method: "cash" | "pin", tip: number) => {
    if (!confirmTable || !openByTable[confirmTable]) return;
    console.log("Betaald via:", method, "Fooi:", tip);
    openByTable[confirmTable].forEach((o) => onUpdateStatus(o.id, "Betaald"));
    setConfirmTable(null);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Rekeningen</h2>

      {combinedOrder && (
        <PaymentModal
          order={combinedOrder}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setConfirmTable(null)}
        />
      )}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setTab("open")}
          style={{
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: tab === "open" ? "#2196F3" : "#eee",
            color: tab === "open" ? "white" : "black",
          }}
        >
          Open bonnen ({Object.keys(openByTable).length} tafels)
        </button>
        <button
          onClick={() => setTab("paid")}
          style={{
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: tab === "paid" ? "#2196F3" : "#eee",
            color: tab === "paid" ? "white" : "black",
          }}
        >
          Betaalde bonnen ({Object.keys(paidByTable).length} tafels)
        </button>
      </div>

      {Object.keys(displayedByTable).length === 0 ? (
        <p>Geen bonnen.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {Object.entries(displayedByTable).map(([tableId, tableOrders]) => (
            <div
              key={tableId}
              style={{
                border: "2px solid #ccc", borderRadius: "10px", padding: "1rem",
                backgroundColor: tab === "paid" ? "#e8f5e9" : "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0" }}>🍽️ Tafel {tableId}</h3>

              {tableOrders.map((order, idx) => (
                <div key={order.id} style={{
                  marginBottom: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: idx < tableOrders.length - 1 ? "1px dashed #ddd" : "none",
                }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", color: "#777" }}>
                    Bon {idx + 1} — {formatTimestamp(order.timestamp)} — {order.waiter}
                  </p>
                  <ul style={{ margin: "0.25rem 0", paddingLeft: "1.2rem" }}>
                    {order.items.map((item, i) => (
                      <li key={i} style={{ fontSize: "0.9rem" }}>
                        {item.qty}× {item.name} — €{(item.price * item.qty).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <strong style={{ fontSize: "1rem" }}>
                Totaal: €{getTableTotal(tableOrders).toFixed(2)}
              </strong>

              {tab === "open" && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={() => setConfirmTable(tableId)}
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