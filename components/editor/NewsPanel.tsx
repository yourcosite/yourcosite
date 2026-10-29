"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import NewsClient from "@/app/nyheter/NewsClient";
import type { NewsArticle } from "@/lib/newsArticles";

// Nyheter inne i redigeraren. Samma hantering som sidan /nyheter (skriva,
// schemalägga, publicera), men hämtar artiklarna själv så panelen kan öppnas
// direkt från sidofältet.
export default function NewsPanel({ siteId }: { siteId: string }) {
  const t = useT();
  const [data, setData] = useState<{ articles: NewsArticle[]; categories: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/news?siteId=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => alive && setData({ articles: d.articles || [], categories: d.categories || [] }))
      .catch(() => alive && setError(t("Kunde inte hämta nyheterna.")));
    return () => { alive = false; };
  }, [siteId]);

  if (error) return <p className="text-[13px] text-red-600">{error}</p>;
  if (!data) return <p className="text-[13px] text-ink-dim">{t("Hämtar …")}</p>;
  return <NewsClient initialArticles={data.articles} initialCategories={data.categories} siteId={siteId} />;
}
