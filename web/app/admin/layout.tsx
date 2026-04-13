import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Admin — matching
        </h1>
        <Link
          href="/admin"
          className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
        >
          All requests
        </Link>
      </div>
      {children}
    </div>
  );
}
