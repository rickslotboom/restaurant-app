import React from "react";
import { Dish, Order } from "../types";
import { useOrdersContext } from "../hooks/useOrders";

type Props = {
  menu: Dish[];
  selected: Record<string, number>;
  table: string;
  onBack: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function OrderSummary({
  menu,
  selected,
  table,
  onBack,
  onAdd,
  onRemove,
}: Props) {
  const { addOrder } = useOrdersContext();

  const selectedDishes = menu.filter((dish) => selected[dish.id]);
  const total = selectedDishes.reduce(
    (sum, dish) => sum + dish.price * (selected[dish.id] || 0),
    0
  );

  const handleConfirm = async () => {
    const order: Order = {
      id: Date.now().toString(),
      table,
      items: Object.entries(selected).map(([dishId, count]) => ({
        dishId,
        qty: count,
      })),
      status: "in voorbereiding",
      timestamp: Date.now(),
    };

    try {
      await addOrder(order);
      alert("✅ Bestelling is geplaatst!");
      onBack();
    } catch (err) {
      console.error("❌ Fout bij plaatsen van bestelling:", err);
      alert("Er ging iets mis bij het plaatsen van de bestelling.");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Overzicht bestelling (tafel {table})</h2>
      {selectedDishes.length === 0 ? (
        <p>Geen gerechten geselecteerd.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Gerecht</th>
              <th>Aantal</th>
              <th>Prijs</th>
            </tr>
          </thead>
          <tbody>
            {selectedDishes.map((dish) => (
              <tr key={dish.id}>
                <td>{dish.name}</td>
                <td>
                  <button onClick={() => onRemove(dish.id)}>-</button>
                  <span style={{ margin: "0 0.5rem" }}>{selected[dish.id]}</span>
                  <button onClick={() => onAdd(dish.id)}>+</button>
                </td>
                <td>€{dish.price * (selected[dish.id] || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>Totaal: €{total.toFixed(2)}</h3>

      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
        <button onClick={onBack}>← Terug</button>
        <button
          onClick={handleConfirm}
          disabled={selectedDishes.length === 0}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            borderRadius: "8px",
          }}
        >
          Bestelling plaatsen
        </button>
      </div>
    </div>
  );
}
