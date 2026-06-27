import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ClothingItem, UserFeeling } from "@/types";
import { store } from "@/lib/storage";
import {
  Button,
  Empty,
  MonoLabel,
  Section,
  Slider,
  TextArea,
} from "@/components/ui";

const FEELINGS: { key: keyof UserFeeling; label: string }[] = [
  { key: "comfort", label: "comfort" },
  { key: "confidence", label: "confidence" },
  { key: "warmth", label: "warmth" },
  { key: "formality", label: "formality" },
  { key: "protection", label: "protection" },
  { key: "authenticity", label: "authenticity" },
];

export default function ClothingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const found = id ? store.getItem(id) : undefined;
  const [item, setItem] = useState<ClothingItem | undefined>(found);
  const [saved, setSaved] = useState(false);

  if (!item) {
    return (
      <div className="space-y-6">
        <Section title="Not found" index="Clothing">
          <Empty>this garment is no longer in the archive</Empty>
        </Section>
        <Button variant="outline" onClick={() => navigate("/wardrobe")}>
          Back to wardrobe
        </Button>
      </div>
    );
  }

  function patchFeeling(key: keyof UserFeeling, v: number) {
    setItem((it) => (it ? { ...it, feeling: { ...it.feeling, [key]: v } } : it));
    setSaved(false);
  }

  function save() {
    if (!item) return;
    store.upsertItem(item);
    setSaved(true);
  }

  function remove() {
    if (!item) return;
    if (confirm(`Remove "${item.name}" from the archive?`)) {
      store.removeItem(item.id);
      navigate("/wardrobe");
    }
  }

  return (
    <div className="space-y-7">
      <div className="relative z-[1] frame overflow-hidden bg-paper-dim">
        <div className="aspect-[4/5]">
          {item.photo ? (
            <img src={item.photo} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="mono-label">{item.category}</span>
            </div>
          )}
        </div>
      </div>

      <Section title={item.name} index={item.category}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Meta label="colour" v={item.colour || "—"} />
          <Meta label="material" v={item.material || "—"} />
          <Meta label="season" v={item.season} />
          <Meta label="brand" v={item.brand || "—"} />
          <Meta label="bought" v={item.purchaseDate || "—"} />
          <Meta label="worn" v={`×${item.frequencyWorn}`} />
        </div>
        {item.notes && (
          <p className="mt-3 text-sm text-ink-soft">{item.notes}</p>
        )}
      </Section>

      <section className="relative z-[1]">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="mono-label text-mark">How it feels</span>
          <span className="hand text-annotate text-sm">not how it looks</span>
        </div>
        <div className="space-y-0.5">
          {FEELINGS.map((f) => (
            <Slider
              key={f.key}
              label={f.label}
              value={item.feeling[f.key]}
              onChange={(v) => patchFeeling(f.key, v)}
            />
          ))}
        </div>
      </section>

      <section className="relative z-[1]">
        <MonoLabel>Handwritten note</MonoLabel>
        <TextArea
          rows={3}
          className="mt-2 hand text-base"
          placeholder="Felt safe and invisible. Good for long walks and overthinking."
          value={item.handNote}
          onChange={(e) => {
            setItem({ ...item, handNote: e.target.value });
            setSaved(false);
          }}
        />
      </section>

      <div className="relative z-[1] flex items-center gap-3">
        <Button onClick={save}>{saved ? "Saved ✓" : "Save"}</Button>
        <Button variant="outline" onClick={() => navigate("/wardrobe")}>
          Back
        </Button>
        <button onClick={remove} className="ml-auto mono-label text-mark">
          remove
        </button>
      </div>
    </div>
  );
}

function Meta({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink/15 py-1.5">
      <span className="mono-label">{label}</span>
      <span className="font-mono text-xs">{v}</span>
    </div>
  );
}
