import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Order, OrderStatus } from "../types";

type OrdersContextValue = {
  orders: Order[];
  addOrder: (order: Omit<Order, "id">) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
  console.log("[FIRESTORE] Listening to orders…");

  const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
    const formatted = snapshot.docs.map((d) => {
      const data = d.data();

      return {
        id: d.id,
        table: data.table ?? "",
        status: data.status === "Afgehandeld" ? "Afgehandeld" : "Open",
        createdAt: data.createdAt ?? null,
        timestamp: data.timestamp ?? null,
        orderNumber: data.orderNumber ?? undefined, // <-- gebruik camelCase en undefined ipv null
        waiter: data.waiter ?? "Onbekend",
        items: (data.items || []).map((i: any) => ({
          dishId: i.dishId ?? "",
          name: i.name ?? "Onbekend",
          price: i.price ?? 0,
          qty: i.qty ?? 0,
        })),
      } as Order;
    });

    console.log("[FIRESTORE] Orders mapped:", formatted);
    setOrders(formatted);
  });

  return () => unsub();
}, []);

  // ⭐ Nieuwe addOrder
  const addOrder = async (order: Omit<Order, "id">) => {
    console.log("[FIRESTORE] addOrder =", order);

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const counterRef = doc(db, "orderCounters", yearMonth);

    // Maak ordernummer via transactie
    const orderNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);

      let newCount = 1;

      if (snap.exists()) {
        newCount = (snap.data().last ?? 0) + 1;
        tx.update(counterRef, { last: newCount });
      } else {
        tx.set(counterRef, { last: 1 });
      }

      return `${yearMonth}-${String(newCount).padStart(5, "0")}`;
    });

    // Voeg order toe
    await addDoc(collection(db, "orders"), {
      ...order,
      orderNumber,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
    });
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    console.log("[FIRESTORE] updateOrderStatus", id, status);
    await updateDoc(doc(db, "orders", id), { status });
  };

  const value = useMemo(() => ({ orders, addOrder, updateOrderStatus }), [orders]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};

export function useOrdersContext() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrdersContext must be used within OrdersProvider");
  return ctx;
}
