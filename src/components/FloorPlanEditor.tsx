import React, { useState, useRef } from "react";
import { useFloorPlanContext, TableDef, TableShape, TableSize, FloorType } from "../hooks/useFloorPlan";

const SIZE_DIMS: Record<TableSize, { width: number; height: number }> = {
  small:  { width: 56,  height: 56  },
  medium: { width: 72,  height: 72  },
  large:  { width: 96,  height: 96  },
  wide:   { width: 140, height: 72  },
};

const SIZE_LABELS: Record<TableSize, string> = {
  small: "Klein", medium: "Middel", large: "Groot", wide: "Breed",
};

export default function FloorPlanEditor() {
  const { tables, addTable, updateTable, deleteTable } = useFloorPlanContext();
  const [floor, setFloor] = useState<FloorType>("binnen");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TableDef>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const floorTables = tables.filter((t) => t.floor === floor);
  const canvasWidth = Math.max(900, ...floorTables.map((t) => t.x + SIZE_DIMS[t.size].width + 80));
  const canvasHeight = Math.max(500, ...floorTables.map((t) => t.y + SIZE_DIMS[t.size].height + 80));

  const handleAddTable = async () => {
    await addTable({
      name: `T${tables.length + 1}`,
      shape: "square",
      size: "medium",
      floor,
      x: 40,
      y: 40,
    });
  };

  const handleMouseDown = (e: React.MouseEvent, t: TableDef) => {
    if (editingId === t.id) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggingId(t.id);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const t = tables.find((t) => t.id === draggingId);
    if (!t) return;
    const dims = SIZE_DIMS[t.size];
    const newX = Math.max(0, Math.min(
      e.clientX - canvasRect.left - dragOffset.x,
      canvasRect.width - dims.width
    ));
    const newY = Math.max(0, Math.min(
      e.clientY - canvasRect.top - dragOffset.y,
      canvasRect.height - dims.height
    ));
    const snappedX = Math.round(newX / 8) * 8;
    const snappedY = Math.round(newY / 8) * 8;
    updateTable(draggingId, { x: snappedX, y: snappedY });
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const startEdit = (t: TableDef) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, shape: t.shape, size: t.size, floor: t.floor });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateTable(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tafel verwijderen?")) return;
    await deleteTable(id);
    if (editingId === id) setEditingId(null);
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.4rem 0.6rem", borderRadius: "6px",
    border: "1px solid #ccc", fontSize: "13px", width: "100%",
    boxSizing: "border-box",
  };

  const btn = (color: string): React.CSSProperties => ({
    padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none",
    background: color, color: "white", cursor: "pointer",
    fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "1rem" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        {(["binnen", "buiten"] as const).map((f) => (
          <button key={f} onClick={() => { setFloor(f); setEditingId(null); }} style={{
            padding: "0.5rem 1.25rem", borderRadius: "8px", border: "none",
            background: floor === f ? "#2196F3" : "#eee",
            color: floor === f ? "white" : "#333",
            fontWeight: "600", cursor: "pointer", fontSize: "14px",
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button onClick={handleAddTable} style={{ ...btn("#4CAF50"), padding: "0.5rem 1rem", fontSize: "14px" }}>
            + Tafel toevoegen
          </button>
        </div>
      </div>

      {/* Edit panel — boven het canvas zodat het altijd zichtbaar is */}
      {editingId && (
        <div style={{
          background: "#fff", border: "1px solid #2196F3",
          borderRadius: "10px", padding: "1rem", marginBottom: "1rem",
          display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end",
        }}>
          <h3 style={{ margin: "0 1rem 0 0", fontSize: "15px", alignSelf: "center", whiteSpace: "nowrap" }}>
            ✏️ Tafel bewerken
          </h3>

          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Naam</label>
            <input
              style={{ ...inputStyle, width: "120px" }}
              value={editForm.name ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Vorm</label>
            <select
              style={{ ...inputStyle, width: "130px" }}
              value={editForm.shape ?? "square"}
              onChange={(e) => setEditForm((f) => ({ ...f, shape: e.target.value as TableShape }))}
            >
              <option value="square">Vierkant</option>
              <option value="round">Rond</option>
              <option value="bar">Bar (breed)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Grootte</label>
            <select
              style={{ ...inputStyle, width: "150px" }}
              value={editForm.size ?? "medium"}
              onChange={(e) => setEditForm((f) => ({ ...f, size: e.target.value as TableSize }))}
            >
              <option value="small">Klein (56px)</option>
              <option value="medium">Middel (72px)</option>
              <option value="large">Groot (96px)</option>
              <option value="wide">Breed (140×72px)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Verdieping</label>
            <select
              style={{ ...inputStyle, width: "110px" }}
              value={editForm.floor ?? floor}
              onChange={(e) => setEditForm((f) => ({ ...f, floor: e.target.value as FloorType }))}
            >
              <option value="binnen">Binnen</option>
              <option value="buiten">Buiten</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button style={btn("#4CAF50")} onClick={saveEdit}>✅ Opslaan</button>
            <button style={btn("#999")} onClick={() => { setEditingId(null); setEditForm({}); }}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Canvas — scrollbaar wrapper */}
      <div style={{ overflowX: "auto" }}>
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: "relative",
            width: canvasWidth,
            height: canvasHeight,
            background: "#f8f9fa",
            border: "2px dashed #ccc",
            borderRadius: "12px",
            overflow: "visible", // ← fix: was "hidden", knoppen werden weggeknipt
            cursor: draggingId ? "grabbing" : "default",
          }}
        >
          {/* Grid */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {floorTables.map((t) => {
            const dims = SIZE_DIMS[t.size];
            const isEditing = editingId === t.id;
            const isDragging = draggingId === t.id;

            return (
              <div
                key={t.id}
                onMouseDown={(e) => handleMouseDown(e, t)}
                style={{
                  position: "absolute",
                  left: t.x,
                  top: t.y,
                  width: dims.width,
                  height: dims.height,
                  borderRadius: t.shape === "round" ? "50%" : "10px",
                  backgroundColor: isEditing ? "#1565C0" : "#4a5568",
                  border: isEditing ? "3px solid #0D47A1" : "3px solid transparent",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: isDragging ? "grabbing" : "grab",
                  userSelect: "none",
                  boxShadow: isDragging
                    ? "0 8px 24px rgba(0,0,0,0.3)"
                    : isEditing
                    ? "0 0 0 3px rgba(21,101,192,0.4)"
                    : "0 2px 6px rgba(0,0,0,0.2)",
                  transition: isDragging ? "none" : "box-shadow 0.15s",
                  zIndex: isDragging ? 10 : isEditing ? 5 : 1,
                }}
              >
                <span style={{
                  fontSize: dims.width > 90 ? "14px" : "12px",
                  textAlign: "center", padding: "0 4px", lineHeight: 1.2,
                }}>
                  {t.name}
                </span>
                <span style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>
                  {SIZE_LABELS[t.size]}
                </span>

                {/* Edit + delete knoppen */}
                <div style={{
                  position: "absolute", top: "-12px", right: "-12px",
                  display: "flex", gap: "3px", zIndex: 20,
                }}>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                    style={{
                      width: "22px", height: "22px", borderRadius: "50%",
                      background: isEditing ? "#0D47A1" : "#2196F3",
                      border: "2px solid white", color: "white",
                      fontSize: "10px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                    title="Bewerken"
                  >✏</button>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    style={{
                      width: "22px", height: "22px", borderRadius: "50%",
                      background: "#d9534f", border: "2px solid white", color: "white",
                      fontSize: "10px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                    title="Verwijderen"
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ marginTop: "0.75rem", fontSize: "12px", color: "#aaa" }}>
        💡 Sleep tafels om ze te verplaatsen. Klik ✏ om naam, vorm of grootte aan te passen.
      </p>
    </div>
  );
}