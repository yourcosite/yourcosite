import type { GridLayout } from "@/lib/contentModel";

// Små schematiska förhandsbilder av rutnätssektionens layouter, till
// layoutväljaren i redigeraren. Ritade med två toner: färgen för detaljer
// (accent) och en dämpad ton för text.
const W = 120;
const H = 76;

function Lines({ x, y, w, n = 2, c }: { x: number; y: number; w: number; n?: number; c: string }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={x} y={y + i * 5} width={i === n - 1 && n > 1 ? w * 0.7 : w} height={2.4} rx={1.2} fill={c} />
      ))}
    </>
  );
}

export default function GridLayoutThumb({ layout, accent = "#2E7D5B" }: { layout: GridLayout; accent?: string }) {
  const dim = "currentColor";
  const dimOp = 0.28;
  const cols3 = [8, 45, 82];
  let body: React.ReactNode = null;

  switch (layout) {
    case "cards":
      body = cols3.map((x) => (
        <g key={x}>
          <rect x={x} y={16} width={30} height={46} rx={4} fill="none" stroke={dim} strokeOpacity={0.4} />
          <rect x={x + 4} y={20} width={22} height={16} rx={2} fill={accent} fillOpacity={0.45} />
          <g opacity={dimOp}><Lines x={x + 4} y={42} w={22} n={3} c={dim} /></g>
        </g>
      ));
      break;
    case "alternating-rows":
      body = [0, 1].map((r) => (
        <g key={r}>
          <rect x={r ? 62 : 10} y={12 + r * 28} width={48} height={24} rx={3} fill={accent} fillOpacity={0.45} />
          <g opacity={dimOp}><Lines x={r ? 12 : 66} y={19 + r * 28} w={42} n={3} c={dim} /></g>
        </g>
      ));
      break;
    case "list":
      body = [0, 1, 2].map((r) => (
        <g key={r}>
          <rect x={10} y={12 + r * 18} width={100} height={0.8} fill={dim} opacity={0.3} />
          <rect x={10} y={16 + r * 18} width={26} height={3} rx={1.5} fill={accent} />
          <g opacity={dimOp}><Lines x={50} y={15 + r * 18} w={58} n={2} c={dim} /></g>
        </g>
      ));
      break;
    case "numbered":
      body = cols3.map((x, i) => (
        <g key={x}>
          <rect x={x} y={14} width={12} height={7} rx={1.5} fill={accent} />
          <rect x={x} y={26} width={24} height={3} rx={1.5} fill={dim} opacity={0.6} />
          <g opacity={dimOp}><Lines x={x} y={34} w={28} n={3} c={dim} /></g>
        </g>
      ));
      break;
    case "bento":
      body = (
        <>
          <rect x={8} y={12} width={60} height={52} rx={4} fill={accent} fillOpacity={0.5} />
          <rect x={72} y={12} width={40} height={24} rx={4} fill={accent} fillOpacity={0.3} />
          <rect x={72} y={40} width={40} height={24} rx={4} fill={accent} fillOpacity={0.3} />
        </>
      );
      break;
    case "icon-row":
      body = [8, 36, 64, 92].map((x) => (
        <g key={x}>
          <circle cx={x + 8} cy={22} r={7} fill={accent} fillOpacity={0.35} />
          <rect x={x} y={36} width={18} height={3} rx={1.5} fill={dim} opacity={0.6} />
          <g opacity={dimOp}><Lines x={x} y={43} w={20} n={2} c={dim} /></g>
        </g>
      ));
      break;
    case "divided-columns":
      body = (
        <>
          <rect x={8} y={10} width={44} height={4} rx={2} fill={dim} opacity={0.6} />
          {cols3.map((x, i) => (
            <g key={x}>
              {i > 0 && <rect x={x - 5} y={22} width={0.8} height={42} fill={dim} opacity={0.4} />}
              <rect x={x} y={24} width={7} height={7} rx={1} fill={accent} />
              <rect x={x} y={36} width={22} height={3} rx={1.5} fill={dim} opacity={0.6} />
              <g opacity={dimOp}><Lines x={x} y={43} w={26} n={3} c={dim} /></g>
            </g>
          ))}
        </>
      );
      break;
    case "intro-divided":
      body = (
        <>
          <rect x={8} y={18} width={30} height={5} rx={2} fill={dim} opacity={0.6} />
          <g opacity={dimOp}><Lines x={8} y={28} w={30} n={3} c={dim} /></g>
          <rect x={8} y={46} width={18} height={7} rx={3.5} fill={accent} />
          {[46, 70, 94].map((x) => (
            <g key={x}>
              <rect x={x - 4} y={16} width={0.8} height={46} fill={dim} opacity={0.4} />
              <rect x={x} y={18} width={6} height={6} rx={1} fill={accent} />
              <rect x={x} y={29} width={16} height={3} rx={1.5} fill={dim} opacity={0.6} />
              <g opacity={dimOp}><Lines x={x} y={36} w={18} n={3} c={dim} /></g>
            </g>
          ))}
        </>
      );
      break;
    case "icon-cards":
      body = cols3.map((x) => (
        <g key={x}>
          <rect x={x} y={16} width={30} height={46} rx={4} fill="none" stroke={dim} strokeOpacity={0.4} />
          <rect x={x + 4} y={21} width={10} height={10} rx={3} fill={accent} fillOpacity={0.4} />
          <rect x={x + 4} y={37} width={20} height={3} rx={1.5} fill={dim} opacity={0.6} />
          <g opacity={dimOp}><Lines x={x + 4} y={44} w={22} n={3} c={dim} /></g>
        </g>
      ));
      break;
    case "icon-circles":
      body = cols3.map((x) => (
        <g key={x}>
          <circle cx={x + 15} cy={26} r={10} fill={accent} fillOpacity={0.15} stroke={accent} strokeWidth={1.2} />
          <rect x={x + 7} y={42} width={16} height={3} rx={1.5} fill={dim} opacity={0.6} />
          <g opacity={dimOp}>
            <rect x={x + 3} y={49} width={24} height={2.4} rx={1.2} fill={dim} />
            <rect x={x + 6} y={54} width={18} height={2.4} rx={1.2} fill={dim} />
          </g>
        </g>
      ));
      break;
    case "icon-list":
      body = (
        <>
          <rect x={8} y={18} width={34} height={5} rx={2} fill={dim} opacity={0.6} />
          <rect x={8} y={27} width={26} height={5} rx={2} fill={dim} opacity={0.6} />
          {[0, 1, 2].map((r) => (
            <g key={r}>
              {r > 0 && <rect x={54} y={10 + r * 19} width={58} height={0.8} fill={dim} opacity={0.3} />}
              <circle cx={61} cy={19 + r * 19} r={5} fill={accent} fillOpacity={0.4} />
              <rect x={71} y={14 + r * 19} width={26} height={3} rx={1.5} fill={dim} opacity={0.6} />
              <g opacity={dimOp}><Lines x={71} y={20 + r * 19} w={38} n={2} c={dim} /></g>
            </g>
          ))}
        </>
      );
      break;
    case "icon-top-rule":
      body = cols3.map((x) => (
        <g key={x}>
          <rect x={x} y={16} width={30} height={2.4} fill={accent} />
          <circle cx={x + 5} cy={29} r={4.5} fill={accent} fillOpacity={0.4} />
          <rect x={x} y={39} width={20} height={3} rx={1.5} fill={dim} opacity={0.6} />
          <g opacity={dimOp}><Lines x={x} y={46} w={28} n={3} c={dim} /></g>
        </g>
      ));
      break;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-hidden="true">
      <rect x={0} y={0} width={W} height={H} rx={6} fill="currentColor" fillOpacity={0.05} />
      {body}
    </svg>
  );
}
