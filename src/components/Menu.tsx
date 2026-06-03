import React, { useState } from "react";
import { Dish, Order, OrderItem, OrderStatus } from "../types";
import { useOrdersContext } from "../hooks/useOrders";
import { useAuthContext } from "../hooks/useAuth";
import PaymentModal from "./PaymentModal";

type Props = {
  menu: Dish[];
  selected: Record<string, number>;
  table: string;
  onBack: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCart: () => void;
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
};

export default function Menu({
  menu,
  selected,
  table,
  onBack,
  onAdd,
  onRemove,
  onClearCart,
  orders,
  onUpdateStatus,
}: Props) {
  const { addOrder, updateOrderItems } = useOrdersContext();
  const { user } = useAuthContext();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const categories = [...new Set(menu.map((dish) => dish.category))];
  const visibleDishes = selectedCategory
    ? menu.filter((dish) => dish.category === selectedCategory)
    : [];
  const selectedDishes = menu.filter((dish) => selected[dish.id] > 0);
  const total = selectedDishes.reduce(
    (sum, dish) => sum + dish.price * (selected[dish.id] || 0),
    0
  );

  const openOrder = orders.find((o) => o.table === table && o.status === "Open");

  // Bouw items array op vanuit huidige selected state
  const buildItems = (overrideSelected?: Record<string, number>): OrderItem[] => {
    const src = overrideSelected ?? selected;
    return Object.entries(src)
      .filter(([, qty]) => qty > 0)
      .map(([dishId, qty]) => {
        const dish = menu.find((d) => d.id === dishId);
        return {
          dishId,
          name: dish?.name || "Onbekend",
          price: dish?.price || 0,
          qty,
        };
      });
  };

  const handleConfirm = async () => {
  if (openOrder) {
    // Bereken alleen de NIEUWE items (verschil met bestaande order)
    const newItems: OrderItem[] = Object.entries(selected)
      .filter(([dishId, qty]) => {
        const existingItem = openOrder.items.find((i) => i.dishId === dishId);
        const existingQty = existingItem?.qty ?? 0;
        return qty > existingQty; // alleen items die zijn toegevoegd
      })
      .map(([dishId, qty]) => {
        const dish = menu.find((d) => d.id === dishId);
        const existingQty = openOrder.items.find((i) => i.dishId === dishId)?.qty ?? 0;
        return {
          dishId,
          name: dish?.name || "Onbekend",
          price: dish?.price || 0,
          qty: qty - existingQty, // alleen het verschil
        };
      });

    if (newItems.length === 0) {
      alert("ℹ️ Geen nieuwe items om te bestellen.");
      return;
    }

    // Voeg nieuwe items toe aan bestaande order
    const updatedItems: OrderItem[] = [...openOrder.items];
    newItems.forEach((newItem) => {
      const existing = updatedItems.find((i) => i.dishId === newItem.dishId);
      if (existing) {
        existing.qty += newItem.qty;
      } else {
        updatedItems.push(newItem);
      }
    });

    try {
      await updateOrderItems(openOrder.id, updatedItems);
      alert("✅ Extra items zijn toegevoegd aan de bestaande bestelling!");
      onClearCart();
      onBack();
    } catch (err) {
      console.error("❌ Fout bij updaten van bestelling:", err);
      alert("Er ging iets mis bij het updaten van de bestelling.");
    }

  } else {
    // Geen open order — maak nieuwe aan
    const order: Omit<Order, "id"> = {
      table,
      items: buildItems(),
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
  }
};

  const handleDeleteExecute = async () => {
    if (!deleteConfirmId) return;

    // Verwijder uit lokale state
    const qty = selected[deleteConfirmId] || 0;
    const newSelected = { ...selected };
    delete newSelected[deleteConfirmId];

    // Update lokale state via onRemove voor elk item
    for (let i = 0; i < qty; i++) {
      onRemove(deleteConfirmId);
    }

    // Als er een open order is, update ook Firestore
    if (openOrder) {
      const newItems = buildItems(newSelected);
      if (newItems.length === 0) {
        // Geen items meer — markeer als afgehandeld
        await onUpdateStatus(openOrder.id, "Afgehandeld");
      } else {
        await updateOrderItems(openOrder.id, newItems);
      }
    }

    setDeleteConfirmId(null);
  };

  const handlePaymentConfirm = (orderId: string, method: "cash" | "pin", tip: number) => {
    console.log("Betaald via:", method, "Fooi:", tip);
    onUpdateStatus(orderId, "Betaald");
    setShowPayment(false);
    onClearCart();
    onBack();
  };

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
    <div style={{ display: "flex", gap: "2rem", padding: "1rem", alignItems: "flex-start" }}>

      {/* Verwijder bevestiging modal */}
      {deleteConfirmId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "2rem",
            width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", textAlign: "center",
          }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Wil je <strong>{menu.find((d) => d.id === deleteConfirmId)?.name}</strong> verwijderen?
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "8px",
                  border: "1px solid #ccc", cursor: "pointer", background: "#fff",
                }}
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteExecute}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "8px",
                  border: "none", cursor: "pointer",
                  background: "#d9534f", color: "white", fontWeight: "bold",
                }}
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Betaal modal */}
      {showPayment && openOrder && (
        <PaymentModal
          order={openOrder}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* LINKERKANT */}
      <div style={{ flex: 1 }}>
        <h2 style={{ textAlign: "center" }}>
          {selectedCategory ? selectedCategory : "Kies een categorie"}
        </h2>

        {!selectedCategory ? (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "1rem",
            justifyContent: "center", marginTop: "1rem",
          }}>
            {categories.map((category) => (
              <div
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  backgroundColor: "#2c3e50", color: "white",
                  borderRadius: "16px", padding: "1.5rem", width: "200px",
                  textAlign: "center", cursor: "pointer", fontWeight: "bold",
                  boxShadow: "2px 4px 12px rgba(0,0,0,0.2)",
                  transition: "transform 0.15s ease", userSelect: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{ fontSize: "2rem" }}>{categoryIcons[category] || "🍽️"}</div>
                <div style={{ marginTop: "0.5rem" }}>{category}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{ marginBottom: "1rem", padding: "0.75rem 1rem" }}
            >
              ← Terug naar categorieën
            </button>

            <div style={{
              display: "flex", flexWrap: "wrap", gap: "1rem",
              justifyContent: "center", marginTop: "1rem",
            }}>
              {visibleDishes.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => onAdd(dish.id)}
                  style={{
                    border: "2px solid #ccc", borderRadius: "12px", padding: "1rem",
                    width: "180px", textAlign: "center", backgroundColor: "#fff",
                    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)", cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <img
                    src={dish.image}
                    alt={dish.name}
                    style={{ width: "100%", borderRadius: "8px", userSelect: "none", pointerEvents: "none" }}
                  />
                  <h3 style={{ margin: "0.5rem 0 0 0" }}>{dish.name}</h3>
                  <p style={{ margin: "0.25rem 0", fontWeight: "bold" }}>€{dish.price.toFixed(2)}</p>
                  <div
                    style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={() => onRemove(dish.id)}>-</button>
                    <span>{selected[dish.id] || 0}</span>
                    <button onClick={() => onAdd(dish.id)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RECHTERKANT */}
      <div style={{
        width: "350px", minWidth: "350px", border: "2px solid #ddd",
        borderRadius: "12px", padding: "1rem", backgroundColor: "#fafafa",
        position: "sticky", top: "1rem",
      }}>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selectedDishes.map((dish) => (
                <tr key={dish.id}>
                  <td style={{ paddingRight: "0.5rem" }}>{dish.name}</td>
                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => onRemove(dish.id)}>-</button>
                    <span style={{ margin: "0 0.5rem" }}>{selected[dish.id]}</span>
                    <button onClick={() => onAdd(dish.id)}>+</button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    €{(dish.price * selected[dish.id]).toFixed(2)}
                  </td>
                  <td style={{ paddingLeft: "0.5rem" }}>
                    <button
                      onClick={() => setDeleteConfirmId(dish.id)}
                      style={{
                        background: "none", border: "none",
                        color: "#d9534f", cursor: "pointer",
                        fontSize: "1rem", padding: "0.2rem",
                      }}
                      title="Verwijder item"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <hr style={{ margin: "1rem 0" }} />
        <h3>Totaal: €{total.toFixed(2)}</h3>

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button onClick={onBack}>← Terug</button>

          <button
            onClick={handleConfirm}
            disabled={selectedDishes.length === 0}
            style={{
              backgroundColor: "#4CAF50", color: "white", border: "none",
              padding: "0.75rem",
              cursor: selectedDishes.length === 0 ? "not-allowed" : "pointer",
              borderRadius: "8px", fontWeight: "bold",
            }}
          >
            Bestelling plaatsen
          </button>

          {openOrder && (
            <button
              onClick={() => setShowPayment(true)}
              style={{
                backgroundColor: "#2196F3", color: "white", border: "none",
                padding: "0.75rem", cursor: "pointer",
                borderRadius: "8px", fontWeight: "bold",
              }}
            >
              💳 Afrekenen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}