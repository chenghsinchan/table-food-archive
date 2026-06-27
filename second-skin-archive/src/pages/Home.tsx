import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Mood } from "@/types";
import { store } from "@/lib/storage";
import { suggestOutfit } from "@/lib/suggest";
import { MonoLabel, Section } from "@/components/ui";

const MOODS: Mood[] = [
  "calm",
  "productive",
  "social",
  "protected",
  "expressive",
  "invisible",
  "playful",
];

// Home / Today hub: "What to wear for how you feel today?"
export default function Home() {
  const items = useMemo(() => store.getItems(), []);
  const body = useMemo(() => store.getBody(), []);
  const [mood, setMood] = useState<Mood | null>(null);

  const suggestion = mood ? suggestOutfit(items, mood) : [];

  return (
    <div className="space-y-10">
      <Section title="Today" index="00 / Today">
        <p className="text-sm text-ink-soft">
          What to wear for how you feel today?
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                mood === m
                  ? "bg-ink text-paper"
                  : "frame text-ink hover:bg-paper-dim"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mood && (
          <div className="mt-6 fade-up">
            <div className="flex items-center gap-2">
              <span className="mono-label text-mark">suggested</span>
              <span className="hand text-annotate text-sm">
                because you feel {mood}
              </span>
            </div>
            {suggestion.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {suggestion.map((it) => (
                  <Link
                    to={`/item/${it.id}`}
                    key={it.id}
                    className="frame block overflow-hidden bg-paper-dim"
                  >
                    <div className="aspect-square">
                      {it.photo ? (
                        <img
                          src={it.photo}
                          alt=""
                          className="h-full w-full object-cover grayscale-[15%]"
                        />
                      ) : (
                        <Placeholder label={it.category} />
                      )}
                    </div>
                    <div className="border-t border-ink px-2 py-1.5">
                      <p className="truncate text-xs font-bold">{it.name}</p>
                      <MonoLabel>{it.category}</MonoLabel>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 font-mono text-xs text-grey">
                Add a few clothes to your wardrobe and a suggestion will appear
                here.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="The Archive" index="—">
        <div className="grid grid-cols-2 gap-3">
          <HubCard
            to="/body"
            n="01"
            title="Body"
            note={body ? `${body.heightCm} cm · ${body.bodyType}` : "set up"}
          />
          <HubCard
            to="/wardrobe"
            n="03"
            title="Wardrobe"
            note={`${items.length} items`}
          />
          <HubCard to="/journal" n="04" title="Journal" note="outfit logs" />
          <HubCard
            to="/people"
            n="05"
            title="People Like Me"
            note="real bodies"
          />
          <HubCard
            to="/archive"
            n="06"
            title="Archive"
            note="timeline + insight"
          />
          <HubCard to="/add" n="+" title="Add Item" note="record a garment" />
        </div>
      </Section>
    </div>
  );
}

function HubCard({
  to,
  n,
  title,
  note,
}: {
  to: string;
  n: string;
  title: string;
  note: string;
}) {
  return (
    <Link
      to={to}
      className="frame flex flex-col justify-between bg-paper/40 p-3 hover:bg-paper-dim"
    >
      <span className="mono-label text-mark">{n}</span>
      <span className="display mt-6 text-lg leading-none">{title}</span>
      <span className="mono-label mt-1">{note}</span>
    </Link>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="mono-label">{label}</span>
    </div>
  );
}
