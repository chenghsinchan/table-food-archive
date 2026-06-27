import type { BodyProfile } from "@/types";

// An abstract, anatomical line figure that responds to the saved
// measurements. Intentionally diagrammatic — not a cartoon, not a "body goal".
export default function BodyDrawing({ profile }: { profile: BodyProfile }) {
  // map cm ranges to drawing widths (px within a 120-wide viewbox)
  const shoulder = scale(profile.shoulderCm, 32, 56, 22, 50);
  const waist = scale(profile.waistCm, 55, 120, 16, 44);
  const hips = scale(profile.hipsCm, 70, 130, 20, 48);
  const torso = scale(profile.torsoCm, 38, 60, 50, 78); // y of waist
  const cx = 60;

  return (
    <svg
      viewBox="0 0 120 200"
      className="h-full w-full text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* head */}
      <circle cx={cx} cy="22" r="11" />
      {/* neck */}
      <path d={`M${cx} 33 V40`} />
      {/* shoulders */}
      <path d={`M${cx - shoulder} 44 H${cx + shoulder}`} />
      {/* torso sides to waist */}
      <path d={`M${cx - shoulder} 44 L${cx - waist} ${torso}`} />
      <path d={`M${cx + shoulder} 44 L${cx + waist} ${torso}`} />
      {/* waist to hips */}
      <path d={`M${cx - waist} ${torso} L${cx - hips} ${torso + 26}`} />
      <path d={`M${cx + waist} ${torso} L${cx + hips} ${torso + 26}`} />
      {/* arms */}
      <path d={`M${cx - shoulder} 46 L${cx - shoulder - 6} ${torso + 18}`} />
      <path d={`M${cx + shoulder} 46 L${cx + shoulder + 6} ${torso + 18}`} />
      {/* legs */}
      <path d={`M${cx - hips + 4} ${torso + 26} L${cx - 10} 188`} />
      <path d={`M${cx + hips - 4} ${torso + 26} L${cx + 10} 188`} />
      <path d={`M${cx} ${torso + 26} L${cx - 10} 188`} className="opacity-40" />
      <path d={`M${cx} ${torso + 26} L${cx + 10} 188`} className="opacity-40" />

      {/* annotation marks */}
      <path
        d={`M${cx + shoulder + 10} 44 h10`}
        stroke="#2f49d1"
        strokeWidth="1"
      />
      <text x={cx + shoulder + 22} y="46" fontSize="6" fill="#2f49d1" fontFamily="monospace">
        sh
      </text>
      <path
        d={`M${cx + waist + 8} ${torso} h12`}
        stroke="#e23b2e"
        strokeWidth="1"
      />
      <text x={cx + waist + 22} y={torso + 2} fontSize="6" fill="#e23b2e" fontFamily="monospace">
        w
      </text>
    </svg>
  );
}

function scale(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = Math.max(0, Math.min(1, (v - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}
