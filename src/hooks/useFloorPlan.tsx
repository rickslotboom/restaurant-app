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
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

export type TableSize = "small" | "medium" | "large" | "wide";
export type TableShape = "square" | "round" | "bar";
export type FloorType = "binnen" | "buiten";

export type TableDef = {
  id: string;
  name: string;
  shape: TableShape;
  size: TableSize;
  floor: FloorType;
  x: number;
  y: number;
};

type FloorPlanContextValue = {
  tables: TableDef[];
  addTable: (table: Omit<TableDef, "id">) => Promise<void>;
  updateTable: (id: string, data: Partial<Omit<TableDef, "id">>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
};

const FloorPlanContext = createContext<FloorPlanContextValue | undefined>(undefined);

// Seed data — exact zoals de huidige hardcoded layout
const SEED_TABLES: Omit<TableDef, "id">[] = [
  // Binnen — bovenste rij
  ...["10","9","8","7","6","5","4","3","2","1"].map((name, i) => ({
    name, shape: "square" as TableShape, size: "medium" as TableSize,
    floor: "binnen" as FloorType, x: i * 88, y: 0,
  })),
  // Binnen — BAR
  { name: "BAR", shape: "bar" as TableShape, size: "wide" as TableSize, floor: "binnen" as FloorType, x: 120, y: 180 },
  // Binnen — ronde tafels
  ...["E","C","A","F","D","B"].map((name, i) => ({
    name, shape: "round" as TableShape, size: "medium" as TableSize,
    floor: "binnen" as FloorType,
    x: 500 + (i % 3) * 88,
    y: 180 + Math.floor(i / 3) * 88,
  })),
  // Binnen — vr tafels
  { name: "vr1", shape: "round" as TableShape, size: "medium" as TableSize, floor: "binnen" as FloorType, x: 780, y: 180 },
  { name: "vr2", shape: "round" as TableShape, size: "medium" as TableSize, floor: "binnen" as FloorType, x: 780, y: 268 },
  // Buiten
  { name: "25", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 260, y: 0 },
  { name: "26", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 380, y: 0 },
  { name: "27", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 500, y: 0 },
  { name: "19", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 0, y: 200 },
  { name: "20", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 88, y: 200 },
  { name: "21", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 176, y: 200 },
  { name: "22", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 320, y: 160 },
  { name: "23", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 460, y: 240 },
  { name: "24", shape: "square" as TableShape, size: "medium" as TableSize, floor: "buiten" as FloorType, x: 580, y: 240 },
];

export const FloorPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<TableDef[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "floorplan"), (snapshot) => {
      if (snapshot.empty) {
        // Seed de database met de huidige layout
        SEED_TABLES.forEach(async (t, i) => {
          await setDoc(doc(db, "floorplan", `table_${i}`), t);
        });
        return;
      }
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TableDef[];
      setTables(loaded);
    });
    return () => unsub();
  }, []);

  const addTable = useCallback(async (table: Omit<TableDef, "id">) => {
    const id = `table_${Date.now()}`;
    await setDoc(doc(db, "floorplan", id), table);
  }, []);

  const updateTable = useCallback(async (id: string, data: Partial<Omit<TableDef, "id">>) => {
    await setDoc(doc(db, "floorplan", id), data, { merge: true });
  }, []);

  const deleteTable = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "floorplan", id));
  }, []);

  const value = useMemo(
    () => ({ tables, addTable, updateTable, deleteTable }),
    [tables, addTable, updateTable, deleteTable]
  );

  return <FloorPlanContext.Provider value={value}>{children}</FloorPlanContext.Provider>;
};

export function useFloorPlanContext() {
  const ctx = useContext(FloorPlanContext);
  if (!ctx) throw new Error("useFloorPlanContext must be used within FloorPlanProvider");
  return ctx;
}