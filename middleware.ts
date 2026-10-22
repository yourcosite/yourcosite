import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale, isLocalizedPath, localizedPath, matchLocale, splitLocalePrefix } from "@/lib/i18n/config";

// Sidor som kräver att man är inloggad som kund.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/redigera",
  "/sidor",
  "/nyheter",
  "/bokningar",
  "/installningar",
  "/fakturering",
  "/onboarding",
  "/bygger",
  "/forslag",
  "/webbplats",
  "/forhandsgranska",
];

// Sidor som kräver att man är inloggad som admin.
const ADMIN_PREFIXES = ["/admin"];
const ADMIN_LOGIN_PATH = "/admin/logga-in";

export async function middleware(request: NextRequest) {
  // Språk. Har adressen ett språkprefix (/en/priser) gäller det och skrivs om
  // internt till /priser. Annars vinner kakan (besökarens eget val), sedan
  // webbläsarens språk. Språket skickas vidare som rubrik så att även allra
  // första sidvisningen (innan någon kaka finns) renderas på rätt språk.
  const originalPath = request.nextUrl.pathname;
  const split = splitLocalePrefix(originalPath);
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  if (split.locale === DEFAULT_LOCALE || (split.locale && !isLocalizedPath(split.rest))) {
    // /sv/... och prefix på sidor som inte ska ha något: till adressen utan prefix.
    const url = request.nextUrl.clone();
    url.pathname = split.rest;
    const redirect = NextResponse.redirect(url);
    if (split.locale === DEFAULT_LOCALE) {
      redirect.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return redirect;
  }

  const locale = split.locale ?? (isLocale(savedLocale) ? savedLocale : matchLocale(request.headers.get("accept-language")));

  // Besökare som valt ett annat språk än svenska hör hemma på prefixadressen.
  if (!split.locale && locale !== DEFAULT_LOCALE && isLocalizedPath(originalPath) && (request.method === "GET" || request.method === "HEAD")) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(originalPath, locale);
    return NextResponse.redirect(url);
  }

  const effectivePath = split.locale ? split.rest : originalPath;
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set(LOCALE_HEADER, locale);
  if (isLocalizedPath(effectivePath)) forwardHeaders.set("x-ycs-route", effectivePath);
  const rewriteUrl = split.locale ? request.nextUrl.clone() : null;
  if (rewriteUrl) rewriteUrl.pathname = effectivePath;
  const makeResponse = () =>
    rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: forwardHeaders } })
      : NextResponse.next({ request: { headers: forwardHeaders } });

  let response = makeResponse();
  if (savedLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          if (savedLocale !== locale) {
            response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = effectivePath;

  const isAdminPath =
    ADMIN_PREFIXES.some((p) => path.startsWith(p)) && path !== ADMIN_LOGIN_PATH;
  const isProtectedPath = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isAdminPath) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN_PATH;
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role;
    const isStaff = role === "support" || role === "admin" || role === "superadmin";

    if (!isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (path.startsWith("/admin/team") && role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    if (
      (path.startsWith("/admin/ekonomi") || path.startsWith("/admin/aktivitet") || path.startsWith("/admin/fel") || path.startsWith("/admin/ai-kostnad")) &&
      role === "support"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  } else if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/logga-in";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
