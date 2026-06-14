import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
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
  setDoc,
} from "firebase/firestore";
import { Dish, VatRate } from "../types";
import { MENU } from "../data/menuData";

type MenuContextValue = {
  menu: Dish[];
  categories: string[];
  addDish: (dish: Omit<Dish, "id">) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  updateDish: (id: string, data: Partial<Omit<Dish, "id">>) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
};

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  "Ontbijt",
  "Dranken",
  "Snelle hap",
  "Soepen",
  "Salades & Bowls",
  "Lunch",
  "Broodjes",
];

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firestoreDishes, setFirestoreDishes] = useState<(Dish & { blocked?: boolean })[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<{ id: string; name: string; order: number }[]>([]);
  const [blockedStatic, setBlockedStatic] = useState<Record<string, boolean>>({});

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
          vatRate: (data.vatRate ?? 9) as VatRate,
          blocked: data.blocked ?? false,
        } as Dish & { blocked?: boolean };
      });
      setFirestoreDishes(dishes);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snapshot) => {
      const cats = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? "",
        order: d.data().order ?? 0,
      }));
      cats.sort((a, b) => a.order - b.order);
      setFirestoreCategories(cats);

      if (snapshot.empty) {
        DEFAULT_CATEGORIES.forEach((name, i) => {
          addDoc(collection(db, "categories"), { name, order: i });
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blockedStatic"), (snapshot) => {
      const blocked: Record<string, boolean> = {};
      snapshot.docs.forEach((d) => {
        blocked[d.id] = true;
      });
      setBlockedStatic(blocked);
    });
    return () => unsub();
  }, []);

  const menu = useMemo(() => {
    const firestoreIds = new Set(firestoreDishes.map((d) => d.id));
    const staticItems = MENU
      .filter((d) => !firestoreIds.has(d.id))
      .map((d) => ({ ...d, blocked: blockedStatic[d.id] ?? false }));
    return [...staticItems, ...firestoreDishes];
  }, [firestoreDishes, blockedStatic]);

  const categories = useMemo(
    () => firestoreCategories.map((c) => c.name),
    [firestoreCategories]
  );

  const addCategory = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    await addDoc(collection(db, "categories"), {
      name: trimmed,
      order: firestoreCategories.length,
    });
  }, [categories, firestoreCategories]);

  const updateCategory = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || (categories.includes(trimmed) && trimmed !== oldName)) return;
    const cat = firestoreCategories.find((c) => c.name === oldName);
    if (!cat) return;
    await updateDoc(doc(db, "categories", cat.id), { name: trimmed });
    const itemsToUpdate = firestoreDishes.filter((d) => d.category === oldName);
    await Promise.all(
      itemsToUpdate.map((d) => updateDoc(doc(db, "menu", d.id), { category: trimmed }))
    );
  }, [categories, firestoreCategories, firestoreDishes]);

  const deleteCategory = useCallback(async (name: string) => {
    const cat = firestoreCategories.find((c) => c.name === name);
    if (!cat) return;
    await deleteDoc(doc(db, "categories", cat.id));
  }, [firestoreCategories]);

  const addDish = useCallback(async (dish: Omit<Dish, "id">) => {
    await addDoc(collection(db, "menu"), {
      ...dish,
      modifiers: dish.modifiers ?? [],
      vatRate: dish.vatRate ?? 9,
      blocked: false,
    });
  }, []);

  const deleteDish = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "menu", id));
  }, []);

  const updateDish = useCallback(async (id: string, data: Partial<Omit<Dish, "id">>) => {
    const isStatic = MENU.some((d) => d.id === id);
    if (isStatic) {
      if ("blocked" in data) {
        if ((data as any).blocked) {
          await setDoc(doc(db, "blockedStatic", id), { blocked: true });
        } else {
          await deleteDoc(doc(db, "blockedStatic", id));
        }
      }
      return;
    }
    await updateDoc(doc(db, "menu", id), data as any);
  }, []);

  const value = useMemo(
    () => ({ menu, categories, addDish, deleteDish, updateDish, addCategory, updateCategory, deleteCategory }),
    [menu, categories, addDish, deleteDish, updateDish, addCategory, updateCategory, deleteCategory]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

export function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenuContext must be used within MenuProvider");
  return ctx;
}