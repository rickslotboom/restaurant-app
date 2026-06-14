import React, { useState } from "react";
import { Dish, Modifier, VatRate } from "../types";
import { useMenuContext } from "../hooks/useMenu";
import FloorPlanEditor from "./FloorPlanEditor";

type Props = {
  menu: Dish[];
  onAddDish: (dish: Omit<Dish, "id">) => Promise<void>;
  onUpdateDish: (id: string, dish: Partial<Omit<Dish, "id">>) => Promise<void>;
  onDeleteDish: (id: string) => Promise<void>;
};

const isFirestoreItem = (id: string) => /^[a-zA-Z0-9]{20}$/.test(id);

export default function BeheerView({
  menu,
  onAddDish,
  onUpdateDish,
  onDeleteDish,
}: Props) {
  const { categories, addCategory, updateCategory, deleteCategory } = useMenuContext();

  const [activeTab, setActiveTab] = useState<"menu" | "categories" | "vloerplan">("menu");
  const [filterCategory, setFilterCategory] = useState<string>("Alle");

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: categories[0] ?? "",
    image: "",
    modifiers: [] as Modifier[],
    vatRate: 9 as VatRate,
  });
  const [saving, setSaving] = useState(false);
  const [newModifier, setNewModifier] = useState({ name: "", price: "" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editNewModifier, setEditNewModifier] = useState({ name: "", price: "" });

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");

  const DEFAULT_CATEGORIES = [
    "Ontbijt", "Dranken", "Snelle hap", "Soepen",
    "Salades & Bowls", "Lunch", "Broodjes",
  ];

  const filteredMenu = filterCategory === "Alle"
    ? menu
    : menu.filter((d) => d.category === filterCategory);

  const submitDish = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      await onAddDish({
        name: form.name.trim(),
        price: parseFloat(form.price),
        category: form.category || categories[0],
        image: form.image || "/images/placeholder.jpg",
        modifiers: form.modifiers ?? [],
        vatRate: form.vatRate,
      } as any);
      setForm({ name: "", price: "", category: categories[0] ?? "", image: "", modifiers: [], vatRate: 9 });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setEditForm({ ...dish, modifiers: dish.modifiers ?? [], vatRate: dish.vatRate ?? 9 });
    setEditNewModifier({ name: "", price: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdateDish(editingId, {
      name: editForm.name,
      price: parseFloat(editForm.price),
      category: editForm.category,
      image: editForm.image,
      modifiers: editForm.modifiers ?? [],
      vatRate: editForm.vatRate ?? 9,
    });
    setEditingId(null);
  };

  const toggleDishBlock = async (dish: Dish) => {
    await onUpdateDish(dish.id, { blocked: !(dish as any).blocked } as any);
  };

  const deleteDish = async (dish: Dish) => {
    if (!isFirestoreItem(dish.id)) {
      alert("Statische items kunnen niet verwijderd worden. Blokkeer ze in plaats daarvan.");
      return;
    }
    if (!window.confirm(`"${dish.name}" verwijderen?`)) return;
    await onDeleteDish(dish.id);
  };

  const addModifierToForm = () => {
    if (!newModifier.name.trim()) return;
    setForm((f) => ({
      ...f,
      modifiers: [...f.modifiers, { id: Date.now().toString(), name: newModifier.name.trim(), price: parseFloat(newModifier.price) || 0 }],
    }));
    setNewModifier({ name: "", price: "" });
  };

  const addModifierToEdit = () => {
    if (!editNewModifier.name.trim()) return;
    setEditForm((f: any) => ({
      ...f,
      modifiers: [...(f.modifiers ?? []), { id: Date.now().toString(), name: editNewModifier.name.trim(), price: parseFloat(editNewModifier.price) || 0 }],
    }));
    setEditNewModifier({ name: "", price: "" });
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", borderRadius: "6px",
    border: "1px solid #ccc", fontSize: "14px", width: "100%",
    boxSizing: "border-box",
  };

  const btn = (color: string, small = false): React.CSSProperties => ({
    padding: small ? "0.3rem 0.6rem" : "0.5rem 1rem",
    borderRadius: "6px", border: "none", background: color,
    color: "white", cursor: "pointer", fontSize: small ? "12px" : "13px",
    fontWeight: "500", whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>Beheer</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {(["menu", "categories", "vloerplan"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
            background: activeTab === t ? "#2196F3" : "#eee",
            color: activeTab === t ? "white" : "#333",
            fontWeight: "600", cursor: "pointer",
          }}>
            {t === "menu" ? "Menu" : t === "categories" ? "Categorieën" : "Vloerplan"}
          </button>
        ))}
      </div>

      {/* ───── MENU TAB ───── */}
      {activeTab === "menu" && (
        <>
          <div style={{
            background: "#f9f9f9", borderRadius: "10px",
            padding: "1.25rem", marginBottom: "2rem", border: "1px solid #e0e0e0",
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Nieuw gerecht toevoegen</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Naam *</label>
                <input style={inputStyle} placeholder="Naam" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Prijs *</label>
                <input style={inputStyle} type="number" step="0.01" placeholder="0.00" value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Categorie</label>
                <select style={inputStyle} value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>BTW</label>
                <select style={inputStyle} value={form.vatRate}
                  onChange={(e) => setForm((f) => ({ ...f, vatRate: parseInt(e.target.value) as VatRate }))}>
                  <option value={9}>9% (eten)</option>
                  <option value={21}>21% (dranken)</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Afbeelding URL</label>
                <input style={inputStyle} placeholder="/images/..." value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Opties / extras</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="Naam (bv. havermelk)"
                  value={newModifier.name} onChange={(e) => setNewModifier((m) => ({ ...m, name: e.target.value }))} />
                <input style={{ ...inputStyle, width: "80px" }} type="number" step="0.01" placeholder="€0.00"
                  value={newModifier.price} onChange={(e) => setNewModifier((m) => ({ ...m, price: e.target.value }))} />
                <button style={btn("#555")} onClick={addModifierToForm}>+ Optie</button>
              </div>
              {form.modifiers.map((m, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", flex: 1 }}>{m.name} — €{Number(m.price).toFixed(2)}</span>
                  <button style={btn("#d9534f", true)} onClick={() =>
                    setForm((f) => ({ ...f, modifiers: f.modifiers.filter((_, i) => i !== idx) }))}>✕</button>
                </div>
              ))}
            </div>

            <button style={btn("#4CAF50")} onClick={submitDish} disabled={saving}>
              {saving ? "Opslaan..." : "➕ Toevoegen"}
            </button>
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {["Alle", ...categories].map((c) => (
              <button key={c} onClick={() => setFilterCategory(c)} style={{
                padding: "0.3rem 0.75rem", borderRadius: "20px", border: "none",
                background: filterCategory === c ? "#2196F3" : "#eee",
                color: filterCategory === c ? "white" : "#333",
                cursor: "pointer", fontSize: "13px",
              }}>{c}</button>
            ))}
          </div>

          {/* Menu list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filteredMenu.map((dish) => {
              const blocked = (dish as any).blocked;
              const editable = isFirestoreItem(dish.id);

              return (
                <div key={dish.id} style={{
                  background: blocked ? "#fff5f5" : "#fff",
                  border: `1px solid ${blocked ? "#ffcccc" : "#e0e0e0"}`,
                  borderRadius: "8px", padding: "0.75rem 1rem",
                }}>
                  {editingId === dish.id ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Naam</label>
                          <input style={inputStyle} value={editForm.name || ""}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Prijs</label>
                          <input style={inputStyle} type="number" step="0.01" value={editForm.price || ""}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, price: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Categorie</label>
                          <select style={inputStyle} value={editForm.category}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, category: e.target.value }))}>
                            {categories.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>BTW</label>
                          <select style={inputStyle} value={editForm.vatRate ?? 9}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, vatRate: parseInt(e.target.value) as VatRate }))}>
                            <option value={9}>9% (eten)</option>
                            <option value={21}>21% (dranken)</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Afbeelding URL</label>
                          <input style={inputStyle} value={editForm.image || ""}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, image: e.target.value }))} />
                        </div>
                      </div>

                      <div style={{ marginBottom: "0.5rem" }}>
                        <label style={{ fontSize: "12px", color: "#666" }}>Opties / extras</label>
                        <div style={{ display: "flex", gap: "0.5rem", margin: "0.4rem 0" }}>
                          <input style={{ ...inputStyle, flex: 1, width: "auto" }} placeholder="Naam"
                            value={editNewModifier.name} onChange={(e) => setEditNewModifier((m) => ({ ...m, name: e.target.value }))} />
                          <input style={{ ...inputStyle, width: "80px" }} type="number" step="0.01" placeholder="€0.00"
                            value={editNewModifier.price} onChange={(e) => setEditNewModifier((m) => ({ ...m, price: e.target.value }))} />
                          <button style={btn("#555")} onClick={addModifierToEdit}>+ Optie</button>
                        </div>
                        {(editForm.modifiers ?? []).map((m: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "4px" }}>
                            <input
                              style={{ ...inputStyle, flex: 1 }}
                              value={m.name}
                              onChange={(e) => setEditForm((f: any) => ({
                                ...f,
                                modifiers: f.modifiers.map((mod: any, i: number) =>
                                  i === idx ? { ...mod, name: e.target.value } : mod
                                ),
                              }))}
                            />
                            <input
                              style={{ ...inputStyle, width: "80px" }}
                              type="number" step="0.01"
                              value={m.price}
                              onChange={(e) => setEditForm((f: any) => ({
                                ...f,
                                modifiers: f.modifiers.map((mod: any, i: number) =>
                                  i === idx ? { ...mod, price: parseFloat(e.target.value) || 0 } : mod
                                ),
                              }))}
                            />
                            <button style={btn("#d9534f", true)} onClick={() =>
                              setEditForm((f: any) => ({ ...f, modifiers: f.modifiers.filter((_: any, i: number) => i !== idx) }))}>🗑</button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button style={btn("#4CAF50")} onClick={saveEdit}>✅ Opslaan</button>
                        <button style={btn("#999")} onClick={() => setEditingId(null)}>Annuleren</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <img src={dish.image} alt={dish.name} style={{
                        width: "40px", height: "40px", borderRadius: "6px",
                        objectFit: "cover", flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "600", fontSize: "14px" }}>{dish.name}</div>
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          {dish.category} · €{dish.price.toFixed(2)} · BTW {dish.vatRate ?? 9}%
                          {(dish.modifiers ?? []).length > 0 && ` · ${dish.modifiers!.length} optie(s)`}
                        </div>
                      </div>
                      {!editable && (
                        <span style={{ fontSize: "11px", color: "#aaa", fontStyle: "italic" }}>statisch</span>
                      )}
                      {blocked && (
                        <span style={{
                          fontSize: "11px", background: "#ffcccc", color: "#c00",
                          padding: "2px 6px", borderRadius: "4px",
                        }}>geblokkeerd</span>
                      )}
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                        {editable && (
                          <button style={btn("#2196F3", true)} onClick={() => startEdit(dish)}>✏️</button>
                        )}
                        <button style={btn(blocked ? "#4CAF50" : "#FF9800", true)} onClick={() => toggleDishBlock(dish)}>
                          {blocked ? "🔓 Tonen" : "🚫 Blokkeren"}
                        </button>
                        {editable && (
                          <button style={btn("#d9534f", true)} onClick={() => deleteDish(dish)}>🗑</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ───── CATEGORIES TAB ───── */}
      {activeTab === "categories" && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <input
              style={{ ...inputStyle, flex: 1, width: "auto" }}
              placeholder="Nieuwe categorie naam"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addCategory(newCategoryName);
                  setNewCategoryName("");
                }
              }}
            />
            <button style={btn("#4CAF50")} onClick={() => {
              addCategory(newCategoryName);
              setNewCategoryName("");
            }}>+ Toevoegen</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {categories.map((c) => {
              const isDefault = DEFAULT_CATEGORIES.includes(c);
              const dishCount = menu.filter((d) => d.category === c).length;

              return (
                <div key={c} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  background: "#fff", border: "1px solid #e0e0e0",
                  borderRadius: "8px", padding: "0.75rem 1rem",
                }}>
                  {editingCategory === c ? (
                    <>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCategory(c, editCategoryValue);
                            setEditingCategory(null);
                          }
                        }}
                        autoFocus
                      />
                      <button style={btn("#4CAF50")} onClick={() => {
                        updateCategory(c, editCategoryValue);
                        setEditingCategory(null);
                      }}>✅ Opslaan</button>
                      <button style={btn("#999")} onClick={() => setEditingCategory(null)}>Annuleren</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontWeight: "500" }}>{c}</span>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>{dishCount} item(s)</span>
                      {isDefault && (
                        <span style={{ fontSize: "11px", color: "#aaa", fontStyle: "italic" }}>standaard</span>
                      )}
                      <button style={btn("#2196F3", true)} onClick={() => {
                        setEditingCategory(c);
                        setEditCategoryValue(c);
                      }}>✏️ Hernoemen</button>
                      {!isDefault && (
                        <button style={btn("#d9534f", true)} onClick={() => {
                          if (dishCount > 0) {
                            alert(`Er zijn nog ${dishCount} items in deze categorie. Verplaats ze eerst.`);
                            return;
                          }
                          deleteCategory(c);
                        }}>🗑 Verwijderen</button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── VLOERPLAN TAB ───── */}
      {activeTab === "vloerplan" && <FloorPlanEditor />}
    </div>
  );
}