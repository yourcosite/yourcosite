import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Sidor som kräver att man är inloggad som kund.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/redigera",
  "/sidor",
  "/nyheter",
  "/installningar",
  "/fakturering",
  "/onboarding",
  "/bygger",
  "/forslag",
  "/webbplats",
];

// Sidor som kräver att man är inloggad som admin.
const ADMIN_PREFIXES = ["/admin"];
const ADMIN_LOGIN_PATH = "/admin/logga-in";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

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
      (path.startsWith("/admin/ekonomi") || path.startsWith("/admin/aktivitet")) &&
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
