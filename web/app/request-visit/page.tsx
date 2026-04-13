import { VisitRequestForm } from "./visit-request-form";

export const metadata = {
  title: "Request a visit | Care Ministry",
  description: "Submit a care ministry visitation request.",
};

export default function RequestVisitPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <VisitRequestForm />
    </main>
  );
}
