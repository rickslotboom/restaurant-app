import React, { useState, useMemo } from "react";
import { Order, OrderStatus } from "../types";
import PaymentModal from "./PaymentModal";
import { useOrdersContext } from "../hooks/useOrders";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

type RangeType = "today" | "day" | "week" | "custom";

const ALL_TABLES = [
  "1","2","3","4","5","6","7","8","9","10",
  "A","B","C","D","E","F","vr1","vr2","BAR",
  "19","20","21","22","23","24","25","26","27",
];

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const today = new Date();

export default function BillingView({ orders, onUpdateStatus }: Props) {
  const { deleteOrder, updateOrderStatus, updateOrderTable } = useOrdersContext();

  const [tab, setTab] = useState<"open" | "paid">("open");
  const [range, setRange] = useState<RangeType>("today");
  const [selectedDay, setSelectedDay] = useState<string>(formatDate(today));
  const [selectedWeek, setSelectedWeek] = useState<string>(formatDate(today));
  const [customFrom, setCustomFrom] = useState<string>(formatDate(today));
  const [customTo, setCustomTo] = useState<string>(formatDate(today));
  const [confirmTable, setConfirmTable] = useState<string | null>(null);

  // Ongedaan maken modal
  const [undoOrder, setUndoOrder] = useState<Order | null>(null);
  const [undoAction, setUndoAction] = useState<"reopen" | "delete" | null>(null);
  const [reopenTable, setReopenTable] = useState<string>("");

  // Bepaal tijdsbereik
  const { fromTs, toTs } = useMemo(() => {
    if (range === "today") {
      return { fromTs: startOfDay(today), toTs: endOfDay(today) };
    }
    if (range === "day") {
      const d = new Date(selectedDay);
      return { fromTs: startOfDay(d), toTs: endOfDay(d) };
    }
    if (range === "week") {
      const d = new Date(selectedWeek);
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // maandag = 0
      const mon = new Date(d);
      mon.setDate(d.getDate() - day);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { fromTs: startOfDay(mon), toTs: endOfDay(sun) };
    }
    // custom
    return {
      fromTs: startOfDay(new Date(customFrom)),
      toTs: endOfDay(new Date(customTo)),
    };
  }, [range, selectedDay, selectedWeek, customFrom, customTo]);

  const inRange = (order: Order) =>
    order.timestamp !== undefined &&
    order.timestamp >= fromTs &&
    order.timestamp <= toTs;

  const paidOrders = orders.filter((o) => o.status === "Betaald" && inRange(o));
  const openOrders = orders.filter((o) => o.status !== "Betaald");

  const paidByTable = paidOrders.reduce<Record<string, Order[]>>((acc, o) => {
    if (!acc[o.table]) acc[o.table] = [];
    acc[o.table].push(o);
    return acc;
  }, {});

  const openByTable = openOrders.reduce<Record<string, Order[]>>((acc, o) => {
    if (!acc[o.table]) acc[o.table] = [];
    acc[o.table].push(o);
    return acc;
  }, {});

  const displayedByTable = tab === "open" ? openByTable : paidByTable;

  const getTotal = (tableOrders: Order[]) =>
    tableOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0
    );

  const dayTotal = paidOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.qty, 0), 0
  );

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("nl-NL", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  // PaymentModal gecombineerde order
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
    openByTable[confirmTable].forEach((o) => onUpdateStatus(o.id, "Betaald"));
    setConfirmTable(null);
  };

  const handleUndoClick = (order: Order) => {
    setUndoOrder(order);
    setUndoAction(null);
    setReopenTable(order.table);
  };

  const handleUndoConfirm = async () => {
    if (!undoOrder) return;
    if (undoAction === "delete") {
      await deleteOrder(undoOrder.id);
    } else if (undoAction === "reopen") {
      await updateOrderStatus(undoOrder.id, "Open");
      if (reopenTable !== undoOrder.table) {
        await updateOrderTable(undoOrder.id, reopenTable);
      }
    }
    setUndoOrder(null);
    setUndoAction(null);
  };

  const rangeLabel = () => {
    if (range === "today") return "vandaag";
    if (range === "day") return selectedDay;
    if (range === "week") return `week van ${selectedWeek}`;
    return `${customFrom} t/m ${customTo}`;
  };

  return (
    <div style={{ padding: "1rem", paddingBottom: "5rem" }}>
      <h2>Rekeningen</h2>

      {/* PaymentModal */}
      {combinedOrder && (
        <PaymentModal
          order={combinedOrder}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setConfirmTable(null)}
        />
      )}

      {/* Ongedaan maken modal */}
      {undoOrder && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "2rem",
            width: "340px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ marginTop: 0 }}>Bon ongedaan maken</h3>
            <p style={{ color: "#555" }}>
              Tafel <strong>{undoOrder.table}</strong> — {formatTimestamp(undoOrder.timestamp)}
            </p>

            {!undoAction ? (
              <>
                <p>Wat wil je doen?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={() => setUndoAction("reopen")}
                    style={{
                      background: "#2196F3", color: "white", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    🔄 Bon heropenen op een tafel
                  </button>
                  <button
                    onClick={() => setUndoAction("delete")}
                    style={{
                      background: "#d9534f", color: "white", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    🗑️ Bon volledig verwijderen
                  </button>
                  <button
                    onClick={() => setUndoOrder(null)}
                    style={{
                      background: "#eee", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer",
                    }}
                  >
                    Annuleren
                  </button>
                </div>
              </>
            ) : undoAction === "reopen" ? (
              <>
                <p>Op welke tafel wil je de bon heropenen?</p>
                <select
                  value={reopenTable}
                  onChange={(e) => setReopenTable(e.target.value)}
                  style={{
                    width: "100%", padding: "0.6rem", borderRadius: "8px",
                    border: "1px solid #ccc", marginBottom: "1rem", fontSize: "1rem",
                  }}
                >
                  {ALL_TABLES.map((t) => (
                    <option key={t} value={t}>Tafel {t}</option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setUndoAction(null)}
                    style={{
                      flex: 1, background: "#eee", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer",
                    }}
                  >
                    ← Terug
                  </button>
                  <button
                    onClick={handleUndoConfirm}
                    style={{
                      flex: 1, background: "#2196F3", color: "white", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    ✅ Bevestigen
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "#d9534f" }}>
                  Weet je zeker dat je deze bon <strong>permanent wilt verwijderen</strong>? Dit kan niet ongedaan worden gemaakt.
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setUndoAction(null)}
                    style={{
                      flex: 1, background: "#eee", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer",
                    }}
                  >
                    ← Terug
                  </button>
                  <button
                    onClick={handleUndoConfirm}
                    style={{
                      flex: 1, background: "#d9534f", color: "white", border: "none",
                      padding: "0.75rem", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                    }}
                  >
                    🗑️ Verwijderen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
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
          Betaalde bonnen
        </button>
      </div>

      {/* Periode filter — alleen bij betaald */}
      {tab === "paid" && (
        <div style={{
          background: "#f5f5f5", borderRadius: "10px", padding: "1rem",
          marginBottom: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center",
        }}>
          {(["today", "day", "week", "custom"] as RangeType[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "0.4rem 0.9rem", borderRadius: "20px", border: "none", cursor: "pointer",
                background: range === r ? "#2196F3" : "#ddd",
                color: range === r ? "white" : "#333",
                fontWeight: range === r ? "bold" : "normal",
              }}
            >
              {r === "today" ? "Vandaag" : r === "day" ? "Per dag" : r === "week" ? "Per week" : "Aangepast"}
            </button>
          ))}

          {range === "day" && (
            <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
          )}
          {range === "week" && (
            <input type="date" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}
              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
          )}
          {range === "custom" && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
              <span>t/m</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
            </div>
          )}
        </div>
      )}

      {/* Bonnen */}
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
                  marginBottom: "0.75rem", paddingBottom: "0.75rem",
                  borderBottom: idx < tableOrders.length - 1 ? "1px dashed #ddd" : "none",
                }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", color: "#777" }}>
                    Bon {idx + 1} — {formatTimestamp(order.timestamp)} — {order.waiter}
                    {order.orderNumber && ` — ${order.orderNumber}`}
                  </p>
                  <ul style={{ margin: "0.25rem 0", paddingLeft: "1.2rem" }}>
                    {order.items.map((item, i) => (
                      <li key={i} style={{ fontSize: "0.9rem" }}>
                        {item.qty}× {item.name} — €{(item.price * item.qty).toFixed(2)}
                      </li>
                    ))}
                  </ul>

                  {tab === "paid" && (
                    <button
                      onClick={() => handleUndoClick(order)}
                      style={{
                        marginTop: "0.4rem", background: "none", border: "1px solid #ccc",
                        padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer",
                        fontSize: "0.85rem", color: "#555",
                      }}
                    >
                      ↩ Ongedaan maken
                    </button>
                  )}
                </div>
              ))}

              <strong style={{ fontSize: "1rem" }}>
                Totaal: €{getTotal(tableOrders).toFixed(2)}
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

      {/* Dagtotaal — linksonder vastgeplakt */}
      {tab === "paid" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0,
          background: "#2c3e50", color: "white",
          padding: "0.85rem 1.5rem",
          borderTopRightRadius: "12px",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
          fontSize: "1rem", fontWeight: "bold",
          zIndex: 100,
        }}>
          💰 Totaal ({rangeLabel()}): €{dayTotal.toFixed(2)}
        </div>
      )}
    </div>
  );
}