"use client";

import { useState } from "react";
import { submitVisitRequest } from "./actions";

export function VisitRequestForm() {
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorKey(null);
    const fd = new FormData(e.currentTarget);
    const res = await submitVisitRequest(fd);
    if (res.ok) {
      setState("success");
      e.currentTarget.reset();
    } else {
      setState("error");
      setErrorKey(res.error);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      {/* Honeypot: hidden from users, bots often fill it */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Request a pastoral visit
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        For hospital, homebound, nursing home, hospice, or similar needs. A coordinator
        will follow up and schedule a care team member.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Full name
        <input
          required
          name="congregant_name"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Address or facility
        <textarea
          required
          name="address"
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Phone
        <input
          required
          name="phone"
          type="tel"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Preferred visiting times
        <textarea
          name="preferred_times_text"
          rows={2}
          placeholder="e.g. Weekday afternoons, or Saturday mornings"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Visit window start (optional)
          <input
            type="datetime-local"
            name="visit_window_start"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Visit window end (optional)
          <input
            type="datetime-local"
            name="visit_window_end"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Prayer requests
        <textarea
          name="prayer_requests"
          rows={3}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Anything we should know
        <textarea
          name="special_instructions"
          rows={3}
          placeholder="Mobility, language, allergies, room number, etc."
          className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I agree the church may contact me about this visit request using the information
          above.
        </span>
      </label>

      {state === "success" ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Thank you. A coordinator will reach out soon.
        </p>
      ) : null}
      {state === "error" && errorKey ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
          {errorKey === "rate_limited"
            ? "Too many submissions from this network. Please try again later."
            : errorKey === "consent_required"
              ? "Please confirm contact consent."
              : errorKey === "missing_fields"
                ? "Name, address, and phone are required."
                : "Something went wrong. Please try again or call the church office."}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {state === "submitting" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
