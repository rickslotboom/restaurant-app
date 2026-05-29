import React, { useState, useEffect, useRef } from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onLogout: () => void;
};

export default function KitchenView({ orders, onUpdateStatus, onLogout }: Props) {
  const [tab, setTab] = useState<"open" | "history">("open");

  const [searchDate, setSearchDate] = useState("");
  const [searchWaiter, setSearchWaiter] = useState("");
  const [searchTable, setSearchTable] = useState("");
  const [searchOrderNumber, setSearchOrderNumber] = useState("");

  const prevOrderIds = useRef<Set<string>>(new Set());

  // 🔔 Vraag notificatie permissie
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 🔔 Detecteer nieuwe orders en stuur notificaties
  useEffect(() => {
    console.log("orders gewijzigd, aantal:", orders.length);
    console.log("prevOrderIds:", prevOrderIds.current);

    orders.forEach((order) => {
      console.log("check order:", order.id, "bekend?", prevOrderIds.current.has(order.id));
      if (!prevOrderIds.current.has(order.id) && order.status === "Open") {
        console.log("🆕 Nieuwe order gevonden!", order.id);

        // Browser notificatie (desktop)
        if (Notification.permission === "granted") {
          new Notification("🍽️ Nieuwe bestelling!", {
            body: `Tafel ${order.table} — ${order.items.map(i => `${i.qty}× ${i.name}`).join(", ")}`,
          });
        }

        // Telegram notificatie
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `🍽️ Nieuwe bestelling!\nTafel ${order.table}\nBediener: ${order.waiter}\n${order.items.map(i => `${i.qty}× ${i.name}`).join("\n")}`,
          }),
        });
      }
    });

    prevOrderIds.current = new Set(orders.map((o) => o.id));
  }, [orders]);

  const openOrders = orders.filter((o) => o.status === "Open");
  const historyOrders = orders.filter((o) => o.status === "Afgehandeld");
  let displayed = tab === "open" ? openOrders : historyOrders;

  displayed = displayed.filter((o) => {
    let matchesDate = true;
    let matchesWaiter = true;
    let matchesTable = true;
    let matchesOrderNumber = true;

    if (searchDate && o.timestamp) {
      const d = new Date(o.timestamp);
      const orderDate = d.toISOString().split("T")[0];
      matchesDate = orderDate === searchDate;
    }

    if (searchWaiter) {
      matchesWaiter = o.waiter?.toLowerCase().includes(searchWaiter.toLowerCase());
    }

    if (searchTable) {
      matchesTable = o.table?.toLowerCase().includes(searchTable.toLowerCase());
    }

    if (searchOrderNumber) {
      matchesOrderNumber = (o.orderNumber ?? "").toLowerCase().includes(searchOrderNumber.toLowerCase());
    }

    return matchesDate && matchesWaiter && matchesTable && matchesOrderNumber;
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
          position: "absolute",
          right: "1rem",
          top: "1rem",
          background: "#d9534f",
          color: "white",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Uitloggen
      </button>

      <h2>Keukenoverzicht</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button
          onClick={() => setTab("open")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            background: tab === "open" ? "#2196F3" : "#eee",
            color: tab === "open" ? "white" : "black",
          }}
        >
          Open orders ({openOrders.length})
        </button>

        <button
          onClick={() => setTab("history")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            background: tab === "history" ? "#2196F3" : "#eee",
            color: tab === "history" ? "white" : "black",
          }}
        >
          Geschiedenis ({historyOrders.length})
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <label>Datum:</label><br />
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label>Bediener:</label><br />
          <input
            type="text"
            placeholder="Naam"
            value={searchWaiter}
            onChange={(e) => setSearchWaiter(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label>Tafel:</label><br />
          <input
            type="text"
            placeholder="tafel"
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label>Ordernummer:</label><br />
          <input
            type="text"
            placeholder="bv. 202511-00001"
            value={searchOrderNumber}
            onChange={(e) => setSearchOrderNumber(e.target.value)}
            style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>
      </div>

      {displayed.length === 0 ? (
        <p>Geen bestellingen.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {displayed.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #ccc",
                borderRadius: "10px",
                padding: "1rem",
                backgroundColor: order.status === "Afgehandeld" ? "#e8f5e9" : "#fff",
              }}
            >
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

              <ul style={{ margin: "0.5rem 0" }}>
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.qty}× {item.name}
                  </li>
                ))}
              </ul>

              {order.status === "Open" && tab === "open" && (
                <button
                  onClick={() => onUpdateStatus(order.id, "Afgehandeld")}
                  style={{
                    marginTop: "0.5rem",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
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