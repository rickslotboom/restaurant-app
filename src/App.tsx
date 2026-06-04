import React, { useState, useEffect } from "react";
import { MENU } from "./data/menuData";
import Header from "./components/Header";
import Menu from "./components/Menu";
import FloorPlan from "./components/FloorPlan";
import KitchenView from "./components/KitchenView";
import BillingView from "./components/BillingView";
import Login from "./components/Login";
import { useOrdersContext } from "./hooks/useOrders";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./App.module.css";
import { useAuthContext } from "./hooks/useAuth";

console.log("Header:", Header);
console.log("Menu:", Menu);
console.log("FloorPlan:", FloorPlan);
console.log("KitchenView:", KitchenView);
console.log("BillingView:", BillingView);
console.log("Login:", Login);

export default function App() {
  const { user, logout } = useAuthContext();
  const { orders, updateOrderStatus, updateOrderTable } = useOrdersContext();

  const [view, setView] = useState<"floorplan" | "menu" | "kitchen" | "billing">("floorplan");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [table, setTable] = useState("1");

  const clearCart = () => setSelected({});

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

  if (!user) return <Login />;

  const handleLogout = () => {
    logout();
    setView("floorplan");
    clearCart();
  };

  const handleTableSelect = (tableNumber: string) => {
    setTable(tableNumber);
    clearCart();
    setView("menu");
  };

  const handleMoveTable = async (fromTable: string, toTable: string) => {
    const order = orders.find(
      (o) => o.table === fromTable && o.status !== "Betaald"
    );
    if (!order) return;
    try {
      await updateOrderTable(order.id, toTable);
      alert(`✅ Tafel ${fromTable} verplaatst naar tafel ${toTable}`);
    } catch (err) {
      alert("Er ging iets mis bij het verplaatsen.");
    }
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
        orderCount={orders.filter((o) => o.status === "Open").length}
        onLogout={handleLogout}
        user={user}
      />

      <main className={styles.main}>
        {user.role === "bediening" && view === "floorplan" && (
          <FloorPlan
            orders={orders}
            onTableSelect={handleTableSelect}
            onMoveTable={handleMoveTable}
          />
        )}

        {user.role === "bediening" && view === "menu" && (
          <Menu
            menu={MENU}
            selected={selected}
            table={table}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onBack={() => setView("floorplan")}
            onClearCart={clearCart}
            orders={orders}
            onUpdateStatus={updateOrderStatus}
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