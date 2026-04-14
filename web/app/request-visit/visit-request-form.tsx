"use client";

import { useMemo, useState } from "react";
import { submitVisitRequest } from "./actions";

const DAYS = [
  { idx: 0, label: "Sunday" },
  { idx: 1, label: "Monday" },
  { idx: 2, label: "Tuesday" },
  { idx: 3, label: "Wednesday" },
  { idx: 4, label: "Thursday" },
  { idx: 5, label: "Friday" },
  { idx: 6, label: "Saturday" },
] as const;

type DayBits = { on: boolean; morning: boolean; afternoon: boolean; evening: boolean };

function emptyDays(): DayBits[] {
  return Array.from({ length: 7 }, () => ({
    on: false,
    morning: false,
    afternoon: false,
    evening: false,
  }));
}

function buildPreferredText(days: DayBits[], extraNotes: string): string {
  const lines: string[] = ["Preferred days & times (from form):"];
  for (const d of DAYS) {
    const st = days[d.idx]!;
    if (!st.on) continue;
    const slots: string[] = [];
    if (st.morning) slots.push("Morning");
    if (st.afternoon) slots.push("Afternoon");
    if (st.evening) slots.push("Evening");
    const slotText = slots.length ? slots.join(", ") : "flexible / any time";
    lines.push(`${d.label}: ${slotText}`);
  }
  if (extraNotes.trim()) {
    lines.push("");
    lines.push(extraNotes.trim());
  }
  return lines.join("\n");
}

