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

// Eén orderregel in de winkelwagen (kan meerdere modifier-combinaties zijn)
type CartLine = {
  lineId: string;         // uniek per regel (dishId + modifier-combo)
  dishId: string;
  name: string;           // basisnaam
  basePrice: number;
  modifiers: { id: string; name: string; price: number }[];
  qty: number;
};

// Hulpfunctie: maak een unieke lineId op basis van dishId + gekozen modifiers
function makeLineId(dishId: string, modifierIds: string[]): string {
  return [dishId, ...[...modifierIds].sort()].join("|");
}

// Modifier popup component
function ModifierModal({
  dish,
  onConfirm,
  onCancel,
}: {
  dish: Dish;
  onConfirm: (chosen: { id: string; name: string; price: number }[]) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setChosen((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectedModifiers = (dish.modifiers || []).filter((m) => chosen[m.id]);
  const extraPrice = selectedModifiers.reduce((s, m) => s + m.price, 0);
  const totalPrice = dish.price + extraPrice;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          width: "340px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <h2 style={{ margin: "0 0 0.25rem 0" }}>{dish.name}</h2>
        <p style={{ margin: "0 0 1.25rem 0", color: "#555" }}>
          Basisprijs: €{dish.price.toFixed(2)}
        </p>

        <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
          Toevoegingen (optioneel):
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {(dish.modifiers || []).map((mod) => (
            <label
              key={mod.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                background: chosen[mod.id] ? "#e8f5e9" : "#f5f5f5",
                border: chosen[mod.id] ? "2px solid #4CAF50" : "2px solid transparent",
                transition: "all 0.15s",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={!!chosen[mod.id]}
                onChange={() => toggle(mod.id)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ flex: 1 }}>{mod.name}</span>
              <span style={{ color: mod.price === 0 ? "#888" : "#2e7d32", fontWeight: "bold" }}>
                {mod.price === 0 ? "gratis" : `+€${mod.price.toFixed(2)}`}
              </span>
            </label>
          ))}
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
            Totaal: €{totalPrice.toFixed(2)}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #ccc",
              cursor: "pointer",
              background: "#fff",
            }}
          >
            Annuleren
          </button>
          <button
            onClick={() => onConfirm(selectedModifiers)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: "#4CAF50",
              color: "white",
              fontWeight: "bold",
            }}
          >
            Toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [deleteConfirmLineId, setDeleteConfirmLineId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  // Winkelwagen: lijst van CartLines (per modifier-combinatie apart)
  const [cart, setCart] = useState<CartLine[]>([]);

  // Welk gerecht heeft de modifier-popup open?
  const [modifierDish, setModifierDish] = useState<Dish | null>(null);

  const categories = [...new Set(menu.map((dish) => dish.category))];
  const visibleDishes = selectedCategory
    ? menu.filter((dish) => dish.category === selectedCategory)
    : [];

  const openOrder = orders.find(
    (o) => o.table === table && o.status !== "Betaald"
  );

  const existingTotal = openOrder
    ? openOrder.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    : 0;

  const cartTotal = cart.reduce(
    (sum, line) =>
      sum + (line.basePrice + line.modifiers.reduce((s, m) => s + m.price, 0)) * line.qty,
    0
  );

  // Gerecht aangeklikt — heeft het modifiers? → popup, anders direct toevoegen
  const handleDishClick = (dish: Dish) => {
    if (dish.modifiers && dish.modifiers.length > 0) {
      setModifierDish(dish);
    } else {
      addToCart(dish, []);
    }
  };

  const addToCart = (
    dish: Dish,
    chosenModifiers: { id: string; name: string; price: number }[]
  ) => {
    const lineId = makeLineId(dish.id, chosenModifiers.map((m) => m.id));
    setCart((prev) => {
      const existing = prev.find((l) => l.lineId === lineId);
      if (existing) {
        return prev.map((l) =>
          l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          lineId,
          dishId: dish.id,
          name: dish.name,
          basePrice: dish.price,
          modifiers: chosenModifiers,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => {
      const line = prev.find((l) => l.lineId === lineId);
      if (!line) return prev;
      if (line.qty === 1) return prev.filter((l) => l.lineId !== lineId);
      return prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty - 1 } : l));
    });
  };

  const deleteFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
    setDeleteConfirmLineId(null);
  };

  // Zet CartLine om naar OrderItem (prijs inclusief modifiers)
  const cartToOrderItems = (lines: CartLine[]): OrderItem[] =>
    lines.map((line) => {
      const extraPrice = line.modifiers.reduce((s, m) => s + m.price, 0);
      return {
        dishId: line.lineId, // lineId als unieke sleutel zodat combinaties apart staan
        name:
          line.modifiers.length > 0
            ? `${line.name} (${line.modifiers.map((m) => m.name).join(", ")})`
            : line.name,
        price: line.basePrice + extraPrice,
        qty: line.qty,
        modifiers: line.modifiers,
      };
    });

  const handleConfirm = async () => {
    if (cart.length === 0) {
      alert("ℹ️ Geen nieuwe items om te bestellen.");
      return;
    }

    const newItems = cartToOrderItems(cart);

    if (openOrder) {
      // Voeg toe aan bestaande order
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
        setCart([]);
        onClearCart();
        onBack();
      } catch (err) {
        console.error("❌ Fout bij updaten van bestelling:", err);
        alert("Er ging iets mis bij het updaten van de bestelling.");
      }
    } else {
      const order: Omit<Order, "id"> = {
        table,
        items: newItems,
        status: "Open",
        timestamp: Date.now(),
        waiter: user?.username || "Onbekend",
      };

      try {
        await addOrder(order);
        alert("✅ Bestelling is geplaatst!");
        setCart([]);
        onClearCart();
        onBack();
      } catch (err) {
        console.error("❌ Fout bij plaatsen van bestelling:", err);
        alert("Er ging iets mis bij het plaatsen van de bestelling.");
      }
    }
  };

  const handlePaymentConfirm = (
    orderId: string,
    method: "cash" | "pin",
    tip: number
  ) => {
    console.log("Betaald via:", method, "Fooi:", tip);
    onUpdateStatus(orderId, "Betaald");
    setShowPayment(false);
    setCart([]);
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

  const lineToDelete = cart.find((l) => l.lineId === deleteConfirmLineId);

  return (
    <div style={{ display: "flex", gap: "2rem", padding: "1rem", alignItems: "flex-start" }}>

      {/* Modifier popup */}
      {modifierDish && (
        <ModifierModal
          dish={modifierDish}
          onConfirm={(chosen) => {
            addToCart(modifierDish, chosen);
            setModifierDish(null);
          }}
          onCancel={() => setModifierDish(null)}
        />
      )}

      {/* Verwijder bevestiging modal */}
      {deleteConfirmLineId && lineToDelete && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white", borderRadius: "12px", padding: "2rem",
              width: "320px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", textAlign: "center",
            }}
          >
            <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Wil je <strong>{lineToDelete.name}</strong>
              {lineToDelete.modifiers.length > 0 && (
                <> ({lineToDelete.modifiers.map((m) => m.name).join(", ")})</>
              )}{" "}
              verwijderen?
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setDeleteConfirmLineId(null)}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "8px",
                  border: "1px solid #ccc", cursor: "pointer", background: "#fff",
                }}
              >
                Annuleren
              </button>
              <button
                onClick={() => deleteFromCart(deleteConfirmLineId)}
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

      {/* LINKERKANT — menu */}
      <div style={{ flex: 1 }}>
        <h2 style={{ textAlign: "center" }}>
          {selectedCategory ? selectedCategory : "Kies een categorie"}
        </h2>

        {!selectedCategory ? (
          <div
            style={{
              display: "flex", flexWrap: "wrap", gap: "1rem",
              justifyContent: "center", marginTop: "1rem",
            }}
          >
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

            <div
              style={{
                display: "flex", flexWrap: "wrap", gap: "1rem",
                justifyContent: "center", marginTop: "1rem",
              }}
            >
              {visibleDishes.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => handleDishClick(dish)}
                  style={{
                    border: "2px solid #ccc", borderRadius: "12px", padding: "1rem",
                    width: "180px", textAlign: "center", backgroundColor: "#fff",
                    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)", cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {/* Badge als het gerecht modifiers heeft */}
                  {dish.modifiers && dish.modifiers.length > 0 && (
                    <span
                      style={{
                        position: "absolute", top: "8px", right: "8px",
                        background: "#ff9800", color: "white", borderRadius: "99px",
                        fontSize: "0.65rem", fontWeight: "bold", padding: "2px 7px",
                      }}
                    >
                      opties
                    </span>
                  )}
                  <img
                    src={dish.image}
                    alt={dish.name}
                    style={{ width: "100%", borderRadius: "8px", userSelect: "none", pointerEvents: "none" }}
                  />
                  <h3 style={{ margin: "0.5rem 0 0 0" }}>{dish.name}</h3>
                  <p style={{ margin: "0.25rem 0", fontWeight: "bold" }}>
                    €{dish.price.toFixed(2)}
                  </p>
                  {dish.modifiers && dish.modifiers.length > 0 && (
                    <p style={{ margin: "0.25rem 0", fontSize: "0.75rem", color: "#888" }}>
                      Tik om opties te kiezen
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RECHTERKANT */}
      <div
        style={{
          width: "370px", minWidth: "370px",
          display: "flex", flexDirection: "column", gap: "1rem",
          position: "sticky", top: "1rem",
        }}
      >
        {/* REEDS BESTELD */}
        {openOrder && (
          <div
            style={{
              border: "2px solid #4a90e2", borderRadius: "12px",
              padding: "1rem", backgroundColor: "#eef6ff",
            }}
          >
            <h2>📋 Reeds besteld</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Gerecht</th>
                  <th>Aantal</th>
                  <th style={{ textAlign: "right" }}>Prijs</th>
                </tr>
              </thead>
              <tbody>
                {openOrder.items.map((item) => (
                  <tr key={item.dishId}>
                    <td style={{ paddingRight: "0.5rem" }}>{item.name}</td>
                    <td style={{ textAlign: "center" }}>{item.qty}</td>
                    <td style={{ textAlign: "right" }}>
                      €{(item.price * item.qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr style={{ margin: "1rem 0" }} />
            <h3>Geplaatst: €{existingTotal.toFixed(2)}</h3>
          </div>
        )}

        {/* WINKELWAGEN — nieuwe items */}
        <div
          style={{
            border: "2px solid #ddd", borderRadius: "12px",
            padding: "1rem", backgroundColor: "#fafafa",
          }}
        >
          <h2>🛒 Nieuwe items toevoegen</h2>

          {cart.length === 0 ? (
            <p>Geen gerechten geselecteerd.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Gerecht</th>
                  <th>Aantal</th>
                  <th style={{ textAlign: "right" }}>Prijs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => {
                  const linePrice =
                    (line.basePrice + line.modifiers.reduce((s, m) => s + m.price, 0)) *
                    line.qty;
                  return (
                    <tr key={line.lineId}>
                      <td style={{ paddingRight: "0.5rem" }}>
                        <div>{line.name}</div>
                        {line.modifiers.length > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "#666" }}>
                            + {line.modifiers.map((m) => m.name).join(", ")}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => removeFromCart(line.lineId)}>-</button>
                        <span style={{ margin: "0 0.4rem" }}>{line.qty}</span>
                        <button
                          onClick={() => {
                            const dish = menu.find((d) => d.id === line.dishId);
                            if (dish) addToCart(dish, line.modifiers);
                          }}
                        >
                          +
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>€{linePrice.toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => setDeleteConfirmLineId(line.lineId)}
                          style={{
                            background: "none", border: "none",
                            color: "#d9534f", cursor: "pointer",
                          }}
                          title="Verwijder"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <hr style={{ margin: "1rem 0" }} />
          <h3>Nieuw totaal: €{cartTotal.toFixed(2)}</h3>

          <div
            style={{
              marginTop: "1rem", display: "flex",
              flexDirection: "column", gap: "0.75rem",
            }}
          >
            <button onClick={onBack}>← Terug</button>

            <button
              onClick={handleConfirm}
              disabled={cart.length === 0}
              style={{
                backgroundColor: "#4CAF50", color: "white",
                border: "none", padding: "0.75rem",
                cursor: cart.length === 0 ? "not-allowed" : "pointer",
                borderRadius: "8px", fontWeight: "bold",
              }}
            >
              Bestelling plaatsen
            </button>

            {openOrder && (
              <button
                onClick={() => setShowPayment(true)}
                style={{
                  backgroundColor: "#2196F3", color: "white",
                  border: "none", padding: "0.75rem",
                  cursor: "pointer", borderRadius: "8px", fontWeight: "bold",
                }}
              >
                💳 Afrekenen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}