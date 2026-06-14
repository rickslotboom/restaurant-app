import React, { useState, useEffect, useRef, useCallback } from "react";
import { Order, OrderItem, OrderStatus, Dish } from "../types";

const BAR_CATEGORIES = ["Dranken"];

const isToday = (ts?: number) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const isBeforeToday = (ts?: number) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < today;
};

function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul style={{ margin: "0.5rem 0", listStyle: "none", padding: 0 }}>
      {items.map((item, idx) => (
        <li key={idx}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span><strong>{item.qty}×</strong> {item.name}</span>
          </div>
          {(item.modifiers ?? []).map((mod, mIdx) => (
            <div key={mIdx} style={{
              display: "flex", justifyContent: "space-between",
              paddingLeft: "1.5rem", fontSize: "0.875rem", color: "#555",
            }}>
              <span>↳ {mod.name}</span>
              {mod.price > 0 && (
                <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>
              )}
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

type Props = {
  orders: Order[];
  menu: Dish[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onLogout: () => void;
};

export default function KitchenView({ orders, menu, onUpdateStatus, onLogout }: Props) {
  const [tab, setTab] = useState<"open" | "history">("open");
  const [searchWaiter, setSearchWaiter] = useState("");
  const [searchTable, setSearchTable] = useState("");
  const [searchOrderNumber, setSearchOrderNumber] = useState("");

  const prevOrderIds = useRef<Set<string>>(new Set());

  const isKitchenItem = useCallback((dishId: string) => {
    const dish = menu.find((d) => d.id === dishId);
    return !dish || !BAR_CATEGORIES.includes(dish.category);
  }, [menu]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    orders.forEach((order) => {
      if (!prevOrderIds.current.has(order.id) && order.status === "Open") {
        const kitchenItems = order.items.filter((i) => isKitchenItem(i.dishId));
        if (kitchenItems.length === 0) return;

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🍽️ Nieuwe bestelling!", {
            body: `Tafel ${order.table} — ${kitchenItems.map(i => `${i.qty}× ${i.name}`).join(", ")}`,
          });
        }

        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `🍽️ Nieuwe bestelling!\nTafel ${order.table}\nBediener: ${order.waiter}\n${kitchenItems.map(i => `${i.qty}× ${i.name}`).join("\n")}`,
          }),
        });
      }
    });

    prevOrderIds.current = new Set(orders.map((o) => o.id));
  }, [orders, isKitchenItem]);

  const hasKitchenItems = (order: Order) =>
    order.items.some((i) => isKitchenItem(i.dishId));

  const oldOpenOrders = orders.filter((o) =>
    o.status === "Open" && hasKitchenItems(o) && isBeforeToday(o.timestamp)
  );

  const openOrders = orders
    .filter((o) => o.status === "Open" && hasKitchenItems(o) && isToday(o.timestamp))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  const historyOrders = orders
    .filter((o) => o.status === "Afgehandeld" && hasKitchenItems(o) && isToday(o.timestamp))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  let displayed = tab === "open" ? openOrders : historyOrders;

  displayed = displayed.filter((o) => {
    let matchesWaiter = true;
    let matchesTable = true;
    let matchesOrderNumber = true;
    if (searchWaiter) matchesWaiter = o.waiter?.toLowerCase().includes(searchWaiter.toLowerCase());
    if (searchTable) matchesTable = o.table?.toLowerCase().includes(searchTable.toLowerCase());
    if (searchOrderNumber) matchesOrderNumber = (o.orderNumber ?? "").toLowerCase().includes(searchOrderNumber.toLowerCase());
    return matchesWaiter && matchesTable && matchesOrderNumber;
  });

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const dagNamen = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
    const dag = dagNamen[d.getDay()];
    const datum = d.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
    const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    return `${dag} ${datum} — ${tijd}`;
  };

  return (
    <div style={{ padding: "1rem", position: "relative" }}>
      <button
        onClick={onLogout}
        style={{
          position: "absolute", right: "1rem", top: "1rem",
          background: "#d9534f", color: "white", border: "none",
          padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer",
        }}
      >
        Uitloggen
      </button>

      <h2>Keukenoverzicht</h2>

      {oldOpenOrders.length > 0 && (
        <div style={{
          background: "#fff3cd", border: "2px solid #ffc107", borderRadius: "10px",
          padding: "1rem 1.25rem", marginBottom: "1.25rem",
        }}>
          <strong>⚠️ Let op:</strong> Er {oldOpenOrders.length === 1 ? "staat" : "staan"} nog{" "}
          <strong>{oldOpenOrders.length} openstaande {oldOpenOrders.length === 1 ? "bon" : "bonnen"}</strong>{" "}
          van een vorige dag:
          <ul style={{ margin: "0.5rem 0 0 0" }}>
            {oldOpenOrders.map((o) => (
              <li key={o.id}>
                Tafel {o.table} — {formatTimestamp(o.timestamp)}
                <button
                  onClick={() => onUpdateStatus(o.id, "Afgehandeld")}
                  style={{
                    marginLeft: "0.75rem", background: "#4CAF50", color: "white",
                    border: "none", padding: "0.2rem 0.6rem", borderRadius: "6px",
                    cursor: "pointer", fontSize: "0.85rem",
                  }}
                >
                  Markeer als klaar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={() => setTab("open")} style={{
          padding: "0.5rem 1rem", borderRadius: "8px",
          background: tab === "open" ? "#2196F3" : "#eee",
          color: tab === "open" ? "white" : "black",
        }}>
          Open orders ({openOrders.length})
        </button>
        <button onClick={() => setTab("history")} style={{
          padding: "0.5rem 1rem", borderRadius: "8px",
          background: tab === "history" ? "#2196F3" : "#eee",
          color: tab === "history" ? "white" : "black",
        }}>
          Geschiedenis ({historyOrders.length})
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <label>Bediener:</label><br />
          <input type="text" placeholder="Naam" value={searchWaiter}
            onChange={(e) => setSearchWaiter(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
        </div>
        <div>
          <label>Tafel:</label><br />
          <input type="text" placeholder="tafel" value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
        </div>
        <div>
          <label>Ordernummer:</label><br />
          <input type="text" placeholder="bv. 202511-00001" value={searchOrderNumber}
            onChange={(e) => setSearchOrderNumber(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }} />
        </div>
      </div>

      {displayed.length === 0 ? (
        <p>Geen bestellingen vandaag.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {displayed.map((order) => (
            <div key={order.id} style={{
              border: "2px solid #ccc", borderRadius: "10px", padding: "1rem",
              backgroundColor: order.status === "Afgehandeld" ? "#e8f5e9" : "#fff",
            }}>
              <h3 style={{ marginBottom: "0.3rem" }}>🍽️ Tafel {order.table}</h3>
              {order.timestamp && (
                <p style={{ fontSize: "0.9rem", color: "#555", margin: "0 0 0.5rem 0" }}>
                  {formatTimestamp(order.timestamp)}
                </p>
              )}
              {order.waiter && (
                <p style={{ fontSize: "0.9rem", color: "#555", margin: "0 0 0.5rem 0" }}>
                  Bediener: {order.waiter}
                </p>
              )}
              {order.orderNumber && (
                <p style={{ fontSize: "0.9rem", color: "#555", margin: "0 0 0.5rem 0" }}>
                  Ordernummer: {order.orderNumber}
                </p>
              )}
              <OrderItemsList items={order.items.filter((i) => isKitchenItem(i.dishId))} />
              {order.status === "Open" && tab === "open" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "Afgehandeld")}
                  style={{
                    marginTop: "0.5rem", background: "#4CAF50", color: "white",
                    border: "none", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer",
                  }}
                >
                  Markeer als klaar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}