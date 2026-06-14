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
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { Order, OrderItem, OrderStatus } from "../types";

type OrdersContextValue = {
  orders: Order[];
  addOrder: (order: Omit<Order, "id">) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrderItems: (id: string, items: OrderItem[]) => Promise<void>;
  updateOrderTable: (id: string, table: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
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
          status: (
            data.status === "Afgehandeld" ? "Afgehandeld" :
            data.status === "Betaald" ? "Betaald" : "Open"
          ) as OrderStatus,
          createdAt: data.createdAt ?? null,
          timestamp: data.timestamp ?? null,
          orderNumber: data.orderNumber ?? undefined,
          waiter: data.waiter ?? "Onbekend",
          items: (data.items || []).map((i: any) => ({
            dishId: i.dishId ?? "",
            name: i.name ?? "Onbekend",
            price: i.price ?? 0,
            qty: i.qty ?? 0,
            modifiers: (i.modifiers ?? []).map((m: any) => ({
              id: m.id ?? "",
              name: m.name ?? "",
              price: m.price ?? 0,
            })),
          })),
        } as Order;
      });

      console.log("[FIRESTORE] Orders mapped:", formatted);
      setOrders(formatted);
    });

    return () => unsub();
  }, []);

  const addOrder = async (order: Omit<Order, "id">) => {
    console.log("[FIRESTORE] addOrder =", order);
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const counterRef = doc(db, "orderCounters", yearMonth);

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

  const updateOrderItems = async (id: string, items: OrderItem[]) => {
    console.log("[FIRESTORE] updateOrderItems", id, items);
    await updateDoc(doc(db, "orders", id), { items });
  };

  const updateOrderTable = async (id: string, table: string) => {
    console.log("[FIRESTORE] updateOrderTable", id, table);
    await updateDoc(doc(db, "orders", id), { table });
  };

  const deleteOrder = async (id: string) => {
    console.log("[FIRESTORE] deleteOrder", id);
    await deleteDoc(doc(db, "orders", id));
  };

  const value = useMemo(
    () => ({ orders, addOrder, updateOrderStatus, updateOrderItems, updateOrderTable, deleteOrder }),
    [orders]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};

export function useOrdersContext() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrdersContext must be used within OrdersProvider");
  return ctx;
}