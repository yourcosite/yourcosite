import { permanentRedirect } from "next/navigation";

// Gamla adressen www.yourcosite.com/s/<namn> skickas vidare till /<namn>.
export const dynamic = "force-dynamic";

export default function OldPublicSlugPage({ params }: { params: { key: string; slug?: string[] } }) {
  permanentRedirect(`/${params.key}${params.slug?.length ? "/" + params.slug.join("/") : ""}`);
}
