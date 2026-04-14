import { createClient } from "@/lib/supabase/server";
import { getProfile, requireUser } from "@/lib/auth";
import { CHURCH_TIMEZONE } from "@/lib/constants";
import { deleteTeamMessage, postTeamMessage } from "./actions";

export const metadata = { title: "Team board | Care Ministry" };

const timeFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: CHURCH_TIMEZONE,
});

type ProfileEmbed = { display_name: string | null };

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function embeddedProfile(p: PostRow["profiles"]): ProfileEmbed | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export default async function TeamBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; deleted?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  const supabase = await createClient();

  const { data: rawPosts, error: postsError } = await supabase
    .from("team_board_posts")
    .select("id, body, created_at, author_id, profiles ( display_name )")
    .order("created_at", { ascending: false })
    .limit(100);

  const posts = (rawPosts ?? []) as unknown as PostRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-cal-ink">Team board</h1>
      <p className="mt-2 max-w-2xl text-sm text-cal-ink-muted">
        Short updates for the care team. Newest posts appear first. Times are shown in{" "}
        <strong>US Central (Chicago)</strong>.
      </p>

      {sp.posted === "1" ? (
        <p
          className="mt-4 max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Your message was posted.
        </p>
      ) : null}
      {sp.deleted === "1" ? (
        <p
          className="mt-4 max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          That post was removed.
        </p>
      ) : null}
      {sp.error === "invalid" ? (
        <p className="mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Please enter a message (up to 4,000 characters).
        </p>
      ) : null}
      {sp.error === "forbidden" ? (
        <p className="mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          You can&apos;t delete that post.
        </p>
      ) : null}
      {sp.error === "1" ? (
        <p className="mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Something went wrong. Please try again.
        </p>
      ) : null}
      {postsError ? (
        <p className="mt-4 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          Couldn&apos;t load posts. If the team board is new, confirm the latest database migration has been applied,
          then refresh.
        </p>
      ) : null}

      <form action={postTeamMessage} className="card-surface mt-6 max-w-2xl space-y-3 p-4">
        <label className="field block">
          <span className="text-sm font-medium text-cal-ink">New post</span>
          <textarea
            name="body"
            rows={4}
            maxLength={4000}
            required
            className="mt-1 w-full rounded-lg border border-cal-border bg-cal-page px-3 py-2 text-sm text-cal-ink shadow-sm"
            placeholder="Share an update with the team…"
          />
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Post
          </button>
        </div>
      </form>

      <ul className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <li className="text-sm text-cal-ink-muted">No posts yet. Be the first to share an update.</li>
        ) : (
          posts.map((p) => {
            const name = embeddedProfile(p.profiles)?.display_name?.trim() || "Care team member";
            const canDelete = p.author_id === user.id || isAdmin;
            return (
              <li key={p.id} className="card-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-cal-ink">{name}</span>
                  <time className="text-xs text-cal-ink-muted" dateTime={p.created_at}>
                    {timeFmt.format(new Date(p.created_at))}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-cal-ink">{p.body}</p>
                {canDelete ? (
                  <form action={deleteTeamMessage} className="mt-3">
                    <input type="hidden" name="post_id" value={p.id} />
                    <button type="submit" className="text-sm text-red-600 underline dark:text-red-400">
                      Delete
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
