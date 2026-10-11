import React, { useState } from "react";
import { Dish, Order, OrderItem, OrderStatus, VatRate } from "../types";
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

type CartLine = {
  lineId: string;
  dishId: string;
  name: string;
  basePrice: number;
  vatRate: VatRate;
  modifiers: { id: string; name: string; price: number }[];
  qty: number;
  note: string;
};

// Categorieën zichtbaar in Dranken-tab (inclusief Verse sinaasappelsap)
const DRANKEN_CATEGORIES = new Set([
  "Dranken", "Drankjes", "Koffie", "Thee", "Frisdrank", "Sapjes", "Alcohol",
  "Verse sinaasappelsap",
]);

// Categorieën die ALLEEN in Dranken-tab staan (niet ook in Eten)
const DRANKEN_ONLY = new Set([
  "Dranken", "Drankjes", "Koffie", "Thee", "Frisdrank", "Sapjes", "Alcohol",
]);

// Volgorde Dranken: Koffie, Thee, Frisdrank eerst — dan rest alfabetisch
const DRANKEN_PRIORITY = ["Koffie", "Thee", "Frisdrank"];

// Volgorde Eten: prioriteit bovenaan — dan rest alfabetisch
const ETEN_PRIORITY = ["Broodjes", "Gebak", "Lunch", "Pannenkoeken", "Salades & Bowls", "Soepen"];

function sortCategories(cats: string[], priority: string[]): string[] {
  const prioritized = priority.filter((p) => cats.includes(p));
  const rest = cats.filter((c) => !priority.includes(c)).sort((a, b) => a.localeCompare(b, "nl"));
  return [...prioritized, ...rest];
}

function makeLineId(dishId: string, modifierIds: string[]): string {
  return [dishId, ...[...modifierIds].sort()].join("|");
}

