import { createServiceClient } from "@/lib/supabase/service";
import { embedOne } from "@/lib/unwrap-embed";
import { VisitResponseForm } from "./visit-response-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Visit response | Care Ministry",
  robots: { index: false, follow: false },
};

export default async function VisitTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("visit_assignments")
    .select(
      `
      status,
      visit_requests (
        congregant_name,
        address,
        phone,
        preferred_times_text,
        prayer_requests,
        special_instructions,
        visit_window_start,
        visit_window_end
      )
    `,
    )
    .eq("response_token", token)
    .maybeSingle();

  if (!row) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-zinc-600 dark:text-zinc-400">
        Invalid or expired link.
      </main>
    );
  }

  const vr = embedOne(row.visit_requests as object) as {
    congregant_name: string;
    address: string;
    phone: string;
    preferred_times_text: string | null;
    prayer_requests: string | null;
    special_instructions: string | null;
    visit_window_start: string | null;
    visit_window_end: string | null;
  } | null;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Care Ministry visit
      </h1>
      {vr ? (
        <section className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Who: </span>
            {vr.congregant_name}
          </p>
          <p>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Where: </span>
            {vr.address}
          </p>
          <p>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Phone: </span>
            {vr.phone}
          </p>
          {vr.preferred_times_text ? (
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Preferred times:{" "}
              </span>
              {vr.preferred_times_text}
            </p>
          ) : null}
          {vr.visit_window_start ? (
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Window: </span>
              {new Date(vr.visit_window_start).toLocaleString()}
              {vr.visit_window_end
                ? ` – ${new Date(vr.visit_window_end).toLocaleString()}`
                : ""}
            </p>
          ) : null}
          {vr.prayer_requests ? (
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Prayer: </span>
              {vr.prayer_requests}
            </p>
          ) : null}
          {vr.special_instructions ? (
            <p>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Notes: </span>
              {vr.special_instructions}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8">
        {row.status === "pending" ? (
          <VisitResponseForm token={token} />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This request was already marked{" "}
            <span className="font-medium">{row.status}</span>.
          </p>
        )}
      </div>
    </main>
  );
}
