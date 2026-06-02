import React, { useState } from "react";
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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );

  const categories = [...new Set(menu.map((dish) => dish.category))];

  const visibleDishes = selectedCategory
    ? menu.filter((dish) => dish.category === selectedCategory)
    : [];

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

  // 🎨 Icons per categorie
  const categoryIcons: Record<string, string> = {
    Ontbijt: "🍳",
    Dranken: "🍹",
    "Snelle hap": "🍔",
    Soepen: "🍲",
    "Salades & Bowls": "🥗",
    Lunch: "🍽️",
    Broodjes: "🥪",
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
      {/* LINKERKANT */}
      <div style={{ flex: 1 }}>
        <h2 style={{ textAlign: "center" }}>
          {selectedCategory ? selectedCategory : "Kies een categorie"}
        </h2>

        {!selectedCategory ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
              marginTop: "1rem",
            }}
          >
            {categories.map((category) => (
              <div
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  backgroundColor: "#2c3e50",
                  color: "white",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  width: "200px",
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight: "bold",
                  boxShadow: "2px 4px 12px rgba(0,0,0,0.2)",
                  transition: "transform 0.15s ease",
                  userSelect: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <div style={{ fontSize: "2rem" }}>
                  {categoryIcons[category] || "🍽️"}
                </div>
                <div style={{ marginTop: "0.5rem" }}>{category}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
              }}
            >
              ← Terug naar categorieën
            </button>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                justifyContent: "center",
                marginTop: "1rem",
              }}
            >
              {visibleDishes.map((dish) => (
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
                    transition:
                      "transform 0.15s ease, box-shadow 0.15s ease",
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

                  <h3 style={{ margin: "0.5rem 0 0 0" }}>
                    {dish.name}
                  </h3>

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
                    <button onClick={() => onRemove(dish.id)}>
                      -
                    </button>

                    <span>{selected[dish.id] || 0}</span>

                    <button onClick={() => onAdd(dish.id)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RECHTERKANT */}
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

                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => onRemove(dish.id)}>
                      -
                    </button>

                    <span style={{ margin: "0 0.5rem" }}>
                      {selected[dish.id]}
                    </span>

                    <button onClick={() => onAdd(dish.id)}>
                      +
                    </button>
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
          <button onClick={onBack}>← Terug</button>

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