function OrderItemsList({
  items,
  onRemoveItem,
}: {
  items: OrderItem[];
  onRemoveItem?: (dishId: string) => void;
}) {
  return (
    <ul style={{ margin: "0.25rem 0", padding: 0, listStyle: "none" }}>
      {items.map((item, i) => {
        const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.price, 0);
        const basePrice = item.price - modTotal;
        const lineTotal = item.price * item.qty;
        return (
          <li key={i} style={{ marginBottom: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", alignItems: "center" }}>
              <span>{item.qty}× {item.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>€{(basePrice * item.qty).toFixed(2)}</span>
                {onRemoveItem && (
                  <button
                    onClick={() => onRemoveItem(item.dishId)}
                    style={{ background: "none", border: "none", color: "#d9534f", cursor: "pointer", fontSize: "0.85rem", padding: "0 0.25rem" }}
                    title="Verwijder item"
                  >🗑️</button>
                )}
              </div>
            </div>
            {(item.modifiers ?? []).map((mod, mIdx) => (
              <div key={mIdx} style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1.5rem", fontSize: "0.8rem", color: "#555" }}>
                <span>↳ {mod.name}</span>
                {mod.price > 0 && <span style={{ color: "#2e7d32" }}>+€{mod.price.toFixed(2)}</span>}
              </div>
            ))}
            {item.note && (
              <div style={{ paddingLeft: "1.5rem", fontSize: "0.8rem", color: "#d9534f", fontStyle: "italic" }}>
                📝 {item.note}
              </div>
            )}
            {modTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1.5rem", fontSize: "0.85rem", fontWeight: "bold", borderTop: "1px solid #eee", marginTop: "2px", paddingTop: "2px" }}>
                <span>Totaal</span>
                <span>€{lineTotal.toFixed(2)}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ModifierModal({ dish, onConfirm, onCancel }: {
  dish: Dish;
  onConfirm: (chosen: { id: string; name: string; price: number }[]) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setChosen((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedModifiers = (dish.modifiers || []).filter((m) => chosen[m.id]);
  const extraPrice = selectedModifiers.reduce((s, m) => s + m.price, 0);
  const totalPrice = dish.price + extraPrice;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "2rem", width: "340px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 0.25rem 0" }}>{dish.name}</h2>
        <p style={{ margin: "0 0 1.25rem 0", color: "#555" }}>Basisprijs: €{dish.price.toFixed(2)}</p>
        <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Toevoegingen (optioneel):</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {(dish.modifiers || []).map((mod) => (
            <label key={mod.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.6rem 0.75rem", borderRadius: "8px", background: chosen[mod.id] ? "#e8f5e9" : "#f5f5f5", border: chosen[mod.id] ? "2px solid #4CAF50" : "2px solid transparent", transition: "all 0.15s", userSelect: "none" }}>
              <input type="checkbox" checked={!!chosen[mod.id]} onChange={() => toggle(mod.id)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
              <span style={{ flex: 1 }}>{mod.name}</span>
              <span style={{ color: mod.price === 0 ? "#888" : "#2e7d32", fontWeight: "bold" }}>
                {mod.price === 0 ? "gratis" : `+€${mod.price.toFixed(2)}`}
              </span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Totaal: €{totalPrice.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer", background: "#fff" }}>Annuleren</button>
          <button onClick={() => onConfirm(selectedModifiers)} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", background: "#4CAF50", color: "white", fontWeight: "bold" }}>Toevoegen</button>
        </div>
      </div>
    </div>
  );
}

const categoryIcons: Record<string, string> = {
  "Ontbijt": "🍳", "Drankjes": "🥤", "Soepen": "🍲", "Salades & Bowls": "🥗",
  "Lunch": "🍽️", "Broodjes": "🥪", "Gebak": "🥐", "Dranken": "🍹",
  "Pannenkoeken": "🥞", "Koffie": "☕", "Thee": "🫖", "Frisdrank": "🥤",
  "Sapjes": "🧃", "Alcohol": "🍷", "Kleine borrelhapjes": "🫒",
  "Frietjes": "🍟", "Borrelplanken": "🧀", "Verse sinaasappelsap": "🍊",
};

export default function Menu({ menu, selected, table, onBack, onAdd, onRemove, onClearCart, orders, onUpdateStatus }: Props) {
  const { addOrder, deleteOrder, updateOrderItems, markOrderPaid } = useOrdersContext();
  const { user } = useAuthContext();

  const [tab, setTab] = useState<"dranken" | "eten">("eten");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [deleteConfirmLineId, setDeleteConfirmLineId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [modifierDish, setModifierDish] = useState<Dish | null>(null);

  const activeMenu = menu.filter((dish) => !(dish as any).blocked);

  const drankenDishes = activeMenu.filter((d) => DRANKEN_CATEGORIES.has(d.category));
  const etenDishes = activeMenu.filter((d) => !DRANKEN_ONLY.has(d.category));

  const visibleDishes = tab === "dranken" ? drankenDishes : etenDishes;
  const allCatsInTab = [...new Set(visibleDishes.map((d) => d.category))];
  const sortedCategories = tab === "dranken"
    ? sortCategories(allCatsInTab, DRANKEN_PRIORITY)
    : sortCategories(allCatsInTab, ETEN_PRIORITY);

  const openOrder = orders.find((o) => o.table === table && o.status !== "Betaald");

  const handleRemoveItem = async (dishId: string) => {
    if (!openOrder) return;
    if (!window.confirm("Item verwijderen uit de bestelling?")) return;
    const updatedItems = openOrder.items.filter((i) => i.dishId !== dishId);
    if (updatedItems.length === 0) await deleteOrder(openOrder.id);
    else await updateOrderItems(openOrder.id, updatedItems);
  };

  const existingTotal = openOrder
    ? openOrder.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    : 0;

  const cartTotal = cart.reduce(
    (sum, line) => sum + (line.basePrice + line.modifiers.reduce((s, m) => s + m.price, 0)) * line.qty, 0
  );

  const handleDishClick = (dish: Dish) => {
    if (dish.modifiers && dish.modifiers.length > 0) setModifierDish(dish);
    else addToCart(dish, []);
  };

  const addToCart = (dish: Dish, chosenModifiers: { id: string; name: string; price: number }[]) => {
    const lineId = makeLineId(dish.id, chosenModifiers.map((m) => m.id));
    setCart((prev) => {
      const existing = prev.find((l) => l.lineId === lineId);
      if (existing) return prev.map((l) => l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { lineId, dishId: dish.id, name: dish.name, basePrice: dish.price, vatRate: dish.vatRate ?? 9, modifiers: chosenModifiers, qty: 1, note: "" }];
    });
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => {
      const line = prev.find((l) => l.lineId === lineId);
      if (!line) return prev;
      if (line.qty === 1) return prev.filter((l) => l.lineId !== lineId);
      return prev.map((l) => l.lineId === lineId ? { ...l, qty: l.qty - 1 } : l);
    });
  };

  const deleteFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
    setDeleteConfirmLineId(null);
  };

  const setNoteForLine = (lineId: string, note: string) =>
    setCart((prev) => prev.map((l) => l.lineId === lineId ? { ...l, note } : l));

  const cartToOrderItems = (lines: CartLine[]): OrderItem[] =>
    lines.map((line) => {
      const modTotal = line.modifiers.reduce((s, m) => s + m.price, 0);
      return { dishId: line.lineId, name: line.name, price: line.basePrice + modTotal, qty: line.qty, vatRate: line.vatRate, modifiers: line.modifiers, ...(line.note.trim() ? { note: line.note.trim() } : {}) };
    });

  const handleConfirm = async () => {
    if (cart.length === 0) { alert("ℹ️ Geen nieuwe items om te bestellen."); return; }
    const newItems = cartToOrderItems(cart);
    if (openOrder) {
      const updatedItems: OrderItem[] = [...openOrder.items];
      newItems.forEach((newItem) => {
        const existing = updatedItems.find((i) => i.dishId === newItem.dishId);
        if (existing) { existing.qty += newItem.qty; if (newItem.note) existing.note = newItem.note; }
        else updatedItems.push(newItem);
      });
      try { await updateOrderItems(openOrder.id, updatedItems); alert("✅ Extra items zijn toegevoegd!"); setCart([]); onClearCart(); onBack(); }
      catch { alert("Er ging iets mis bij het updaten van de bestelling."); }
    } else {
      const order: Omit<Order, "id"> = { table, items: newItems, status: "Open", timestamp: Date.now(), waiter: user?.username || "Onbekend" };
      try { await addOrder(order); alert("✅ Bestelling is geplaatst!"); setCart([]); onClearCart(); onBack(); }
      catch { alert("Er ging iets mis bij het plaatsen van de bestelling."); }
    }
  };

  const handlePaymentConfirm = (orderId: string, method: "cash" | "pin", tip: number, paidTotal: number, discountAmount: number) => {
    markOrderPaid(orderId, method, tip, paidTotal, discountAmount);
    setShowPayment(false);
    setCart([]); onClearCart(); onBack();
  };

  const switchTab = (t: "dranken" | "eten") => { setTab(t); setOpenCategory(null); };
  const toggleCategory = (cat: string) => setOpenCategory((prev) => prev === cat ? null : cat);

  const lineToDelete = cart.find((l) => l.lineId === deleteConfirmLineId);
  const openCatDishes = openCategory ? visibleDishes.filter((d) => d.category === openCategory) : [];

  return (
    <div style={{ display: "flex", gap: "1.5rem", padding: "1rem", alignItems: "flex-start" }}>

      {modifierDish && (
        <ModifierModal
          dish={modifierDish}
          onConfirm={(chosen) => { addToCart(modifierDish, chosen); setModifierDish(null); }}
          onCancel={() => setModifierDish(null)}
        />
      )}

      {deleteConfirmLineId && lineToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "2rem", width: "320px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Wil je <strong>{lineToDelete.name}</strong>
              {lineToDelete.modifiers.length > 0 && <> ({lineToDelete.modifiers.map((m) => m.name).join(", ")})</>}{" "}verwijderen?
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setDeleteConfirmLineId(null)} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #ccc", cursor: "pointer", background: "#fff" }}>Annuleren</button>
              <button onClick={() => deleteFromCart(deleteConfirmLineId)} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "none", cursor: "pointer", background: "#d9534f", color: "white", fontWeight: "bold" }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {showPayment && openOrder && (
        <PaymentModal order={openOrder} onConfirm={handlePaymentConfirm} onCancel={() => setShowPayment(false)} />
      )}

      {/* LINKERKANT */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Eten / Dranken tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button onClick={() => switchTab("eten")} style={{ flex: 1, padding: "0.65rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", background: tab === "eten" ? "#2c3e50" : "#e0e0e0", color: tab === "eten" ? "white" : "#333" }}>🍽️ Eten</button>
          <button onClick={() => switchTab("dranken")} style={{ flex: 1, padding: "0.65rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", background: tab === "dranken" ? "#2c3e50" : "#e0e0e0", color: tab === "dranken" ? "white" : "#333" }}>🍹 Dranken</button>
        </div>

        {/* Terug */}
        <button onClick={onBack} style={{ marginBottom: "1rem", padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: "0.9rem" }}>← Terug</button>

        {/* Categorie-tiles naast elkaar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {sortedCategories.map((category) => {
            const isOpen = openCategory === category;
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                  padding: "0.55rem 0.8rem", borderRadius: "10px",
                  border: "2px solid " + (isOpen ? "#2c3e50" : "#ddd"),
                  background: isOpen ? "#2c3e50" : "#f5f5f5",
                  color: isOpen ? "white" : "#2c3e50",
                  cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{categoryIcons[category] || "🍽️"}</span>
                <span>{category}</span>
              </button>
            );
          })}
        </div>

        {/* Gerechten van geselecteerde categorie */}
        {openCategory && (
          <div style={{ border: "2px solid #2c3e50", borderRadius: "10px", padding: "0.75rem", background: "#fff", display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {openCatDishes.map((dish) => (
              <div
                key={dish.id}
                onClick={() => handleDishClick(dish)}
                style={{ border: "2px solid #ddd", borderRadius: "10px", padding: "0.55rem", width: "115px", textAlign: "center", backgroundColor: "#fff", boxShadow: "1px 2px 4px rgba(0,0,0,0.07)", cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s", position: "relative", userSelect: "none", flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "2px 4px 10px rgba(0,0,0,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "1px 2px 4px rgba(0,0,0,0.07)"; }}
              >
                {dish.modifiers && dish.modifiers.length > 0 && (
                  <span style={{ position: "absolute", top: "6px", right: "6px", background: "#ff9800", color: "white", borderRadius: "99px", fontSize: "0.6rem", fontWeight: "bold", padding: "2px 6px" }}>opties</span>
                )}
                <img src={dish.image} alt={dish.name} style={{ width: "100%", borderRadius: "6px", userSelect: "none", pointerEvents: "none", aspectRatio: "4/3", objectFit: "cover" }} />
                <div style={{ marginTop: "0.35rem", fontWeight: "bold", fontSize: "0.82rem", lineHeight: 1.3 }}>{dish.name}</div>
                <div style={{ marginTop: "0.2rem", fontWeight: "bold", color: "#2c3e50", fontSize: "0.88rem" }}>€{dish.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECHTERKANT */}
      <div style={{ width: "370px", minWidth: "370px", display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1rem" }}>
        {openOrder && (
          <div style={{ border: "2px solid #4a90e2", borderRadius: "12px", padding: "1rem", backgroundColor: "#eef6ff" }}>
            <h2 style={{ marginTop: 0 }}>📋 Reeds besteld</h2>
            <OrderItemsList items={openOrder.items} onRemoveItem={handleRemoveItem} />
            <hr style={{ margin: "1rem 0" }} />
            <h3 style={{ margin: 0 }}>Geplaatst: €{existingTotal.toFixed(2)}</h3>
            <button
              onClick={async () => { if (!openOrder) return; if (!window.confirm("Hele order verwijderen?")) return; await deleteOrder(openOrder.id); onBack(); }}
              style={{ marginTop: "0.5rem", width: "100%", background: "#d9534f", color: "white", border: "none", padding: "0.5rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}
            >🗑️ Verwijder hele order</button>
          </div>
        )}

        <div style={{ border: "2px solid #ddd", borderRadius: "12px", padding: "1rem", backgroundColor: "#fafafa" }}>
          <h2 style={{ marginTop: 0 }}>🛒 Nieuwe items toevoegen</h2>

          {cart.length === 0 ? (
            <p>Geen gerechten geselecteerd.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {cart.map((line) => {
                const modTotal = line.modifiers.reduce((s, m) => s + m.price, 0);
                const lineTotal = (line.basePrice + modTotal) * line.qty;
                return (
                  <div key={line.lineId} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ flex: 1 }}>{line.name}</span>
                      <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => removeFromCart(line.lineId)}>-</button>
                        <span style={{ margin: "0 0.4rem" }}>{line.qty}</span>
                        <button onClick={() => { const dish = menu.find((d) => d.id === line.dishId); if (dish) addToCart(dish, line.modifiers); }}>+</button>
                      </div>
                      <span style={{ minWidth: "55px", textAlign: "right" }}>€{(line.basePrice * line.qty).toFixed(2)}</span>
                      <button onClick={() => setDeleteConfirmLineId(line.lineId)} style={{ background: "none", border: "none", color: "#d9534f", cursor: "pointer" }} title="Verwijder">🗑️</button>
                    </div>
                    {line.modifiers.map((mod, mIdx) => (
                      <div key={mIdx} style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1.5rem", fontSize: "0.85rem", color: "#666" }}>
                        <span>↳ {mod.name}</span>
                        <span style={{ color: "#2e7d32" }}>{mod.price > 0 ? `+€${mod.price.toFixed(2)}` : "gratis"}</span>
                      </div>
                    ))}
                    {modTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1.5rem", fontSize: "0.85rem", fontWeight: "bold" }}>
                        <span>Totaal</span><span>€{lineTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="📝 Notitie voor keuken/bar (optioneel)"
                      value={line.note}
                      onChange={(e) => setNoteForLine(line.lineId, e.target.value)}
                      style={{ marginTop: "0.4rem", width: "100%", boxSizing: "border-box", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <hr style={{ margin: "1rem 0" }} />
          <h3>Nieuw totaal: €{cartTotal.toFixed(2)}</h3>

          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button onClick={handleConfirm} disabled={cart.length === 0} style={{ backgroundColor: "#4CAF50", color: "white", border: "none", padding: "0.75rem", cursor: cart.length === 0 ? "not-allowed" : "pointer", borderRadius: "8px", fontWeight: "bold" }}>Bestelling plaatsen</button>
            {openOrder && (
              <button onClick={() => setShowPayment(true)} style={{ backgroundColor: "#2196F3", color: "white", border: "none", padding: "0.75rem", cursor: "pointer", borderRadius: "8px", fontWeight: "bold" }}>💳 Afrekenen</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}