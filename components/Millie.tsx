// Millie — chattredigerarens maskot. En liten trollflicka med stort, vilt
// grönt hår, spetsiga öron, fräknar och ett glatt leende med en liten
// hugg-tand, ritad som ren SVG (inga bildfiler, väger nästan ingenting och
// skalar perfekt från 16px i chatten upp till stort i header/laddningsläge).
// "active" styr om hon står och flyter lugnt (vilar) eller studsar/vaggar
// piggare (jobbar, se app/redigera) — se tailwind.config.ts för själva
// rörelserna (millie-float/millie-bounce/millie-hair).
export default function Millie({ active = false, size = 36 }: { active?: boolean; size?: number }) {
  return (
    <div
      className={active ? "animate-millie-bounce" : "animate-millie-float"}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        {/* Stort, vilt hår — en "pom-pom"-klase av runda tofsar i olika
            gröna nyanser runt hjässan, precis vildare och yvigare än en
            enkel frisyr. */}
        <g className={active ? "animate-millie-hair" : undefined} style={{ transformOrigin: "32px 24px" }}>
          <circle cx="32" cy="12" r="12.5" fill="#B8EE4C" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="15" cy="17" r="10" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="49" cy="17" r="10" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="6" cy="29" r="8.5" fill="#B8EE4C" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="58" cy="29" r="8.5" fill="#B8EE4C" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="22" cy="6" r="8" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="42" cy="6" r="8" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="11" cy="39" r="7" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />
          <circle cx="53" cy="39" r="7" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.2" />

          {/* Två små blommor i håret. */}
          <g>
            <circle cx="21" cy="11" r="1.6" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1" />
            <circle cx="21" cy="11" r="0.7" fill="#E8B14A" />
          </g>
          <g>
            <circle cx="46" cy="22" r="1.6" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1" />
            <circle cx="46" cy="22" r="0.7" fill="#E8B14A" />
          </g>
        </g>

        {/* Spetsiga troll-öron, bakom ansiktet. */}
        <path d="M14 38 C6 34 6 24 13 24 C16 24 18 30 18 36 Z" fill="#F3C8A0" stroke="#0C1004" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M50 38 C58 34 58 24 51 24 C48 24 46 30 46 36 Z" fill="#F3C8A0" stroke="#0C1004" strokeWidth="2.2" strokeLinejoin="round" />

        {/* Ansikte */}
        <circle cx="32" cy="39" r="15.5" fill="#F3C8A0" stroke="#0C1004" strokeWidth="2.4" />

        {/* Fräknar */}
        <circle cx="21" cy="42" r="0.9" fill="#C97B4A" />
        <circle cx="24" cy="45" r="0.9" fill="#C97B4A" />
        <circle cx="40" cy="42" r="0.9" fill="#C97B4A" />
        <circle cx="43" cy="45" r="0.9" fill="#C97B4A" />

        {/* Kinder */}
        <circle cx="20.5" cy="43" r="3.4" fill="#E8714A" opacity="0.45" />
        <circle cx="43.5" cy="43" r="3.4" fill="#E8714A" opacity="0.45" />

        {/* Ögonbryn */}
        <path d="M20 29 Q24 26 28 29" stroke="#0C1004" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M36 29 Q40 26 44 29" stroke="#0C1004" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Ögon — stora, runda, glada. */}
        <circle cx="24" cy="36" r="4.6" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1.5" />
        <circle cx="40" cy="36" r="4.6" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1.5" />
        <circle cx="25.3" cy="37.2" r="2.3" fill="#5C3A1E" />
        <circle cx="41.3" cy="37.2" r="2.3" fill="#5C3A1E" />
        <circle cx="26.1" cy="36.2" r="0.8" fill="#FFFFFF" />
        <circle cx="42.1" cy="36.2" r="0.8" fill="#FFFFFF" />

        {/* Leende med en liten huggtand. */}
        <path d="M23 46 Q32 54 41 46" stroke="#0C1004" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M28 48 L27.5 51.5 L30 49.2Z" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
