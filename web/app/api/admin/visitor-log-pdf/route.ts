import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { requireAdminApi } from "@/lib/admin-route";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { data } = await gate.supabase
    .from("visit_assignments")
    .select(
      `
      id,
      status,
      created_at,
      accepted_at,
      post_visit_notes,
      visit_requests ( congregant_name, address ),
      profiles ( display_name )
    `,
    )
    .order("created_at", { ascending: false });

  const body: string[][] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown> & {
      visit_requests?: { congregant_name?: string; address?: string } | null;
      profiles?: { display_name?: string | null } | { display_name?: string | null }[] | null;
    };
    const vr = Array.isArray(r.visit_requests) ? r.visit_requests[0] : r.visit_requests;
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    body.push([
      new Date(String(r.created_at)).toLocaleString(),
      vr?.congregant_name ?? "",
      vr?.address ?? "",
      prof?.display_name ?? "",
      String(r.status ?? ""),
      String(r.post_visit_notes ?? ""),
    ]);
  }

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Care Ministry — Visitor log", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["When", "Congregant", "Address", "Assignee", "Status", "Notes"]],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 54, 93] },
  });

  const out = doc.output("arraybuffer");
  return new NextResponse(out, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="visitor-log.pdf"',
    },
  });
}
