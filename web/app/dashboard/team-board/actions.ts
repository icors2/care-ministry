"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const MAX_BODY_LEN = 4000;

export async function postTeamMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1 || body.length > MAX_BODY_LEN) {
    redirect("/dashboard/team-board?error=invalid");
  }

  const { error } = await supabase.from("team_board_posts").insert({
    author_id: user.id,
    body,
  });

  revalidatePath("/dashboard/team-board");
  if (error) {
    redirect("/dashboard/team-board?error=1");
  }
  redirect("/dashboard/team-board?posted=1");
}

export async function deleteTeamMessage(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const postId = String(formData.get("post_id") ?? "").trim();
  if (!postId) {
    redirect("/dashboard/team-board?error=invalid");
  }

  const { data, error } = await supabase
    .from("team_board_posts")
    .delete()
    .eq("id", postId)
    .select("id");

  revalidatePath("/dashboard/team-board");
  if (error) {
    redirect("/dashboard/team-board?error=1");
  }
  if (!data?.length) {
    redirect("/dashboard/team-board?error=forbidden");
  }
  redirect("/dashboard/team-board?deleted=1");
}
