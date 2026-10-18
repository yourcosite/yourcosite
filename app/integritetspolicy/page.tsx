import { rich } from "@/lib/i18n/rich";
import { getT } from "@/lib/i18n/server";
import LegalLayout from "@/components/LegalLayout";

// Innehållet här är hämtat direkt från "Juridik för YourCoSite" (det
// juridiska mall-dokumentet) — Integritetspolicy + Cookiepolicy. OBS: det
// är fortfarande mallar baserade på svensk/EU-rättslig standardpraxis
// (GDPR m.fl.), inte juridisk rådgivning — tänkt att granskas av en
// jurist innan tjänsten går live på riktigt.
export default function Page() {
  const t = getT();
  return (
    <LegalLayout
      title={t("Integritetspolicy")}
      updated="2026-10-10"
      intro={
        <>
          {t("Detta är mallar baserade på svensk och EU-rättslig standardpraxis (GDPR m.fl.) — inte juridisk rådgivning. CS Kommunikationsbyrå AB granskar och uppdaterar denna policy löpande.")}
        </>
      }
    >
      <h2>{t("Integritetspolicy")}</h2>

      <h3>{t("1. Personuppgiftsansvarig")}</h3>
      <p>
        {rich(
          t,
          "CS Kommunikationsbyrå AB, org.nr 5592612120, Rördromsvägen 3, 591 74 Borensberg, är personuppgiftsansvarig för de personuppgifter som behandlas inom YourCoSite. Kontakta oss på <mail>dataskydd@yourcosite.com</mail> vid frågor.",
          { mail: (c) => <a href="mailto:dataskydd@yourcosite.com">{c}</a> }
        )}
      </p>

      <h3>{t("2. Vilka uppgifter vi samlar in")}</h3>
      <table>
        <thead>
          <tr>
            <th>{t("Kategori")}</th>
            <th>{t("Exempel")}</th>
            <th>{t("Källa")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("Kontouppgifter")}</td>
            <td>{t("Namn, e-post, telefon, företag")}</td>
            <td>{t("Kunden själv vid registrering")}</td>
          </tr>
          <tr>
            <td>{t("Betalningsuppgifter")}</td>
            <td>
              {t("Faktureringsadress, betalhistorik (kortnummer lagras av Stripe, aldrig av oss)")}
            </td>
            <td>{t("Betallösning (Stripe)")}</td>
          </tr>
          <tr>
            <td>{t("Innehåll på kundens sajt")}</td>
            <td>{t("Texter, bilder, sidstruktur")}</td>
            <td>{t("Kunden själv")}</td>
          </tr>
          <tr>
            <td>{t("Chatthistorik med Millie")}</td>
            <td>
              {t("Meddelanden Kunden skriver till assistenten Millie och hennes svar (de senaste 20 ändringarna), samt namn på bifogade filer")}
            </td>
            <td>{t("Kunden själv vid användning av redigeraren")}</td>
          </tr>
          <tr>
            <td>{t("Användningsdata")}</td>
            <td>{t("Inloggningar, ändringar, supportkontakter")}</td>
            <td>{t("Automatiskt vid användning")}</td>
          </tr>
          <tr>
            <td>{t("Besöksdata (webbanalys)")}</td>
            <td>{t("Sidvisningar, enhetstyp, ungefärlig plats")}</td>
            <td>{t("Cookies/analysverktyg, med samtycke")}</td>
          </tr>
        </tbody>
      </table>

      <p className="note">
        {rich(t, "<strong>Obs — inspirationsbilder:</strong> Skärmdumpar eller bilder som Kunden laddar upp under onboardingen som inspiration för sajtens stil och layout (inte avsedda att användas på sajten) räknas inte som innehåll på kundens sajt och sparas inte varaktigt — de raderas automatiskt ur lagringen så snart de använts för att styra sajtens design, och hamnar aldrig på kundens egen sajt eller någon annans.", { strong: (c) => <strong>{c}</strong> })}</p>

      <h3>{t("3. Så använder vi uppgifterna och rättslig grund")}</h3>
      <ul>
        <li>{rich(t, "För att leverera och administrera tjänsten — <strong>fullgörande av avtal</strong>", { strong: (c) => <strong>{c}</strong> })}
        </li>
        <li>{rich(t, "För fakturering och bokföring — <strong>rättslig förpliktelse</strong>", { strong: (c) => <strong>{c}</strong> })}
        </li>
        <li>{rich(t, "För support och felrättning — <strong>berättigat intresse</strong>", { strong: (c) => <strong>{c}</strong> })}
        </li>
        <li>{rich(t, "För marknadsföring (t.ex. nyhetsbrev) — <strong>samtycke</strong>, går alltid att återkalla", { strong: (c) => <strong>{c}</strong> })}</li>
        <li>{rich(t, "För analys av hur tjänsten används — <strong>samtycke</strong> via cookieinställningar", { strong: (c) => <strong>{c}</strong> })}</li>
      </ul>

      <h3>{t("4. Vem vi delar uppgifter med")}</h3>
      <p>
        {t("Vi delar uppgifter med underleverantörer (personuppgiftsbiträden) som hjälper oss leverera tjänsten: betallösning (Stripe), molnhosting/serverdrift, en AI-leverantör (Anthropic) som bearbetar de texter, bilder och dokument Kunden skickar till Millie och de uppgifter som behövs för att skapa och ändra webbplatsen, bildtjänsten Unsplash när Kunden söker och väljer stockbilder, och eventuella analys- eller supportverktyg. Alla biträden regleras av personuppgiftsbiträdesavtal (DPA). Vi säljer aldrig personuppgifter till tredje part.")}
      </p>

      <h3>{t("5. Överföring utanför EU/EES")}</h3>
      <p>
        {t("Om någon underleverantör behandlar data utanför EU/EES säkerställer vi lämpliga skyddsmekanismer, t.ex. EU-kommissionens standardavtalsklausuler (SCC).")}
      </p>

      <h3>{t("6. Lagringstid")}</h3>
      <p>
        {t("Kontouppgifter lagras så länge kontot är aktivt och raderas eller anonymiseras inom 12 månader efter avslutad prenumeration, om inte bokföringslagen kräver längre lagring (7 år för bokföringsunderlag).")}
      </p>

      <p>
        {t("Mikrofonknappen i redigeraren är valfri. När Kunden använder den sköts taligenkänningen av webbläsaren (t.ex. Google i Chrome, Apple i Safari, Microsoft i Edge), som kan skicka ljudet till sin egen leverantör för att göra om det till text. Vi tar inte emot eller sparar något ljud, bara den text som hamnar i meddelanderutan.")}
      </p>

      <p>
        {t("Chatthistoriken med Millie sparas bara för att Kunden ska kunna se sina senaste ändringar på olika enheter. Den innehåller de 20 senaste ändringarna, äldre meddelanden skrivs över löpande, och den raderas när sajten eller kontot raderas. Kunden bör inte skriva känsliga personuppgifter i chatten. Chatten kan ingå i den dataexport vi tillhandahåller på begäran.")}
      </p>

      <h3>{t("7. Kundens rättigheter")}</h3>
      <p>
        {rich(
          t,
          "Kunden har rätt att begära tillgång till, rättelse av, eller radering av sina personuppgifter, samt rätt till dataportabilitet och att invända mot viss behandling. Kontakta <mail>dataskydd@yourcosite.com</mail>. Kunden har också rätt att klaga hos en tillsynsmyndighet, i Sverige Integritetsskyddsmyndigheten (IMY).",
          { mail: (c) => <a href="mailto:dataskydd@yourcosite.com">{c}</a> }
        )}
      </p>

      <h3>{t("8. Säkerhet")}</h3>
      <p>
        {t("Vi använder kryptering (TLS) vid överföring, åtkomstbegränsningar och regelbundna säkerhetskopior för att skydda uppgifterna mot obehörig åtkomst, förlust eller förstörelse.")}
      </p>

      <h2>{t("Cookiepolicy")}</h2>

      <p>
        {t("En cookie är en liten textfil som sparas i din webbläsare. YourCoSite använder cookies enligt kategorierna nedan. Nödvändiga cookies kan inte stängas av eftersom tjänsten annars inte fungerar; övriga kategorier kräver aktivt samtycke innan de aktiveras, i enlighet med lagen om elektronisk kommunikation.")}
      </p>

      <table>
        <thead>
          <tr>
            <th>{t("Kategori")}</th>
            <th>{t("Syfte")}</th>
            <th>{t("Exempel")}</th>
            <th>{t("Kan stängas av")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t("Nödvändiga")}</td>
            <td>
              {t("Håller dig inloggad, kom ihåg kundvagn/formulär, säkerhet")}
            </td>
            <td>{t("Sessions-cookie, CSRF-skydd")}</td>
            <td>{t("Nej")}</td>
          </tr>
          <tr>
            <td>{t("Funktionella")}</td>
            <td>
              {t("Kom ihåg inställningar som språk och senaste redigerade sida")}
            </td>
            <td>{t("Språkval, UI-preferenser")}</td>
            <td>{t("Ja")}</td>
          </tr>
          <tr>
            <td>{t("Analys")}</td>
            <td>
              {t("Förstå hur besökare använder sajten för att förbättra den")}
            </td>
            <td>{t("Sidvisningar, anonymiserad trafikstatistik")}</td>
            <td>{t("Ja")}</td>
          </tr>
          <tr>
            <td>{t("Marknadsföring")}</td>
            <td>{t("Visa relevanta annonser och mäta kampanjer")}</td>
            <td>{t("Annonsnätverk, pixlar för retargeting")}</td>
            <td>{t("Ja")}</td>
          </tr>
        </tbody>
      </table>

      <h3>{t("Hantera samtycke")}</h3>
      <p>
        {t("Vid första besöket visas en cookiebanner där besökaren kan välja \"Acceptera alla\", \"Endast nödvändiga\" eller \"Hantera val\" för att välja per kategori. Valet går att ändra när som helst via en länk i sidfoten (\"Cookieinställningar\"). Samtycket sparas i 12 månader, därefter tillfrågas besökaren igen.")}
      </p>

      <h3>{t("Tredjepartscookies")}</h3>
      <p>
        {t("Om analys- eller marknadsföringsverktyg från tredje part (t.ex. Google Analytics, Meta) aktiveras på en kunds webbplats listas dessa specifikt i cookiebannerns detaljvy, med länk till leverantörens egen integritetspolicy.")}
      </p>
    </LegalLayout>
  );
}
