// Liten schematisk förhandsbild av en menystil (se HeaderLayout i
// lib/contentModel.ts). Visas på Millies klickbara svar när kunden får välja
// meny, så man ser skillnaden utan att läsa beskrivningarna.
export type MenuStyleId = "left-button" | "split-button" | "centered-button" | "pill-bar" | "minimal";

export const MENU_STYLE_ORDER: MenuStyleId[] = ["left-button", "split-button", "centered-button", "pill-bar", "minimal"];

export default function MenuStyleThumb({ style, accent = "#C6FF5E" }: { style: MenuStyleId; accent?: string }) {
  const ink = "#17171A";
  const soft = "#C9C6BF";
  const logo = (x: number, y: number) => <rect x={x} y={y} width="26" height="7" rx="2" fill={ink} />;
  const links = (x: number, y: number, active = -1) =>
    [0, 1, 2].map((i) => <rect key={i} x={x + i * 18} y={y - 0.5} width="13" height="5" rx="2.5" fill={i === active ? ink : soft} />);
  const button = (x: number, y: number) => <rect x={x} y={y} width="24" height="12" rx="6" fill={accent} stroke={ink} strokeOpacity="0.15" />;
  return (
    <svg viewBox="0 0 160 46" width="128" height="37" aria-hidden="true" className="flex-shrink-0 rounded-md bg-white border border-line">
      {style === "left-button" && (
        <>
          {logo(8, 19.5)}
          {links(70, 21, 0)}
          {button(130, 17.5)}
        </>
      )}
      {style === "split-button" && (
        <>
          {logo(8, 19.5)}
          {links(52, 21, 0)}
          {button(130, 17.5)}
        </>
      )}
      {style === "centered-button" && (
        <>
          {logo(67, 8)}
          {button(130, 6)}
          {links(52, 31, 0)}
        </>
      )}
      {style === "pill-bar" && (
        <>
          {logo(8, 19.5)}
          <rect x="42" y="13" width="70" height="20" rx="10" fill="#F2F0EC" stroke={ink} strokeOpacity="0.12" />
          <rect x="47" y="17" width="18" height="12" rx="6" fill={ink} />
          <rect x="71" y="21" width="13" height="5" rx="2.5" fill={soft} />
          <rect x="90" y="21" width="13" height="5" rx="2.5" fill={soft} />
          {button(130, 17.5)}
        </>
      )}
      {style === "minimal" && (
        <>
          {logo(8, 19.5)}
          {button(100, 17.5)}
          <rect x="140" y="20" width="12" height="2" rx="1" fill={ink} />
          <rect x="140" y="25" width="12" height="2" rx="1" fill={ink} />
        </>
      )}
    </svg>
  );
}
