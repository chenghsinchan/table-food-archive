import { SIMILAR_PROFILES } from "@/lib/seed";
import { MonoLabel, Section } from "@/components/ui";

// Mock community surface. No real users, no sharing, no matching yet.
// TODO(backend): private sharing + similar-body matching from real profiles.
export default function PeopleLikeMe() {
  return (
    <div className="space-y-6">
      <Section title="People Like Me" index="05 / People">
        <p className="text-sm text-ink-soft">real bodies. real style.</p>
        <p className="mt-1 font-mono text-xs text-grey">
          similar proportions. different personalities. endless possibilities.
        </p>
      </Section>

      <div className="frame border-dashed relative z-[1] p-3">
        <MonoLabel>
          A preview — imagine seeing people with proportions like yours, not
          models. Real sharing comes later.
        </MonoLabel>
      </div>

      <ul className="relative z-[1] space-y-4">
        {SIMILAR_PROFILES.map((p) => (
          <li key={p.id} className="frame bg-paper/40 p-3">
            <div className="flex items-baseline justify-between">
              <span className="display text-lg">{p.name}</span>
              <span className="tape">{p.bodyType}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <Meta label="height" v={p.heightRange} />
              <Meta label="shoulder" v={p.shoulderRange} />
              <Meta label="climate" v={p.climate} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.styleKeywords.map((k) => (
                <span key={k} className="px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-violet frame">
                  {k}
                </span>
              ))}
            </div>
            {/* outfit photos placeholder strip */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="frame aspect-[3/4] bg-paper-dim flex items-center justify-center"
                >
                  <span className="mono-label">fig.{i + 1}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink/15 py-1">
      <span className="mono-label">{label}</span>
      <span className="font-mono text-xs">{v}</span>
    </div>
  );
}
