import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = p?.role === "admin";
  }

  return (
    <header className="border-b border-cal-border bg-gradient-to-r from-cal-primary to-[#234876] text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Care Ministry
          </Link>
          <p className="text-xs text-white/80">
            Calvary Baptist Church ·{" "}
            <a className="underline decoration-white/40 hover:decoration-white" href="https://calvaryeauclaire.org/">
              calvaryeauclaire.org
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/90">
          <Link href="/request-visit" className="hover:text-white">
            Request a visit
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-white">
                Dashboard
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="hover:text-white">
                  Admin
                </Link>
              ) : null}
              <form action="/auth/signout" method="post">
                <button type="submit" className="hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary px-3 py-2 text-xs text-[#0f172a]">
              Care team login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
