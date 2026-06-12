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
  updateDoc,
} from "firebase/firestore";
import { Dish } from "../types";
import { MENU } from "../data/menuData";

type MenuContextValue = {
  menu: Dish[];
  addDish: (dish: Omit<Dish, "id">) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  updateDish: (
    id: string,
    data: Partial<Omit<Dish, "id">>
  ) => Promise<void>;
};

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
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
          modifiers: data.modifiers ?? [],
        } as Dish;
      });

      setFirestoreDishes(dishes);
    });

    return () => unsub();
  }, []);

  // Statisch menu + Firestore-menu samenvoegen
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

  const updateDish = async (
    id: string,
    data: Partial<Omit<Dish, "id">>
  ) => {
    await updateDoc(doc(db, "menu", id), data);
  };

  const value = useMemo(
    () => ({
      menu,
      addDish,
      deleteDish,
      updateDish,
    }),
    [menu]
  );

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};

export function useMenuContext() {
  const ctx = useContext(MenuContext);

  if (!ctx) {
    throw new Error("useMenuContext must be used within MenuProvider");
  }

  return ctx;
}