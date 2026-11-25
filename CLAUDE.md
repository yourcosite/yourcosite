# YourCoSite: arbetsregler

## När vi bygger eller ändrar något kundvänt

1. Startsidan och funktionssidan: lägg in funktionen i `lib/marketingFeatures.ts`
   (och i `homeFeatureIcons` om den är bland de viktigaste). Ta bort sådant som
   inte längre stämmer.
2. Demon (/demo): kontrollera att funktionen går att prova. Nya API-vägar som
   redigeraren anropar måste in i listan i `app/api/demo/proxy/route.ts`
   (de som kräver AI eller utskick ska INTE dit). Demosajten ligger i
   `lib/demoSite.ts`; lägg in exempelinnehåll där när en ny sektionstyp tillkommer.
3. Nytt-rutan: ny post överst i `lib/whatsNew.ts`.
4. Ändras något synligt i redigeraren (flyttad knapp, ny meny): lägg en post i
   `lib/uiPins.ts` och en `<NewPin />` på det ändrade stället. Pinnen visas bara
   för kunder vars sajt skapades före ändringen.
5. Stor förändring av redigerarens UI: bygg i en gren och låt CS granska innan
   den går till `main`.

## Övrigt
- Språk i UI: svenska, alla texter via `t()` / `msg()`.
- Kör `npx tsc --noEmit` före push. Deploy sker från `main`.
