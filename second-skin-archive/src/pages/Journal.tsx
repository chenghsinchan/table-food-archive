import { useMemo, useState } from "react";
import type { Mood, OutfitLog } from "@/types";
import { store, uid } from "@/lib/storage";
import PhotoUpload from "@/components/PhotoUpload";
import {
  Button,
  Empty,
  Field,
  MonoLabel,
  Section,
  Slider,
  TextArea,
  TextInput,
} from "@/components/ui";

const MOODS: Mood[] = [
  "calm",
  "productive",
  "social",
  "protected",
  "expressive",
  "invisible",
  "playful",
];

function blankLog(): OutfitLog {
  return {
    id: uid(),
    date: new Date().toISOString().slice(0, 10),
    weather: "",
    location: "",
    occasion: "",
    itemIds: [],
    mood: "calm",
    comfortScore: 5,
    confidenceScore: 5,
    authenticityScore: 5,
    note: "",
    createdAt: new Date().toISOString(),
  };
}

export default function Journal() {
  const [logs, setLogs] = useState(() => store.getLogs());
  const items = useMemo(() => store.getItems(), []);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<OutfitLog>(blankLog());

  function patch(p: Partial<OutfitLog>) {
    setDraft((d) => ({ ...d, ...p }));
  }
  function toggleItem(itemId: string) {
    patch({
      itemIds: draft.itemIds.includes(itemId)
        ? draft.itemIds.filter((i) => i !== itemId)
        : [...draft.itemIds, itemId],
    });
  }
  function save() {
    store.addLog(draft);
    setLogs(store.getLogs());
    setComposing(false);
    setDraft(blankLog());
  }

  if (composing) {
    return (
      <div className="space-y-7">
        <Section title="New Log" index="04 / Journal">
          <p className="text-sm text-ink-soft">
            What you wore, and how the day felt in it.
          </p>
        </Section>

        <div className="relative z-[1]">
          <PhotoUpload
            value={draft.photo}
            onChange={(photo) => patch({ photo })}
            label="outfit photo"
            aspect="aspect-[4/5]"
          />
        </div>

        <div className="relative z-[1] grid grid-cols-2 gap-3">
          <Field label="date">
            <TextInput type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="weather">
            <TextInput value={draft.weather} placeholder="cold wind" onChange={(e) => patch({ weather: e.target.value })} />
            {/* TODO(weather): autofill from a weather API by date + location */}
          </Field>
          <Field label="location">
            <TextInput value={draft.location} onChange={(e) => patch({ location: e.target.value })} />
          </Field>
          <Field label="occasion">
            <TextInput value={draft.occasion} onChange={(e) => patch({ occasion: e.target.value })} />
          </Field>
        </div>

        <div className="relative z-[1]">
          <MonoLabel>What you wore</MonoLabel>
          {items.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => toggleItem(it.id)}
                  className={`px-2.5 py-1 text-xs ${
                    draft.itemIds.includes(it.id)
                      ? "bg-ink text-paper"
                      : "frame text-ink-soft"
                  }`}
                >
                  {it.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 font-mono text-xs text-grey">
              add wardrobe items to attach them here
            </p>
          )}
        </div>

        <div className="relative z-[1]">
          <MonoLabel>Mood</MonoLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => patch({ mood: m })}
                className={`px-2.5 py-1 text-xs uppercase tracking-wider ${
                  draft.mood === m ? "bg-mark text-paper" : "frame"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-[1] space-y-0.5">
          <Slider label="comfort" value={draft.comfortScore} onChange={(v) => patch({ comfortScore: v })} />
          <Slider label="confidence" value={draft.confidenceScore} onChange={(v) => patch({ confidenceScore: v })} />
          <Slider label="authenticity" value={draft.authenticityScore} onChange={(v) => patch({ authenticityScore: v })} />
        </div>

        <Field label="note">
          <TextArea
            rows={3}
            className="hand text-base"
            placeholder="Felt confident and calm today."
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </Field>

        <div className="relative z-[1] flex gap-3">
          <Button onClick={save}>Save log</Button>
          <Button variant="outline" onClick={() => setComposing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Outfit Journal" index="04 / Journal">
        <p className="text-sm text-ink-soft">
          A diary of days and what carried you through them.
        </p>
      </Section>

      <div className="relative z-[1]">
        <Button onClick={() => { setDraft(blankLog()); setComposing(true); }}>
          + New entry
        </Button>
      </div>

      {logs.length === 0 ? (
        <Empty>no logs yet — your first day is waiting</Empty>
      ) : (
        <ul className="relative z-[1] space-y-4">
          {logs.map((log) => (
            <li key={log.id} className="frame bg-paper/40 p-3">
              <div className="flex gap-3">
                <div className="h-24 w-20 shrink-0 overflow-hidden frame bg-paper-dim">
                  {log.photo ? (
                    <img src={log.photo} alt="" className="h-full w-full object-cover grayscale-[15%]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="mono-label">{log.mood}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{log.date}</span>
                    <span className="tape">{log.mood}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold">
                    {log.occasion || "—"}
                  </p>
                  <p className="mono-label">
                    {log.weather}
                    {log.location ? ` · ${log.location}` : ""}
                  </p>
                  <div className="mt-1.5 flex gap-3 font-mono text-[0.65rem] text-grey">
                    <span>cmf {log.comfortScore}</span>
                    <span>cnf {log.confidenceScore}</span>
                    <span>aut {log.authenticityScore}</span>
                  </div>
                </div>
              </div>
              {log.note && <p className="hand mt-2 text-base">{log.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
