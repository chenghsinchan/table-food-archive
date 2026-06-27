import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ClothingCategory, ClothingItem, Season } from "@/types";
import { store, uid } from "@/lib/storage";
import PhotoUpload from "@/components/PhotoUpload";
import {
  Button,
  Field,
  Section,
  TextArea,
  TextInput,
} from "@/components/ui";

const CATEGORIES: ClothingCategory[] = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Shoes",
  "Accessories",
];
const SEASONS: Season[] = ["Spring", "Summer", "Autumn", "Winter", "All-year"];

export default function AddItem() {
  const navigate = useNavigate();
  const [item, setItem] = useState<ClothingItem>({
    id: uid(),
    name: "",
    category: "Tops",
    colour: "",
    material: "",
    season: "All-year",
    brand: "",
    purchaseDate: "",
    notes: "",
    frequencyWorn: 0,
    feeling: {
      comfort: 5,
      confidence: 5,
      warmth: 5,
      formality: 5,
      protection: 5,
      authenticity: 5,
    },
    handNote: "",
    createdAt: new Date().toISOString(),
  });

  function patch(p: Partial<ClothingItem>) {
    setItem((i) => ({ ...i, ...p }));
  }

  function save() {
    if (!item.name.trim()) {
      patch({ name: "Untitled garment" });
    }
    store.upsertItem({ ...item, name: item.name.trim() || "Untitled garment" });
    navigate(`/item/${item.id}`);
  }

  return (
    <div className="space-y-7">
      <Section title="Add Item" index="+ / Wardrobe">
        <p className="text-sm text-ink-soft">
          Record one garment. You can score how it feels once it's saved.
        </p>
      </Section>

      <div className="relative z-[1]">
        <PhotoUpload
          value={item.photo}
          onChange={(photo) => patch({ photo })}
          label="garment photo"
          aspect="aspect-[4/5]"
        />
        {/* TODO(ai): AI clothing recognition to auto-fill the fields below */}
      </div>

      <div className="relative z-[1] space-y-4">
        <Field label="name">
          <TextInput
            value={item.name}
            placeholder="e.g. Washed black tee"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>

        <Field label="category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => patch({ category: c })}
                className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                  item.category === c ? "bg-ink text-paper" : "frame"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="colour">
            <TextInput value={item.colour} onChange={(e) => patch({ colour: e.target.value })} />
          </Field>
          <Field label="material">
            <TextInput value={item.material} onChange={(e) => patch({ material: e.target.value })} />
          </Field>
        </div>

        <Field label="season">
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((s) => (
              <button
                key={s}
                onClick={() => patch({ season: s })}
                className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                  item.season === s ? "bg-ink text-paper" : "frame"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="brand">
            <TextInput value={item.brand} onChange={(e) => patch({ brand: e.target.value })} />
          </Field>
          <Field label="purchase date">
            <TextInput type="date" value={item.purchaseDate} onChange={(e) => patch({ purchaseDate: e.target.value })} />
          </Field>
        </div>

        <Field label="notes">
          <TextArea
            rows={3}
            value={item.notes}
            placeholder="anything worth remembering about this piece"
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </div>

      <div className="relative z-[1] flex gap-3">
        <Button onClick={save}>Save to wardrobe</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
