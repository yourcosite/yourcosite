import LegalLayout from "@/components/LegalLayout";

// Innehållet här är hämtat direkt från "Juridik för YourCoSite" (det
// juridiska mall-dokumentet) — Användarvillkor + Prenumerationsvillkor.
// OBS: det är fortfarande mallar baserade på svensk/EU-rättslig
// standardpraxis, inte juridisk rådgivning — tänkt att granskas av en
// jurist innan tjänsten går live på riktigt.
export default function Page() {
  return (
    <LegalLayout
      title="Användarvillkor"
      updated="2026-10-06"
      intro={
        <>
          Detta är mallar baserade på svensk och EU-rättslig standardpraxis
          (GDPR, e-handelslagen, distansavtalslagen) — inte juridisk
          rådgivning. CS Kommunikationsbyrå AB granskar och uppdaterar
          dessa villkor löpande.
        </>
      }
    >
      <h2>Användarvillkor</h2>

      <h3>1. Parter och avtal</h3>
      <p>
        Dessa villkor gäller mellan CS Kommunikationsbyrå AB, org.nr
        5592612120 (&quot;YourCoSite&quot;, &quot;vi&quot;) och den fysiska
        eller juridiska person som registrerar ett konto (&quot;Kunden&quot;,
        &quot;du&quot;). Genom att skapa ett konto godkänner du dessa
        villkor.
      </p>

      <h3>2. Tjänsten</h3>
      <p>
        YourCoSite är en webbaserad tjänst som låter Kunden skapa och
        publicera en egen webbplats med hjälp av AI-assisterad design och
        textgenerering. Tjänsten tillhandahålls i befintligt skick och vi
        arbetar löpande med att förbättra funktionalitet och
        tillgänglighet, men garanterar inte att tjänsten är fri från
        avbrott eller fel.
      </p>

      <h3>3. Konto och ansvar</h3>
      <p>
        Kunden ansvarar för att uppgifterna i kontot är korrekta samt för
        att lösenord och inloggningsuppgifter hålls hemliga. Kunden
        ansvarar för allt innehåll som läggs in på den egna webbplatsen,
        inklusive att det inte strider mot lag, tredje parts rättigheter
        (t.ex. upphovsrätt och varumärken) eller god sed.
      </p>

      <h3>4. Innehåll som laddas upp</h3>
      <p>
        Kunden intygar att man har rätt att använda allt innehåll (text,
        bilder, logotyper m.m.) som laddas upp i tjänsten. YourCoSite
        genererar inte egna bilder åt kunden av upphovsrättsskäl — se
        avsnittet om innehållsgenerering i produkten.
      </p>

      <h3>5. Innehåll som skapats med AI</h3>
      <p>
        Tjänsten använder AI för att föreslå och skriva texter, rubriker,
        layouter och exempelinnehåll. Sådant innehåll är förslag, inte
        garanterade fakta. Det kan innehålla fel, och exempelinnehåll
        såsom kundcitat, nyckeltal, statistik, priser och vanliga frågor
        är påhittade platshållare som visar vad som är möjligt på en
        webbplats. Kunden ansvarar för att granska allt innehåll innan
        publicering och att byta ut eller ta bort sådant som inte stämmer
        för den egna verksamheten. Kunden bär ansvaret för allt innehåll
        på den publicerade webbplatsen, oavsett om det skrivits av Kunden
        eller skapats av AI, inklusive att det inte är vilseledande eller
        i strid med marknadsföringslagen, konsumentlagstiftning, upphovsrätt
        eller tredje parts rättigheter. YourCoSite ansvarar inte för
        skador som uppstår av att AI-skapat innehåll publicerats utan
        granskning.
      </p>

      <h3>6. Immateriella rättigheter</h3>
      <p>
        Kunden äger innehållet på sin egen webbplats. YourCoSite och CS
        Kommunikationsbyrå AB äger plattformen, koden, designsystemet och
        varumärket YourCoSite. Inget i dessa villkor överför äganderätt
        till plattformen till Kunden.
      </p>

      <h3>7. Ansvarsbegränsning</h3>
      <p>
        YourCoSite ansvarar inte för indirekta skador, förlorad data,
        förlorad omsättning eller affärsavbrott som uppstår genom
        användning av tjänsten, i den mån det är tillåtet enligt
        tillämplig lag. Vårt sammanlagda ansvar är begränsat till vad
        Kunden betalat under de senaste 12 månaderna.
      </p>

      <h3>8. Uppsägning och avstängning</h3>
      <p>
        Vi förbehåller oss rätten att stänga av eller avsluta ett konto
        som bryter mot dessa villkor, används för olaglig verksamhet,
        eller inte betalar avgifter i tid, efter skälig varseltid om inte
        omedelbar åtgärd krävs.
      </p>

      <h3>9. Ändringar av villkoren</h3>
      <p>
        Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas via
        e-post eller i tjänsten minst 30 dagar innan de träder i kraft.
        Fortsatt användning efter ändringsdatumet innebär godkännande.
      </p>

      <h3>10. Tillämplig lag</h3>
      <p>
        Svensk lag tillämpas på dessa villkor. Tvister ska i första hand
        lösas genom förhandling, i andra hand av svensk allmän domstol med
        Linköpings tingsrätt som första instans.
      </p>

      <h2>Prenumerationsvillkor</h2>

      <h3>1. Prenumerationsperiod och uppsägningstid</h3>
      <p>
        YourCoSite säljs tillsvidare med en löpande uppsägningstid om 3
        månader. Det finns inga fasta kvartalsperioder — uppsägningstiden
        räknas i stället från den dag Kunden faktiskt säger upp
        prenumerationen och flyttas därmed kontinuerligt framåt månad för
        månad så länge prenumerationen är aktiv. Säger Kunden upp i
        början av januari upphör tjänsten i slutet av mars; säger Kunden i
        stället upp i början av februari upphör tjänsten i slutet av april
        — alltså alltid tre månader från uppsägningstillfället. Betalning
        dras automatiskt varje månad via det betalkort eller den
        betalmetod Kunden registrerat, även under uppsägningstiden.
      </p>

      <h3>2. Priser och avgifter</h3>
      <p>
        Aktuella priser anges i tjänsten och på yourcosite.se. Priser kan
        ändras med minst 30 dagars varsel via e-post; ändringen gäller
        från nästa förnyelseperiod. Alla priser anges inklusive svensk
        moms om inte annat anges.
      </p>

      <h3>3. Betalning</h3>
      <p>
        Betalning hanteras av vår betallösningspartner (Stripe). Vid
        utebliven betalning försöker vi dra beloppet igen automatiskt
        under några dagar. Om betalningen fortfarande misslyckas kan
        kontot stängas av, med förvarning via e-post.
      </p>

      <h3>4. Ångerrätt</h3>
      <p>
        Om Kunden är en privatperson (konsument) gäller 14 dagars
        ångerrätt enligt lagen om distansavtal och avtal utanför
        affärslokaler, räknat från registreringsdatumet. Ångerrätten
        gäller inte företagskunder (B2B). Genom att börja använda tjänsten
        aktivt (t.ex. publicera en sajt) innan ångerfristen löpt ut
        godkänner Kunden att tjänsten påbörjats, vilket kan påverka rätten
        till full återbetalning.
      </p>

      <h3>5. Uppsägning</h3>
      <p>
        Kunden kan säga upp sin prenumeration när som helst via
        konto-inställningarna. Från uppsägningsdagen löper tjänsten vidare
        i ytterligare 3 månader (se punkt 1 ovan för hur slutdatumet
        räknas ut), och betalning dras som vanligt under den tiden. Ingen
        återbetalning sker för redan dragna betalningar. Webbplatsen och
        dess innehåll blir otillgängliga för besökare när
        uppsägningstiden löpt ut, men Kunden kan exportera sitt innehåll
        inom 30 dagar därefter. Exakt slutdatum visas alltid under
        &quot;Fakturering&quot; i kundzonen så snart uppsägning
        registrerats.
      </p>

      <h3>6. Ändring av nivå (uppgradering/nedgradering)</h3>
      <p>
        Byte mellan prisnivåer sker omedelbart. Vid uppgradering debiteras
        mellanskillnaden för kvarvarande period; vid nedgradering gäller
        den lägre nivån från nästa betalningsperiod.
      </p>

      <h3>7. Testperiod</h3>
      <p>
        Om en kostnadsfri testperiod erbjuds övergår den automatiskt till
        en betald prenumeration vid testperiodens slut, om inte Kunden
        säger upp innan dess. Vi skickar en påminnelse via e-post några
        dagar innan övergången.
      </p>
    </LegalLayout>
  );
}
