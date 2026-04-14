import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminCreateUser } from "../../member-actions";
export const metadata = { title: "New team account | Care Ministry" };

export default async function AdminNewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cal-ink">Create account</h1>
        <p className="mt-1 text-sm text-cal-ink-muted">
          Creates a Supabase user with email confirmed so they can sign in immediately.
        </p>
      </div>

      {sp.error === "1" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Could not create the user. Check the email is unique and the password is at least 8 characters.
        </p>
      ) : null}

      <form action={adminCreateUser} className="card-surface space-y-4 p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Email
          <input required type="email" name="email" className="field" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Password (8+ characters)
          <input required type="password" name="password" className="field" autoComplete="new-password" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Display name (optional)
          <input name="display_name" className="field" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Role
          <select name="role" className="field" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <p className="text-xs text-cal-ink-muted">
          After creation you can set phone, carrier, and backup email on the member&apos;s profile page.
        </p>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Create account
          </button>
          <Link href="/admin/members" className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
