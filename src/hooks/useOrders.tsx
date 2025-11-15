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

  const addOrder = async (order: Omit<Order, "id">) => {
    console.log("[FIRESTORE] addOrder =", order);

    await addDoc(collection(db, "orders"), {
      ...order,
      createdAt: serverTimestamp(),
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
