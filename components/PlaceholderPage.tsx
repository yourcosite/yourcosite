import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PlaceholderPage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div>
      <Header />
      <section className="bg-surface">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-[32px] font-medium mb-4">{title}</h1>
          <p className="text-[15px] text-ink-dim leading-relaxed">{body}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
