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
} from "firebase/firestore";
import { Order, OrderStatus } from "../types";

type OrdersContextValue = {
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // 🔹 Real-time updates vanuit Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const fetched = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Order)
      );
      setOrders(fetched);
    });
    return () => unsub();
  }, []);

  // 🔹 Bestelling toevoegen
  const addOrder = async (order: Order) => {
    await addDoc(collection(db, "orders"), order);
  };

  // 🔹 Status bijwerken
  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const ref = doc(db, "orders", id);
    await updateDoc(ref, { status });
  };

  const value = useMemo(
    () => ({ orders, addOrder, updateOrderStatus }),
    [orders]
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
};

export function useOrdersContext() {
  const ctx = useContext(OrdersContext);
  if (!ctx)
    throw new Error("useOrdersContext must be used within OrdersProvider");
  return ctx;
}
