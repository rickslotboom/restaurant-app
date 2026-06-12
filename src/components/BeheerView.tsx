import React, { useState, useMemo } from "react";
import { Dish, Modifier } from "../types";

type Props = {
  menu: Dish[];
  onAddDish: (dish: Omit<Dish, "id">) => Promise<void>;
  onUpdateDish: (id: string, dish: Partial<Omit<Dish, "id">>) => Promise<void>;
  onDeleteDish: (id: string) => Promise<void>;
};

const DEFAULT_CATEGORIES = [
  "Ontbijt",
  "Dranken",
  "Snelle hap",
  "Soepen",
  "Salades & Bowls",
  "Lunch",
  "Broodjes",
];

export default function BeheerView({
  menu,
  onAddDish,
  onUpdateDish,
  onDeleteDish,
}: Props) {
  // ─────────────────────────────
  // CATEGORIES
  // ─────────────────────────────
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [blockedCategories, setBlockedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const categories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...extraCategories],
    [extraCategories]
  );

  const activeCategories = categories.filter(
    (c) => !blockedCategories.includes(c)
  );

  // ─────────────────────────────
  // ADD DISH FORM
  // ─────────────────────────────
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: DEFAULT_CATEGORIES[0],
    image: "",
    modifiers: [] as Modifier[],
  });

 
  const [saving, setSaving] = useState(false);

  // ─────────────────────────────
  // EDIT DISH
  // ─────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // ─────────────────────────────
  // ADD DISH
  // ─────────────────────────────
  

  const submitDish = async () => {
    if (!form.name.trim()) return;

    setSaving(true);

    try {
      await onAddDish({
        name: form.name,
        price: parseFloat(form.price),
        category: form.category,
        image: form.image || "/images/placeholder.jpg",
        modifiers: form.modifiers ?? [],
        blocked: false,
      } as any);

      setForm({
        name: "",
        price: "",
        category: DEFAULT_CATEGORIES[0],
        image: "",
        modifiers: [],
      });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────
  // EDIT DISH
  // ─────────────────────────────
  const startEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setEditForm({
      ...dish,
      modifiers: dish.modifiers ?? [],
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    await onUpdateDish(editingId, {
      name: editForm.name,
      price: editForm.price,
      category: editForm.category,
      image: editForm.image,
      modifiers: editForm.modifiers ?? [],
    });

    setEditingId(null);
  };

  // ─────────────────────────────
  // DISH BLOCK
  // ─────────────────────────────
  const toggleDishBlock = async (dish: Dish) => {
    await onUpdateDish(dish.id, {
      blocked: !(dish as any).blocked,
    } as any);
  };

  // ─────────────────────────────
  // DISH DELETE
  // ─────────────────────────────
  const deleteDish = async (id: string) => {
    if (!window.confirm("Verwijderen?")) return;
    await onDeleteDish(id);
  };

  // ─────────────────────────────
  // CATEGORY
  // ─────────────────────────────
  const addCategory = () => {
    const c = newCategory.trim();
    if (!c || categories.includes(c)) return;
    setExtraCategories((p) => [...p, c]);
    setNewCategory("");
  };

  const deleteCategory = (cat: string) => {
    setExtraCategories((p) => p.filter((c) => c !== cat));
    setBlockedCategories((p) => p.filter((c) => c !== cat));
  };

  const toggleCategoryBlock = (cat: string) => {
    setBlockedCategories((p) =>
      p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]
    );
  };

  // ─────────────────────────────
  return (
    <div style={{ padding: "2rem" }}>
      <h2>Beheer</h2>

      {/* ───────── ADD DISH ───────── */}
      <div style={{ marginBottom: "2rem" }}>
        <input
          placeholder="Naam"
          value={form.name}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: e.target.value }))
          }
        />

        <input
          placeholder="Prijs"
          value={form.price}
          onChange={(e) =>
            setForm((f) => ({ ...f, price: e.target.value }))
          }
        />

        <select
          value={form.category}
          onChange={(e) =>
            setForm((f) => ({ ...f, category: e.target.value }))
          }
        >
          {activeCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input
          placeholder="Afbeelding"
          value={form.image}
          onChange={(e) =>
            setForm((f) => ({ ...f, image: e.target.value }))
          }
        />

        <button onClick={submitDish}>
          {saving ? "Opslaan..." : "Toevoegen"}
        </button>
      </div>

      {/* ───────── CATEGORY MANAGEMENT ───────── */}
      <h3>Categorieën</h3>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nieuwe categorie"
        />
        <button onClick={addCategory}>+</button>
      </div>

      {categories.map((c) => (
        <div
          key={c}
          style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
        >
          <span>{c}</span>

          <button onClick={() => toggleCategoryBlock(c)}>
            {blockedCategories.includes(c) ? "Unhide" : "Block"}
          </button>

          <button onClick={() => deleteCategory(c)}>Delete</button>
        </div>
      ))}

      {/* ───────── MENU LIST ───────── */}
      <h3>Menu</h3>

      {menu.map((dish) => {
        const blocked = (dish as any).blocked;

        return (
          <div
            key={dish.id}
            style={{
              padding: "0.5rem",
              marginBottom: "0.5rem",
              background: blocked ? "#ffe6e6" : "#f5f5f5",
            }}
          >
            {editingId === dish.id ? (
              <>
                <input
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                />

                <input
                  value={editForm.price || ""}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      price: parseFloat(e.target.value),
                    }))
                  }
                />

                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>

                <input
                  value={editForm.image || ""}
                  onChange={(e) =>
                    setEditForm((f: any) => ({
                      ...f,
                      image: e.target.value,
                    }))
                  }
                />

                <button onClick={saveEdit}>Opslaan</button>
              </>
            ) : (
              <>
                <strong>{dish.name}</strong> €{dish.price}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => startEdit(dish)}>✏️</button>
                  <button onClick={() => toggleDishBlock(dish)}>
                    {blocked ? "Unblock" : "Block"}
                  </button>
                  <button onClick={() => deleteDish(dish.id)}>
                    🗑
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}