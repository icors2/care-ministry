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
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Care Ministry
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/request-visit" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Request a visit
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Dashboard
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  Admin
                </Link>
              ) : null}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Care team login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
