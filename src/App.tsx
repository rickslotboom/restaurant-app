import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Menu from "./components/Menu";
import FloorPlan from "./components/FloorPlan";
import KitchenView from "./components/KitchenView";
import BarView from "./components/BarView";
import BillingView from "./components/BillingView";
import BeheerView from "./components/BeheerView";
import Login from "./components/Login";
import SplitPaymentModal from "./components/SplitPaymentModal";
import { useOrdersContext } from "./hooks/useOrders";
import { useMenuContext } from "./hooks/useMenu";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import styles from "./App.module.css";
import { useAuthContext } from "./hooks/useAuth";
import { OrderItem } from "./types";

console.log("Header:", Header);
console.log("Menu:", Menu);
console.log("FloorPlan:", FloorPlan);
console.log("KitchenView:", KitchenView);
console.log("BarView:", BarView);
console.log("BillingView:", BillingView);
console.log("Login:", Login);

type ViewType = "floorplan" | "menu" | "kitchen" | "billing" | "bar" | "beheer";

export default function App() {
  const { user, logout } = useAuthContext();
  const { orders, updateOrderStatus, updateOrderTable, updateOrderItems } = useOrdersContext();
  const { menu, addDish, deleteDish, updateDish } = useMenuContext();

  const [view, setView] = useState<ViewType>("floorplan");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [table, setTable] = useState("1");
  const [splitTable, setSplitTable] = useState<string | null>(null);

  const clearCart = () => setSelected({});

  useEffect(() => {
    if (!user) return;
    if (user.role === "keuken") setView("kitchen");
    else setView("floorplan");
  }, [user]);

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

  const handleSplitBill = (tableId: string) => {
    setSplitTable(tableId);
  };

  const handleSplitConfirm = async (
    remainingItems: OrderItem[],
    method: "cash" | "pin",
    tip: number
  ) => {
    if (!splitTable) return;
    const order = orders.find(
      (o) => o.table === splitTable && o.status !== "Betaald"
    );
    if (!order) return;
    try {
      if (remainingItems.length === 0) {
        await updateOrderStatus(order.id, "Betaald");
      } else {
        await updateOrderItems(order.id, remainingItems);
      }
      setSplitTable(null);
    } catch (err) {
      alert("Er ging iets mis bij het splitsen.");
    }
  };

  const splitOrder = splitTable
    ? orders.find((o) => o.table === splitTable && o.status !== "Betaald")
    : null;

  const isManager = user.role === "manager";
  const isBediening = user.role === "bediening";
  const isKeuken = user.role === "keuken";

  return (
    <div className={styles.app}>
      <Header
        view={view}
        setView={(newView) => {
          if (isKeuken && newView !== "kitchen" && newView !== "bar") return;
          setView(newView);
        }}
        orderCount={orders.filter((o) => o.status === "Open").length}
        onLogout={handleLogout}
        user={user}
      />

      <main className={styles.main}>

        {/* Plattegrond */}
        {(isBediening || isManager) && view === "floorplan" && (
          <FloorPlan
            orders={orders}
            onTableSelect={handleTableSelect}
            onMoveTable={handleMoveTable}
            onSplitBill={handleSplitBill}
          />
        )}

        {/* Menu / bestellen */}
        {(isBediening || isManager) && view === "menu" && (
          <Menu
            menu={menu}
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

        {/* Afrekenen */}
        {(isBediening || isManager) && view === "billing" && (
          <BillingView
            orders={orders}
            onUpdateStatus={updateOrderStatus}
          />
        )}

        {/* Keuken */}
        {(isKeuken || isManager) && view === "kitchen" && (
          <KitchenView
            menu={menu}
            orders={orders}
            onUpdateStatus={updateOrderStatus}
            onLogout={handleLogout}
          />
        )}

        {/* Bar */}
        {(isKeuken || isManager) && view === "bar" && (
          <BarView
            orders={orders}
            menu={menu}
            onUpdateStatus={updateOrderStatus}
            onLogout={handleLogout}
          />
        )}

        {/* Beheer — alleen manager */}
        {isManager && view === "beheer" && (
         <BeheerView
  menu={menu}
  onAddDish={addDish}
  onUpdateDish={updateDish}
  onDeleteDish={deleteDish}
/>
        )}

      </main>

      {splitOrder && (
        <SplitPaymentModal
          order={splitOrder}
          onConfirm={handleSplitConfirm}
          onCancel={() => setSplitTable(null)}
        />
      )}
    </div>
  );
}