import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { MMS_GATEWAYS } from "@/lib/mms-carriers";
import { updateProfile } from "../actions";

export const metadata = { title: "Profile | Care Ministry" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Profile and MMS gateway
      </h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Your mobile number is sent as email to the carrier gateway (no Twilio). Add a backup
        email if texts sometimes fail.
      </p>

      {params.saved === "1" ? (
        <p
          className="mt-6 max-w-xl rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
          role="status"
        >
          Your profile was saved successfully.
        </p>
      ) : null}
      {params.error === "1" ? (
        <p
          className="mt-6 max-w-xl rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          We couldn&apos;t save your profile. Please try again.
        </p>
      ) : null}

      <form action={updateProfile} className="mt-8 max-w-xl space-y-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Display name
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Mobile (10 digits, US)
          <input
            name="phone_digits"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="5551234567"
            defaultValue={profile?.phone_digits ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Carrier (MMS / SMS gateway)
          <select
            name="mms_gateway_domain"
            defaultValue={profile?.mms_gateway_domain ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Select carrier…</option>
            {MMS_GATEWAYS.map((g) => (
              <option key={`${g.domain}:${g.label}`} value={g.domain}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Backup email (optional)
          <input
            type="email"
            name="contact_email"
            autoComplete="email"
            defaultValue={profile?.contact_email ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save
        </button>
      </form>
    </div>
  );
}
