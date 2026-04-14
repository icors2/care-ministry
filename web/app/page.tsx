import Link from "next/link";

export default function Home() {
  return (
    <main className="relative mx-auto flex max-w-3xl flex-1 flex-col px-4 py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--cal-accent) 35%, transparent), transparent 45%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--cal-primary) 25%, transparent), transparent 40%)",
        }}
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-cal-ink">Care Ministry</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/request-visit" className="btn-primary px-5 py-3 text-sm">
            Request a visit
          </Link>
          <Link href="/login" className="btn-secondary px-5 py-3 text-sm">
            Care team login
          </Link>
        </div>
      </div>

      <article className="mt-10 space-y-6 text-cal-ink-muted">
        <header>
          <h2 className="text-xl font-semibold text-cal-ink">Calvary Baptist Church Care Ministry Statement</h2>
        </header>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-cal-ink">Our Mission</h3>
          <p className="leading-relaxed">
            The Care Ministry of Calvary Baptist Church exists to glorify God and make disciples of Jesus Christ by
            connecting with our church family during seasons of illness, isolation, and transition. Our mission is to
            &quot;Love Christ, love people; Serve Christ, serve people&quot; by providing a tangible presence of the
            Gospel to those in hospitals, nursing homes, hospice care, or those who are homebound.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-cal-ink">Our Commitment</h3>
          <p className="leading-relaxed">
            In alignment with our church&apos;s C.O.R.E.S. values, the Care Team is:
          </p>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              <span className="font-medium text-cal-ink">Centered on God&apos;s Word:</span> Grounding every visit in
              the truth of Scripture, providing biblical encouragement and hope to those facing physical or emotional
              trials.
            </li>
            <li>
              <span className="font-medium text-cal-ink">One in Spirit:</span> Devoted to a fellowship that reflects
              the compassion of Christ through regular visitation and personal connection.
            </li>
            <li>
              <span className="font-medium text-cal-ink">Rejoicing in Redemption:</span> Bringing the peace and hope of
              the Gospel into difficult circumstances, reminding our congregants of their secure identity in Christ.
            </li>
            <li>
              <span className="font-medium text-cal-ink">Energetic in Prayer:</span> Committed to lifting up the
              specific needs and prayer requests of those we visit, believing that God&apos;s Word is the basis for our
              hope and healing.
            </li>
            <li>
              <span className="font-medium text-cal-ink">Serving with Spiritual Gifts:</span> Empowering our members and
              pastors to use their unique giftings to edify, encourage, and equip our church body, even when they cannot
              physically assemble with us.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-cal-ink">Our Purpose</h3>
          <p className="leading-relaxed">
            We seek to ensure that no member of our church family is forgotten. Whether through a hospital visit, a
            shared scripture at a bedside, or a moment of prayer in a home, our goal is to &quot;Connect People to
            God&quot; and provide the &quot;Christian care and watchfulness over each other&quot; that we have pledged
            in our church covenant.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-cal-ink">Visitation Disclaimer</h3>
          <p className="leading-relaxed">
            Calvary Baptist Church and our Care Ministry Team are committed to serving our congregation and will do the
            best of our abilities to accommodate every visit request. However, please understand that due to volunteer
            availability, scheduling constraints, and specific facility regulations, not all visits will be possible.
            We thank you for your grace and understanding as we strive to serve our church family.
          </p>
        </section>

        <p className="text-sm">
          <a className="text-cal-primary underline" href="https://calvaryeauclaire.org/">
            Visit Calvary Baptist Church online
          </a>
        </p>
      </article>
    </main>
  );
}
