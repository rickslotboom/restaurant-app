import React from "react";
import { Dish, Order } from "../types";
import { useOrdersContext } from "../hooks/useOrders";
import { useAuthContext } from "../hooks/useAuth";

type Props = {
  menu: Dish[];
  selected: Record<string, number>;
  table: string;
  onBack: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
};

export default function Menu({
  menu,
  selected,
  table,
  onBack,
  onAdd,
  onRemove,
  onClearCart,
}: Props) {
  const { addOrder } = useOrdersContext();
  const { user } = useAuthContext();

  const selectedDishes = menu.filter((dish) => selected[dish.id] > 0);

  const total = selectedDishes.reduce(
    (sum, dish) => sum + dish.price * (selected[dish.id] || 0),
    0
  );

  const handleConfirm = async () => {
    const order: Omit<Order, "id"> = {
      table,
      items: Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([dishId, qty]) => {
          const dish = menu.find((d) => d.id === dishId);

          return {
            dishId,
            name: dish?.name || "Onbekend",
            price: dish?.price || 0,
            qty,
          };
        }),
      status: "Open",
      timestamp: Date.now(),
      waiter: user?.username || "Onbekend",
    };

    try {
      await addOrder(order);
      alert("✅ Bestelling is geplaatst!");
      onClearCart();
      onBack();
    } catch (err) {
      console.error("❌ Fout bij plaatsen van bestelling:", err);
      alert("Er ging iets mis bij het plaatsen van de bestelling.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        padding: "1rem",
        alignItems: "flex-start",
      }}
    >
      {/* Linkerkant - Menu */}
      <div style={{ flex: 1 }}>
        <h2 style={{ textAlign: "center" }}>Kies een gerecht:</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          {menu.map((dish) => (
            <div
              key={dish.id}
              onClick={() => onAdd(dish.id)}
              style={{
                border: "2px solid #ccc",
                borderRadius: "12px",
                padding: "1rem",
                width: "180px",
                textAlign: "center",
                backgroundColor: "#fff",
                boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <img
                src={dish.image}
                alt={dish.name}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />

              <h3 style={{ margin: "0.5rem 0 0 0" }}>{dish.name}</h3>

              <p
                style={{
                  margin: "0.25rem 0",
                  fontWeight: "bold",
                }}
              >
                €{dish.price.toFixed(2)}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => onRemove(dish.id)}>-</button>

                <span>{selected[dish.id] || 0}</span>

                <button onClick={() => onAdd(dish.id)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rechterkant - Besteloverzicht */}
      <div
        style={{
          width: "350px",
          minWidth: "350px",
          border: "2px solid #ddd",
          borderRadius: "12px",
          padding: "1rem",
          backgroundColor: "#fafafa",
          position: "sticky",
          top: "1rem",
        }}
      >
        <h2>Bestelling tafel {table}</h2>

        {selectedDishes.length === 0 ? (
          <p>Geen gerechten geselecteerd.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
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

                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => onRemove(dish.id)}>-</button>

                    <span style={{ margin: "0 0.5rem" }}>
                      {selected[dish.id]}
                    </span>

                    <button onClick={() => onAdd(dish.id)}>+</button>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    €
                    {(dish.price * selected[dish.id]).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <hr style={{ margin: "1rem 0" }} />

        <h3>Totaal: €{total.toFixed(2)}</h3>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <button onClick={onBack}>
            ← Terug
          </button>

          <button
            onClick={handleConfirm}
            disabled={selectedDishes.length === 0}
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              padding: "0.75rem",
              cursor:
                selectedDishes.length === 0
                  ? "not-allowed"
                  : "pointer",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            Bestelling plaatsen
          </button>
        </div>
      </div>
    </div>
  );
}