import type { ReactNode } from "react";
import type { TFunction } from "./config";

// Översätter en text som innehåller länkar, fetstil eller värden mitt i
// meningen. Skriv texten med taggar och platshållare:
//   rich(t, "Jag godkänner <terms>villkoren</terms> och {name}.",
//        { terms: (c) => <Link href="/villkor">{c}</Link> }, { name: <b>{n}</b> })
// Översättaren flyttar taggarna fritt, så ordföljden blir rätt på varje språk.
export function rich(
  t: TFunction,
  text: string,
  tags: Record<string, (children: ReactNode) => ReactNode> = {},
  values: Record<string, ReactNode> = {}
): ReactNode[] {
  const translated = t(text);
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>|\{([\p{L}\p{N}_]+)\}/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(translated))) {
    if (m.index > last) out.push(translated.slice(last, m.index));
    if (m[1]) {
      const render = tags[m[1]];
      out.push(<span key={i++} style={{ display: "contents" }}>{render ? render(m[2]) : m[2]}</span>);
    } else if (m[3] in values) {
      out.push(<span key={i++} style={{ display: "contents" }}>{values[m[3]]}</span>);
    } else {
      out.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < translated.length) out.push(translated.slice(last));
  return out;
}
