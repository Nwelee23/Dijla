import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/driver", "/admin"];

/** Auth pages a signed-in user has no reason to sit on. */
const AUTH_ROUTES = ["/login", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Refreshes the auth cookie on every request and guards protected routes.
 * Called from src/proxy.ts (Next 16 renamed the middleware convention to proxy).
 *
 * The cookie plumbing is fiddly on purpose: Supabase may hand back a rotated
 * token, and that new cookie has to ride along on the response we actually
 * return. Returning a different response object — or a redirect built without
 * copying these cookies — silently logs the user out on the next request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser (not getSession) — this verifies the token with Supabase instead of
  // trusting whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    url.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";

    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
