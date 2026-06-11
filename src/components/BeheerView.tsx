import React, { useState } from "react";
import { Dish, Modifier } from "../types";

type Props = {
  menu: Dish[];
  onAddDish: (dish: Omit<Dish, "id">) => Promise<void>;
};

const CATEGORIES = [
  "Ontbijt",
  "Dranken",
  "Snelle hap",
  "Soepen",
  "Salades & Bowls",
  "Lunch",
  "Broodjes",
];

const emptyForm = () => ({
  name: "",
  price: "",
  category: CATEGORIES[0],
  image: "",
  modifiers: [] as Modifier[],
});

export default function BeheerView({ menu, onAddDish }: Props) {
  const [form, setForm] = useState(emptyForm());
  const [newMod, setNewMod] = useState({ name: "", price: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddModifier = () => {
    if (!newMod.name.trim()) return;
    const mod: Modifier = {
      id: `mod-${Date.now()}`,
      name: newMod.name.trim(),
      price: parseFloat(newMod.price) || 0,
    };
    setForm((f) => ({ ...f, modifiers: [...f.modifiers, mod] }));
    setNewMod({ name: "", price: "" });
  };

  const handleRemoveModifier = (id: string) => {
    setForm((f) => ({ ...f, modifiers: f.modifiers.filter((m) => m.id !== id) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      await onAddDish({
        name: form.name.trim(),
        price: parseFloat(form.price),
        category: form.category,
        image: form.image.trim() || "/images/placeholder.jpg",
        modifiers: form.modifiers.length > 0 ? form.modifiers : undefined,
      });
      setForm(emptyForm());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert("Er ging iets mis bij het opslaan.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px",
    border: "1px solid #ddd", fontSize: "0.95rem", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: "0.3rem",
    fontWeight: "600", fontSize: "0.85rem", color: "#444",
  };

  const fieldStyle: React.CSSProperties = { marginBottom: "1rem" };

  const canSubmit = form.name.trim() && form.price && !saving;

  return (
    <div style={{ padding: "2rem", maxWidth: "560px" }}>
      <h2 style={{ marginTop: 0 }}>⚙️ Beheer — Item toevoegen</h2>

      {/* Naam */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Naam</label>
        <input style={inputStyle} placeholder="bijv. Club Sandwich"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>

      {/* Prijs */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Prijs (€)</label>
        <input style={{ ...inputStyle, width: "140px" }} type="number"
          min="0" step="0.05" placeholder="0.00"
          value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
      </div>

      {/* Categorie */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Categorie</label>
        <select style={inputStyle} value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Afbeelding */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Afbeeldingspad (optioneel)</label>
        <input style={inputStyle} placeholder="/images/mijn-gerecht.jpg"
          value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
      </div>

      {/* Modifiers */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Opties / Modifiers (optioneel)</label>
        {form.modifiers.length > 0 && (
          <div style={{ marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {form.modifiers.map(m => (
              <div key={m.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#f5f5f5", padding: "0.4rem 0.75rem", borderRadius: "8px",
              }}>
                <span style={{ fontSize: "0.9rem" }}>
                  {m.name} {m.price > 0 ? `(+€${m.price.toFixed(2)})` : "(gratis)"}
                </span>
                <button onClick={() => handleRemoveModifier(m.id)} style={{
                  background: "none", border: "none", color: "#d9534f",
                  cursor: "pointer", fontSize: "1rem", lineHeight: 1,
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input style={{ ...inputStyle, flex: 2 }} placeholder="Naam optie"
            value={newMod.name} onChange={e => setNewMod(m => ({ ...m, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAddModifier()} />
          <input style={{ ...inputStyle, flex: 1 }} type="number" min="0" step="0.25"
            placeholder="€ meerprijs"
            value={newMod.price} onChange={e => setNewMod(m => ({ ...m, price: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAddModifier()} />
          <button onClick={handleAddModifier} style={{
            padding: "0.5rem 0.75rem", borderRadius: "8px", border: "none",
            background: "#2196F3", color: "white", cursor: "pointer", fontWeight: "bold",
            whiteSpace: "nowrap",
          }}>+ Voeg toe</button>
        </div>
      </div>

      {/* Opslaan */}
      <button onClick={handleSubmit} disabled={!canSubmit} style={{
        width: "100%", padding: "0.75rem", borderRadius: "8px", border: "none",
        background: canSubmit ? "#4CAF50" : "#ccc",
        color: "white", fontSize: "1rem", fontWeight: "bold",
        cursor: canSubmit ? "pointer" : "not-allowed",
      }}>
        {saving ? "Opslaan..." : "✅ Item toevoegen"}
      </button>

      {saved && (
        <p style={{ marginTop: "0.75rem", color: "#2e7d32", fontWeight: "600" }}>
          ✓ Item succesvol opgeslagen in Firebase!
        </p>
      )}

      {/* Overzicht huidig menu */}
      <h3 style={{ marginTop: "2.5rem" }}>Huidig menu ({menu.length} items)</h3>
      {CATEGORIES.map(cat => {
        const items = menu.filter(d => d.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontWeight: "700", margin: "0 0 0.35rem", color: "#555", fontSize: "0.85rem", textTransform: "uppercase" }}>
              {cat}
            </p>
            {items.map(d => (
              <div key={d.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "0.4rem 0.75rem", borderRadius: "6px",
                background: "#f9f9f9", marginBottom: "0.25rem", fontSize: "0.9rem",
              }}>
                <span>{d.name}</span>
                <span style={{ color: "#555" }}>€{d.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}