export function VisitRequestForm() {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [timingMode, setTimingMode] = useState<"preferred_slots" | "specific_windows">("preferred_slots");
  const [recurring, setRecurring] = useState(true);
  const [days, setDays] = useState<DayBits[]>(() => emptyDays());
  const [preferredNotes, setPreferredNotes] = useState("");
  const [windows, setWindows] = useState<{ start: string; end: string }[]>([{ start: "", end: "" }]);
  const [windowNotes, setWindowNotes] = useState("");

  const canSubmitPreferred = useMemo(() => {
    return days.some((d) => d.on) || preferredNotes.trim().length > 0;
  }, [days, preferredNotes]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("submitting");
    setErrorKey(null);
    const fd = new FormData(form);

    fd.set("intake_timing_mode", timingMode);
    fd.set("visit_timing_recurring", recurring ? "true" : "false");

    if (timingMode === "preferred_slots") {
      if (!canSubmitPreferred) {
        setState("error");
        setErrorKey("timing_required");
        return;
      }
      fd.set("preferred_times_text", buildPreferredText(days, preferredNotes));
      fd.set("intake_visit_windows_json", "[]");
      fd.delete("visit_window_start");
      fd.delete("visit_window_end");
    } else {
      const cleaned = windows.filter((w) => w.start && w.end);
      if (!cleaned.length) {
        setState("error");
        setErrorKey("timing_required");
        return;
      }
      fd.set(
        "intake_visit_windows_json",
        JSON.stringify(cleaned.map((w) => ({ start: new Date(w.start).toISOString(), end: new Date(w.end).toISOString() }))),
      );
      if (windowNotes.trim()) {
        fd.set("preferred_times_text", windowNotes.trim());
      } else {
        fd.delete("preferred_times_text");
      }
    }

    const res = await submitVisitRequest(fd);
    if (res.ok) {
      setState("success");
      form.reset();
      setDays(emptyDays());
      setPreferredNotes("");
      setWindows([{ start: "", end: "" }]);
      setWindowNotes("");
    } else {
      setState("error");
      setErrorKey(res.error);
    }
  }

  function toggleDay(idx: number, on: boolean) {
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, on };
      return next;
    });
  }

  function toggleSlot(idx: number, key: keyof Pick<DayBits, "morning" | "afternoon" | "evening">) {
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, [key]: !next[idx]![key] };
      return next;
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card-surface mx-auto flex max-w-xl flex-col gap-4 p-6"
    >
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <h1 className="text-2xl font-semibold text-cal-ink">Request a pastoral visit</h1>
      <p className="text-sm text-cal-ink-muted">
        For hospital, homebound, nursing home, hospice, or similar needs. A coordinator will follow up and
        schedule a care team member.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
        Full name
        <input required name="congregant_name" className="field text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
        Address or facility
        <textarea required name="address" rows={2} className="field text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
        Phone
        <input required name="phone" type="tel" className="field text-base" />
      </label>

      <fieldset className="space-y-3 rounded-lg border border-cal-border p-3">
        <legend className="px-1 text-sm font-semibold text-cal-ink">Timing</legend>
        <p className="text-sm text-cal-ink-muted">
          <span className="font-medium text-cal-ink">General preferred days & times</span> is best when you
          think in terms of mornings, afternoons, or evenings across the week.{" "}
          <span className="font-medium text-cal-ink">Specific visit windows</span> is best when you know exact
          start/end times (you can add more than one).
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
          How should we use your timing?
          <select
            className="field"
            value={timingMode}
            onChange={(e) => setTimingMode(e.target.value as "preferred_slots" | "specific_windows")}
          >
            <option value="preferred_slots">General preferred days & times</option>
            <option value="specific_windows">Specific visit date & time windows</option>
          </select>
        </label>

        <div className="space-y-2 text-sm text-cal-ink-muted">
          <p className="font-medium text-cal-ink">Time-of-day bands (general option)</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Morning: about 8:00 a.m. – 12:00 p.m.</li>
            <li>Afternoon: about 12:00 p.m. – 5:00 p.m.</li>
            <li>Evening: about 5:00 p.m. – 9:00 p.m.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-cal-ink">Timing pattern</p>
          <label className="flex items-center gap-2 text-sm text-cal-ink-muted">
            <input type="radio" name="visit_timing_recurring_ui" checked={recurring} onChange={() => setRecurring(true)} />
            Ongoing / recurring
          </label>
          <label className="flex items-center gap-2 text-sm text-cal-ink-muted">
            <input type="radio" name="visit_timing_recurring_ui" checked={!recurring} onChange={() => setRecurring(false)} />
            One-time — only for the week of this request
          </label>
        </div>
      </fieldset>

      {timingMode === "preferred_slots" ? (
        <fieldset className="space-y-3 rounded-lg border border-cal-border p-3">
          <legend className="px-1 text-sm font-semibold text-cal-ink">Preferred visiting times</legend>
          <p className="text-sm text-cal-ink-muted">
            Select days, then choose morning / afternoon / evening for each day you enable.
          </p>
          <div className="space-y-3">
            {DAYS.map((d) => (
              <div key={d.idx} className="rounded-lg border border-cal-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-cal-ink">
                  <input
                    type="checkbox"
                    checked={days[d.idx]!.on}
                    onChange={(e) => toggleDay(d.idx, e.target.checked)}
                  />
                  {d.label}
                </label>
                {days[d.idx]!.on ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-cal-ink-muted">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={days[d.idx]!.morning}
                        onChange={() => toggleSlot(d.idx, "morning")}
                      />
                      Morning
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={days[d.idx]!.afternoon}
                        onChange={() => toggleSlot(d.idx, "afternoon")}
                      />
                      Afternoon
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={days[d.idx]!.evening}
                        onChange={() => toggleSlot(d.idx, "evening")}
                      />
                      Evening
                    </label>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
            Additional timing notes (optional)
            <textarea
              rows={2}
              value={preferredNotes}
              onChange={(e) => setPreferredNotes(e.target.value)}
              className="field text-base"
              placeholder="e.g. not before 10 a.m. on weekdays"
            />
          </label>
        </fieldset>
      ) : (
        <fieldset className="space-y-3 rounded-lg border border-cal-border p-3">
          <legend className="px-1 text-sm font-semibold text-cal-ink">Specific visit windows</legend>
          {windows.map((w, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                Start
                <input
                  type="datetime-local"
                  className="field"
                  value={w.start}
                  onChange={(e) =>
                    setWindows((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i]!, start: e.target.value };
                      return n;
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
                End
                <input
                  type="datetime-local"
                  className="field"
                  value={w.end}
                  onChange={(e) =>
                    setWindows((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i]!, end: e.target.value };
                      return n;
                    })
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => setWindows((prev) => [...prev, { start: "", end: "" }])}
          >
            Add another time
          </button>
          <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
            Notes about these windows (optional)
            <textarea
              rows={2}
              className="field text-base"
              value={windowNotes}
              onChange={(e) => setWindowNotes(e.target.value)}
            />
          </label>
        </fieldset>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
        Prayer requests
        <textarea name="prayer_requests" rows={3} className="field text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-cal-ink">
        Anything we should know
        <textarea
          name="special_instructions"
          rows={3}
          placeholder="Mobility, language, allergies, room number, etc."
          className="field text-base"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-cal-ink-muted">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>I agree the church may contact me about this visit request using the information above.</span>
      </label>

      {state === "success" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Thank you. A coordinator will reach out soon.
        </p>
      ) : null}
      {state === "error" && errorKey ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {errorKey === "rate_limited"
            ? "Too many submissions from this network. Please try again later."
            : errorKey === "consent_required"
              ? "Please confirm contact consent."
              : errorKey === "missing_fields"
                ? "Name, address, and phone are required."
                : errorKey === "timing_required"
                  ? "Please complete your timing selection for the option you chose."
                  : "Something went wrong. Please try again or call the church office."}
        </p>
      ) : null}

      <button type="submit" disabled={state === "submitting"} className="btn-primary disabled:opacity-60">
        {state === "submitting" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
