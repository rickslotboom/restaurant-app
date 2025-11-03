import React, { useState, useEffect } from "react";
import { MENU } from "./data/menuData";
import Header from "./components/Header";
import Menu from "./components/Menu";
import OrderSummary from "./components/OrderSummary";
import KitchenView from "./components/KitchenView";
import { useOrdersContext } from "./hooks/useOrders";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth"; // ✅ Nieuw
import { auth } from "./firebase"; // ✅ Nieuw
import styles from "./App.module.css";

export default function App() {
  const [view, setView] = useState<"menu" | "summary" | "kitchen">("menu");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [table] = useState("1");

  const { orders, updateOrderStatus } = useOrdersContext();

  // ✅ Nieuw: automatisch anoniem inloggen bij Firebase
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => console.log("✅ Anoniem ingelogd bij Firebase"))
      .catch((err) => console.error("❌ Fout bij anonieme login:", err));

    onAuthStateChanged(auth, (user) => {
      if (user) console.log("Huidige anonieme gebruiker:", user.uid);
    });
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

  return (
    <div className={styles.app}>
      <Header
        view={view}
        setView={setView}
        orderCount={orders.filter((o) => o.status !== "geserveerd").length}
      />
      <main className={styles.main}>
        {view === "menu" && (
          <Menu
            menu={MENU}
            selected={selected}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}

        {view === "summary" && (
          <OrderSummary
            menu={MENU}
            selected={selected}
            table={table}
            onBack={() => setView("menu")}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}

        {view === "kitchen" && (
          <KitchenView orders={orders} onUpdateStatus={updateOrderStatus} />
        )}
      </main>
    </div>
  );
}
