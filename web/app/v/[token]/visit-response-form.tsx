"use client";

import { useState } from "react";
import { respondToVisitToken } from "./actions";

export function VisitResponseForm({ token }: { token: string }) {
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(decision: "accept" | "decline") {
    setLoading(true);
    setErr(null);
    const res = await respondToVisitToken(token, decision);
    setLoading(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setDone(decision);
  }

  if (done) {
    return (
      <p className="rounded-lg bg-emerald-50 p-4 text-center text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        {done === "accept"
          ? "Thank you — this visit is on your schedule. Details are in your Care Ministry dashboard."
          : "You have declined. The coordinator may assign someone else."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {err ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {err === "already_answered"
            ? "This link was already used."
            : "This link is invalid or expired."}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={loading}
          onClick={() => submit("accept")}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Accept visit
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => submit("decline")}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
