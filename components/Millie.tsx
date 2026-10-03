// Millie — chattredigerarens maskot. Ett litet, runt trollansikte med yvigt
// hår och glad uppsyn, ritat som ren SVG (inga bildfiler, väger nästan
// ingenting och skalar perfekt). "active" styr om hon står och flyter
// lugnt (vilar) eller studsar/vaggar piggare (jobbar, se app/redigera) —
// se tailwind.config.ts för själva rörelserna (millie-float/millie-bounce/
// millie-hair).
export default function Millie({ active = false, size = 36 }: { active?: boolean; size?: number }) {
  return (
    <div
      className={active ? "animate-millie-bounce" : "animate-millie-float"}
      style={{ width: size, height: size, flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        {/* Yvigt hår — fem tofsar som sticker upp/ut runt hjässan. */}
        <g
          className={active ? "animate-millie-hair" : undefined}
          style={{ transformOrigin: "32px 26px" }}
        >
          <path d="M18 24 C12 14 10 4 18 8 C19 2 28 0 27 10" stroke="#0C1004" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27 10 C27 1 37 -1 36 8" stroke="#0C1004" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 9 C37 0 47 1 44 10 C52 7 55 15 47 20" stroke="#0C1004" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M46 20 C56 18 58 28 48 27" stroke="#0C1004" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 25 C7 25 6 35 16 32" stroke="#0C1004" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Kropp/huvud — en rund, mjuk form i sajtens lime-accent. */}
        <ellipse cx="32" cy="38" rx="19" ry="17" fill="#C6FF5E" stroke="#0C1004" strokeWidth="2.5" />

        {/* Kinder */}
        <circle cx="19.5" cy="40" r="3.2" fill="#E8714A" opacity="0.55" />
        <circle cx="44.5" cy="40" r="3.2" fill="#E8714A" opacity="0.55" />

        {/* Ögon — stora, runda, glada. */}
        <circle cx="24" cy="35" r="4.3" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1.4" />
        <circle cx="40" cy="35" r="4.3" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1.4" />
        <circle cx="25.1" cy="36.1" r="2" fill="#0C1004" />
        <circle cx="41.1" cy="36.1" r="2" fill="#0C1004" />

        {/* Leende */}
        <path d="M23 45 Q32 53 41 45" stroke="#0C1004" strokeWidth="2.4" fill="none" strokeLinecap="round" />

        {/* Två små huggtänder, som ett vänligt troll. */}
        <path d="M27.5 47.5 L27 50.5 L29.5 48.3Z" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1" strokeLinejoin="round" />
        <path d="M36.5 47.5 L37 50.5 L34.5 48.3Z" fill="#FFFFFF" stroke="#0C1004" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
