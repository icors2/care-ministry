import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <nav className="flex flex-wrap gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/dashboard">
          Overview
        </Link>
        <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/dashboard/profile">
          Profile and MMS
        </Link>
        <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/dashboard/availability">
          Availability
        </Link>
        <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/dashboard/visits">
          Visit log
        </Link>
      </nav>
      {children}
    </div>
  );
}
