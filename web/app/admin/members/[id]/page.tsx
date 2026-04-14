import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth";
import { adminUpdateMember } from "../../member-actions";
import { MMS_GATEWAYS } from "@/lib/mms-carriers";

export const metadata = { title: "Edit team account | Care Ministry" };

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!profile) {
    return <p className="text-sm text-cal-ink-muted">Profile not found.</p>;
  }

  const svc = createServiceClient();
  const { data: authUser, error: authErr } = await svc.auth.admin.getUserById(id);
  if (authErr || !authUser.user) {
    return <p className="text-sm text-cal-ink-muted">Auth user not found.</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cal-ink">Edit account</h1>
        <p className="mt-1 text-sm text-cal-ink-muted">Update profile fields and optionally set a new password.</p>
      </div>

      {sp.created === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Account created.
        </p>
      ) : null}
      {sp.saved === "1" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          Saved.
        </p>
      ) : null}
      {sp.error === "1" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Could not save changes.
        </p>
      ) : null}
      {sp.error === "last_admin" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          Cannot remove the last admin.
        </p>
      ) : null}
      {sp.error === "pw" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Password update failed.
        </p>
      ) : null}

      <div className="card-surface space-y-2 p-4 text-sm text-cal-ink-muted">
        <p>
          <span className="font-medium text-cal-ink">Email</span> (read-only): {authUser.user.email}
        </p>
      </div>

      <form action={adminUpdateMember} className="card-surface space-y-4 p-4">
        <input type="hidden" name="member_id" value={id} />
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Display name
          <input name="display_name" className="field" defaultValue={profile.display_name ?? ""} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Role
          <select name="role" className="field" defaultValue={profile.role}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Mobile (10 digits, US)
          <input name="phone_digits" className="field" defaultValue={profile.phone_digits ?? ""} inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Carrier (MMS gateway)
          <select name="mms_gateway_domain" className="field" defaultValue={profile.mms_gateway_domain ?? ""}>
            <option value="">Select carrier…</option>
            {MMS_GATEWAYS.map((g) => (
              <option key={`${g.domain}:${g.label}`} value={g.domain}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          Backup email
          <input type="email" name="contact_email" className="field" defaultValue={profile.contact_email ?? ""} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          New password (optional, 8+)
          <input type="password" name="new_password" className="field" autoComplete="new-password" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Save
          </button>
          <Link href="/admin/members" className="btn-secondary px-4 py-2 text-sm">
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}
