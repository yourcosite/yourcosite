import LegalLayout from "@/components/LegalLayout";

// Innehållet här är hämtat direkt från "Juridik för YourCoSite" (det
// juridiska mall-dokumentet) — Integritetspolicy + Cookiepolicy. OBS: det
// är fortfarande mallar baserade på svensk/EU-rättslig standardpraxis
// (GDPR m.fl.), inte juridisk rådgivning — tänkt att granskas av en
// jurist innan tjänsten går live på riktigt.
export default function Page() {
  return (
    <LegalLayout
      title="Integritetspolicy"
      updated="2026-10-07"
      intro={
        <>
          Detta är mallar baserade på svensk och EU-rättslig standardpraxis
          (GDPR m.fl.) — inte juridisk rådgivning. CS Kommunikationsbyrå
          AB granskar och uppdaterar denna policy löpande.
        </>
      }
    >
      <h2>Integritetspolicy</h2>

      <h3>1. Personuppgiftsansvarig</h3>
      <p>
        CS Kommunikationsbyrå AB, org.nr 5592612120, Rördromsvägen 3, 591
        74 Borensberg, är personuppgiftsansvarig för de personuppgifter
        som behandlas inom YourCoSite. Kontakta oss på{" "}
        <a href="mailto:dataskydd@yourcosite.com">dataskydd@yourcosite.com</a>{" "}
        vid frågor.
      </p>

      <h3>2. Vilka uppgifter vi samlar in</h3>
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Exempel</th>
            <th>Källa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kontouppgifter</td>
            <td>Namn, e-post, telefon, företag</td>
            <td>Kunden själv vid registrering</td>
          </tr>
          <tr>
            <td>Betalningsuppgifter</td>
            <td>
              Faktureringsadress, betalhistorik (kortnummer lagras av
              Stripe, aldrig av oss)
            </td>
            <td>Betallösning (Stripe)</td>
          </tr>
          <tr>
            <td>Innehåll på kundens sajt</td>
            <td>Texter, bilder, sidstruktur</td>
            <td>Kunden själv</td>
          </tr>
          <tr>
            <td>Chatthistorik med Millie</td>
            <td>
              Meddelanden Kunden skriver till assistenten Millie och hennes
              svar (de senaste 20 ändringarna), samt namn på bifogade
              filer
            </td>
            <td>Kunden själv vid användning av redigeraren</td>
          </tr>
          <tr>
            <td>Användningsdata</td>
            <td>Inloggningar, ändringar, supportkontakter</td>
            <td>Automatiskt vid användning</td>
          </tr>
          <tr>
            <td>Besöksdata (webbanalys)</td>
            <td>Sidvisningar, enhetstyp, ungefärlig plats</td>
            <td>Cookies/analysverktyg, med samtycke</td>
          </tr>
        </tbody>
      </table>

      <p className="note">
        <strong>Obs — inspirationsbilder:</strong> Skärmdumpar eller
        bilder som Kunden laddar upp under onboardingen som inspiration
        för sajtens stil och layout (inte avsedda att användas på sajten)
        räknas inte som innehåll på kundens sajt och sparas inte
        varaktigt — de raderas automatiskt ur lagringen så snart de
        använts för att styra sajtens design, och hamnar aldrig på
        kundens egen sajt eller någon annans.
      </p>

      <h3>3. Så använder vi uppgifterna och rättslig grund</h3>
      <ul>
        <li>
          För att leverera och administrera tjänsten —{" "}
          <strong>fullgörande av avtal</strong>
        </li>
        <li>
          För fakturering och bokföring —{" "}
          <strong>rättslig förpliktelse</strong>
        </li>
        <li>
          För support och felrättning — <strong>berättigat intresse</strong>
        </li>
        <li>
          För marknadsföring (t.ex. nyhetsbrev) — <strong>samtycke</strong>,
          går alltid att återkalla
        </li>
        <li>
          För analys av hur tjänsten används — <strong>samtycke</strong> via
          cookieinställningar
        </li>
      </ul>

      <h3>4. Vem vi delar uppgifter med</h3>
      <p>
        Vi delar uppgifter med underleverantörer (personuppgiftsbiträden)
        som hjälper oss leverera tjänsten: betallösning (Stripe),
        molnhosting/serverdrift, en AI-leverantör (Anthropic) som
        bearbetar de texter, bilder och dokument Kunden skickar till Millie
        och de uppgifter som behövs för att skapa och ändra webbplatsen,
        bildtjänsten Unsplash när Kunden söker och väljer stockbilder, och
        eventuella analys- eller supportverktyg. Alla biträden regleras av
        personuppgiftsbiträdesavtal (DPA). Vi säljer aldrig
        personuppgifter till tredje part.
      </p>

      <h3>5. Överföring utanför EU/EES</h3>
      <p>
        Om någon underleverantör behandlar data utanför EU/EES
        säkerställer vi lämpliga skyddsmekanismer, t.ex.
        EU-kommissionens standardavtalsklausuler (SCC).
      </p>

      <h3>6. Lagringstid</h3>
      <p>
        Kontouppgifter lagras så länge kontot är aktivt och raderas eller
        anonymiseras inom 12 månader efter avslutad prenumeration, om
        inte bokföringslagen kräver längre lagring (7 år för
        bokföringsunderlag).
      </p>

      <p>
        Chatthistoriken med Millie sparas bara för att Kunden ska kunna se
        sina senaste ändringar på olika enheter. Den innehåller de 20
        senaste ändringarna, äldre meddelanden skrivs över löpande, och den
        raderas när sajten eller kontot raderas. Kunden bör inte skriva
        känsliga personuppgifter i chatten. Chatten kan ingå i den
        dataexport vi tillhandahåller på begäran.
      </p>

      <h3>7. Kundens rättigheter</h3>
      <p>
        Kunden har rätt att begära tillgång till, rättelse av, eller
        radering av sina personuppgifter, samt rätt till dataportabilitet
        och att invända mot viss behandling. Kontakta{" "}
        <a href="mailto:dataskydd@yourcosite.com">dataskydd@yourcosite.com</a>
        . Kunden har också rätt att klaga till Integritetsskyddsmyndigheten
        (IMY).
      </p>

      <h3>8. Säkerhet</h3>
      <p>
        Vi använder kryptering (TLS) vid överföring, åtkomstbegränsningar
        och regelbundna säkerhetskopior för att skydda uppgifterna mot
        obehörig åtkomst, förlust eller förstörelse.
      </p>

      <h2>Cookiepolicy</h2>

      <p>
        En cookie är en liten textfil som sparas i din webbläsare.
        YourCoSite använder cookies enligt kategorierna nedan. Nödvändiga
        cookies kan inte stängas av eftersom tjänsten annars inte
        fungerar; övriga kategorier kräver aktivt samtycke innan de
        aktiveras, i enlighet med lagen om elektronisk kommunikation.
      </p>

      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Syfte</th>
            <th>Exempel</th>
            <th>Kan stängas av</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nödvändiga</td>
            <td>
              Håller dig inloggad, kom ihåg kundvagn/formulär, säkerhet
            </td>
            <td>Sessions-cookie, CSRF-skydd</td>
            <td>Nej</td>
          </tr>
          <tr>
            <td>Funktionella</td>
            <td>
              Kom ihåg inställningar som språk och senaste redigerade
              sida
            </td>
            <td>Språkval, UI-preferenser</td>
            <td>Ja</td>
          </tr>
          <tr>
            <td>Analys</td>
            <td>
              Förstå hur besökare använder sajten för att förbättra den
            </td>
            <td>Sidvisningar, anonymiserad trafikstatistik</td>
            <td>Ja</td>
          </tr>
          <tr>
            <td>Marknadsföring</td>
            <td>Visa relevanta annonser och mäta kampanjer</td>
            <td>Annonsnätverk, pixlar för retargeting</td>
            <td>Ja</td>
          </tr>
        </tbody>
      </table>

      <h3>Hantera samtycke</h3>
      <p>
        Vid första besöket visas en cookiebanner där besökaren kan välja
        &quot;Acceptera alla&quot;, &quot;Endast nödvändiga&quot; eller
        &quot;Hantera val&quot; för att välja per kategori. Valet går att
        ändra när som helst via en länk i sidfoten
        (&quot;Cookieinställningar&quot;). Samtycket sparas i 12 månader,
        därefter tillfrågas besökaren igen.
      </p>

      <h3>Tredjepartscookies</h3>
      <p>
        Om analys- eller marknadsföringsverktyg från tredje part (t.ex.
        Google Analytics, Meta) aktiveras på en kunds webbplats listas
        dessa specifikt i cookiebannerns detaljvy, med länk till
        leverantörens egen integritetspolicy.
      </p>
    </LegalLayout>
  );
}
