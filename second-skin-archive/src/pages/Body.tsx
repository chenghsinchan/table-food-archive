import { useState } from "react";
import type { BodyProfile, FitPreference } from "@/types";
import { store, uid } from "@/lib/storage";
import { detectBodyFromPhoto } from "@/lib/ai";
import PhotoUpload from "@/components/PhotoUpload";
import {
  Button,
  Field,
  MonoLabel,
  Section,
  Slider,
  TextInput,
} from "@/components/ui";
import BodyDrawing from "@/components/BodyDrawing";

const FITS: FitPreference[] = [
  "relaxed",
  "regular",
  "fitted",
  "oversized",
  "structured",
];

// Suggested, non-judgemental observation tags.
const NOTE_TAGS = [
  "long torso",
  "short torso",
  "narrow shoulder",
  "wide shoulder",
  "sensitive waist",
  "gets cold easily",
  "runs warm",
  "prefers relaxed fit",
  "likes things close",
];

function blankProfile(): BodyProfile {
  return {
    id: uid(),
    heightCm: 170,
    shoulderCm: 42,
    chestCm: 90,
    waistCm: 75,
    hipsCm: 95,
    inseamCm: 78,
    torsoCm: 46,
    legCm: 80,
    bodyType: "rectangle",
    fitPreference: "regular",
    notes: [],
    updatedAt: new Date().toISOString(),
  };
}

export default function Body() {
  const existing = store.getBody();
  const [editing, setEditing] = useState(!existing);
  const [draft, setDraft] = useState<BodyProfile>(existing ?? blankProfile());

  function patch(p: Partial<BodyProfile>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function save() {
    const next = { ...draft, updatedAt: new Date().toISOString() };
    store.setBody(next);
    setDraft(next);
    setEditing(false);
  }

  function toggleNote(tag: string) {
    patch({
      notes: draft.notes.includes(tag)
        ? draft.notes.filter((n) => n !== tag)
        : [...draft.notes, tag],
    });
  }

  // --------------------------------------------------------- view mode
  if (!editing) {
    return (
      <div className="space-y-8">
        <Section title="Your Body" index="01 / Body">
          <p className="text-sm text-ink-soft">
            Your first skin. Everything you record about clothing is read
            against these proportions — never against an ideal.
          </p>
        </Section>

        <div className="relative z-[1] grid grid-cols-2 gap-4">
          <div className="frame aspect-[3/4] overflow-hidden bg-paper-dim">
            {draft.photo ? (
              <img
                src={draft.photo}
                alt="Your body reference"
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <BodyDrawing profile={draft} />
            )}
          </div>
          <div className="space-y-1">
            <Measure label="height" v={`${draft.heightCm} cm`} />
            <Measure label="shoulder" v={`${draft.shoulderCm} cm`} />
            <Measure label="chest" v={`${draft.chestCm} cm`} />
            <Measure label="waist" v={`${draft.waistCm} cm`} />
            <Measure label="hips" v={`${draft.hipsCm} cm`} />
            <Measure label="inseam" v={`${draft.inseamCm} cm`} />
            <Measure label="torso" v={`${draft.torsoCm} cm`} />
            <Measure label="leg" v={`${draft.legCm} cm`} />
          </div>
        </div>

        <div className="relative z-[1] flex flex-wrap items-center gap-2">
          <span className="tape">{draft.bodyType}</span>
          <span className="tape">prefers {draft.fitPreference}</span>
        </div>

        {draft.notes.length > 0 && (
          <div className="relative z-[1]">
            <MonoLabel>Notes</MonoLabel>
            <ul className="mt-2 space-y-1">
              {draft.notes.map((n) => (
                <li key={n} className="flex items-center gap-2 text-sm">
                  <span className="text-mark">—</span>
                  <span className="hand text-base">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative z-[1]">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit body profile
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------- edit mode
  return (
    <div className="space-y-8">
      <Section title="Register Body" index="01 / Body">
        <p className="text-sm text-ink-soft">
          Upload a full-body photo, then adjust everything by hand. Calm,
          anatomical, yours to change.
        </p>
      </Section>

      <div className="relative z-[1] grid grid-cols-2 gap-4">
        <PhotoUpload
          value={draft.photo}
          onChange={(photo) => patch({ photo })}
          label="full-body photo"
        />
        <div className="flex flex-col justify-between">
          <p className="font-mono text-xs leading-relaxed text-grey">
            {/* TODO(ai): AI body measurement detection from the photo */}
            We'll estimate measurements from your photo. This is a placeholder —
            real detection comes later. Everything stays editable.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const detected = detectBodyFromPhoto(draft.photo);
              setDraft({ ...detected, id: draft.id, notes: draft.notes });
            }}
            className="mt-3"
          >
            Estimate from photo
          </Button>
        </div>
      </div>

      <div className="relative z-[1] space-y-1">
        <Slider label="height" unit="cm" min={140} max={210} value={draft.heightCm} onChange={(v) => patch({ heightCm: v })} />
        <Slider label="shoulder width" unit="cm" min={32} max={56} value={draft.shoulderCm} onChange={(v) => patch({ shoulderCm: v })} />
        <Slider label="bust / chest" unit="cm" min={70} max={130} value={draft.chestCm} onChange={(v) => patch({ chestCm: v })} />
        <Slider label="waist" unit="cm" min={55} max={120} value={draft.waistCm} onChange={(v) => patch({ waistCm: v })} />
        <Slider label="hips" unit="cm" min={70} max={130} value={draft.hipsCm} onChange={(v) => patch({ hipsCm: v })} />
        <Slider label="inseam" unit="cm" min={60} max={95} value={draft.inseamCm} onChange={(v) => patch({ inseamCm: v })} />
        <Slider label="torso length" unit="cm" min={38} max={60} value={draft.torsoCm} onChange={(v) => patch({ torsoCm: v })} />
        <Slider label="leg length" unit="cm" min={65} max={105} value={draft.legCm} onChange={(v) => patch({ legCm: v })} />
      </div>

      <div className="relative z-[1] grid grid-cols-2 gap-4">
        <Field label="body type">
          <TextInput
            value={draft.bodyType}
            onChange={(e) => patch({ bodyType: e.target.value })}
          />
        </Field>
        <Field label="fit preference">
          <div className="flex flex-wrap gap-1.5">
            {FITS.map((f) => (
              <button
                key={f}
                onClick={() => patch({ fitPreference: f })}
                className={`px-2 py-1 text-[0.65rem] uppercase tracking-wider ${
                  draft.fitPreference === f
                    ? "bg-ink text-paper"
                    : "frame"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="relative z-[1]">
        <MonoLabel>Observations</MonoLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NOTE_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleNote(t)}
              className={`px-2.5 py-1 text-xs ${
                draft.notes.includes(t)
                  ? "bg-violet text-paper"
                  : "frame text-ink-soft"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-[1] flex gap-3">
        <Button onClick={save}>Save body</Button>
        {existing && (
          <Button variant="outline" onClick={() => { setDraft(existing); setEditing(false); }}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function Measure({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink/15 py-1.5">
      <span className="mono-label">{label}</span>
      <span className="font-mono text-sm">{v}</span>
    </div>
  );
}
