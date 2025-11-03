import React from "react";
import { Order, OrderStatus } from "../types";

type Props = {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

export default function KitchenView({ orders, onUpdateStatus }: Props) {
  return (
    <div style={{ padding: "1rem" }}>
      <h2>Keukenoverzicht</h2>
      {orders.length === 0 ? (
        <p>Geen bestellingen.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #ccc",
                borderRadius: "10px",
                padding: "1rem",
                backgroundColor:
                  order.status === "klaar"
                    ? "#e8f5e9"
                    : order.status === "geserveerd"
                    ? "#f3e5f5"
                    : "#fff",
              }}
            >
              <h3>Tafel {order.table}</h3>
              <p>Status: {order.status}</p>
              <ul>
                {order.items.map((item) => (
                  <li key={item.dishId}>
                    {item.qty}× gerecht {item.dishId}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {order.status === "in voorbereiding" && (
                  <button onClick={() => onUpdateStatus(order.id, "klaar")}>
                    Markeer als klaar
                  </button>
                )}
                {order.status === "klaar" && (
                  <button onClick={() => onUpdateStatus(order.id, "geserveerd")}>
                    Geserveerd
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
