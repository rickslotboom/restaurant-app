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
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Dish } from "../types";
import { MENU } from "../data/menuData";

type MenuContextValue = {
  menu: Dish[];
  addDish: (dish: Omit<Dish, "id">) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
};

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firestoreDishes, setFirestoreDishes] = useState<Dish[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menu"), (snapshot) => {
      const dishes = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          price: data.price ?? 0,
          category: data.category ?? "",
          image: data.image ?? "/images/placeholder.jpg",
          modifiers: data.modifiers ?? undefined,
        } as Dish;
      });
      setFirestoreDishes(dishes);
    });
    return () => unsub();
  }, []);

  // Statisch menu + Firebase menu samengevoegd
  const menu = useMemo(() => {
    const firestoreIds = new Set(firestoreDishes.map((d) => d.id));
    const staticFiltered = MENU.filter((d) => !firestoreIds.has(d.id));
    return [...staticFiltered, ...firestoreDishes];
  }, [firestoreDishes]);

  const addDish = async (dish: Omit<Dish, "id">) => {
    await addDoc(collection(db, "menu"), {
      ...dish,
      modifiers: dish.modifiers ?? [],
    });
  };

  const deleteDish = async (id: string) => {
    await deleteDoc(doc(db, "menu", id));
  };

  const value = useMemo(
    () => ({ menu, addDish, deleteDish }),
    [menu]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenuContext must be used within MenuProvider");
  return ctx;
}