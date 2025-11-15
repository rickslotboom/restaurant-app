import React, { useState, useEffect } from "react";
import { MENU } from "./data/menuData";
import Header from "./components/Header";
import Menu from "./components/Menu";
import OrderSummary from "./components/OrderSummary";
import KitchenView from "./components/KitchenView";
import Login from "./components/Login";
import { useOrdersContext } from "./hooks/useOrders";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./App.module.css";
import { useAuthContext } from "./hooks/useAuth";

export default function App() {
  const { user, login, logout } = useAuthContext();
  const { orders, updateOrderStatus } = useOrdersContext();

  const [view, setView] = useState<"menu" | "summary" | "kitchen">("menu");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [table] = useState("1");

  // Clear cart
  const clearCart = () => setSelected({});

  // 🔐 Anoniem inloggen voor Firestore permissies
  useEffect(() => {
    signInAnonymously(auth).catch((err) =>
      console.error("Anonieme login fout:", err)
    );
  }, []);

  const handleAdd = (id: string) =>
    setSelected((s) => ({ ...s, [id]: (s[id] || 0) + 1 }));

  const handleRemove = (id: string) =>
    setSelected((s) => {
      const val = (s[id] || 0) - 1;
      if (val <= 0) {
        const copy = { ...s };
        delete copy[id];
        return copy;
      }
      return { ...s, [id]: val };
    });

  // 🔒 Pagina beveiliging: toon login als geen user
  if (!user) return <Login />;

  // 🔐 Logout
  const handleLogout = () => {
    logout();
    setView("menu"); // reset view
    clearCart();
  };

  // Kok mag alleen de keuken zien
  if (user.role === "keuken" && view !== "kitchen") {
    return (
      <KitchenView
        orders={orders}
        onUpdateStatus={updateOrderStatus}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={styles.app}>
      <Header
        view={view}
        setView={(newView) => {
          // Kok mag geen menu of summary kiezen
          if (user.role === "keuken" && newView !== "kitchen") return;
          setView(newView);
        }}
        orderCount={orders.filter((o) => o.status !== "Afgehandeld").length}
        onLogout={handleLogout}
        user={user}
      />

      <main className={styles.main}>
        {user.role === "bediening" && view === "menu" && (
          <Menu
            menu={MENU}
            selected={selected}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}

        {user.role === "bediening" && view === "summary" && (
          <OrderSummary
            menu={MENU}
            selected={selected}
            table={table}
            onBack={() => setView("menu")}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onClearCart={clearCart}
          />
        )}

        {user.role === "keuken" && view === "kitchen" && (
          <KitchenView
            orders={orders}
            onUpdateStatus={updateOrderStatus}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
