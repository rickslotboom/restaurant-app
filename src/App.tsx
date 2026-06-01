import React, { useState, useEffect } from "react";
import { MENU } from "./data/menuData";
import Header from "./components/Header";
import Menu from "./components/Menu";
import KitchenView from "./components/KitchenView";
import BillingView from "./components/BillingView";
import Login from "./components/Login";
import { useOrdersContext } from "./hooks/useOrders";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./App.module.css";
import { useAuthContext } from "./hooks/useAuth";

export default function App() {
  const { user, logout } = useAuthContext();
  const { orders, updateOrderStatus } = useOrdersContext();

  const [view, setView] = useState<"menu" | "kitchen" | "billing">("menu");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [table] = useState("1");

  const clearCart = () => setSelected({});

  useEffect(() => {
    signInAnonymously(auth).catch((err) =>
      console.error("Anonieme login fout:", err)
    );
  }, []);

  const handleAdd = (id: string) =>
    setSelected((s) => ({
      ...s,
      [id]: (s[id] || 0) + 1,
    }));

  const handleRemove = (id: string) =>
    setSelected((s) => {
      const val = (s[id] || 0) - 1;

      if (val <= 0) {
        const copy = { ...s };
        delete copy[id];
        return copy;
      }

      return {
        ...s,
        [id]: val,
      };
    });

  if (!user) return <Login />;

  const handleLogout = () => {
    logout();
    setView("menu");
    clearCart();
  };

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
          if (user.role === "keuken" && newView !== "kitchen") return;
          setView(newView);
        }}
        orderCount={
          orders.filter((o) => o.status !== "Afgehandeld").length
        }
        onLogout={handleLogout}
        user={user}
      />

      <main className={styles.main}>
        {user.role === "bediening" && view === "menu" && (
          <Menu
            menu={MENU}
            selected={selected}
            table={table}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onBack={() => setView("menu")}
            onClearCart={clearCart}
          />
        )}

        {user.role === "bediening" && view === "billing" && (
          <BillingView
            orders={orders}
            onUpdateStatus={updateOrderStatus}
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