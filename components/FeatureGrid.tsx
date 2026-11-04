import { getT } from "@/lib/i18n/server";
import Reveal from "@/components/Reveal";
import YIcon from "@/components/ui/YIcon";

// Rutnät med funktionskort (ikon, rubrik, text) som glider in när de kommer i
// bild. Används på startsidan och funktionssidan.
export default function FeatureGrid({ items }: { items: { icon: string; title: string; body: string }[] }) {
  const t = getT();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((f, i) => (
        <Reveal key={f.title} from="up" delay={(i % 3) * 90}>
          <div className="yc-feature h-full bg-white border border-line rounded-2xl p-6">
            <div className="relative w-11 h-11 rounded-xl bg-ink text-white flex items-center justify-center mb-4">
              <YIcon name={f.icon} size={22} />
            </div>
            <h3 className="relative text-[17px] font-semibold mb-1.5">{t(f.title)}</h3>
            <p className="relative text-[14.5px] leading-relaxed text-ink-dim">{t(f.body)}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
