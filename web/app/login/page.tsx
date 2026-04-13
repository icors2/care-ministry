import { LoginForm } from "./login-form";

export const metadata = {
  title: "Care team login | Care Ministry",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <LoginForm />
      {p.error === "auth" ? (
        <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
          Sign-in link expired or invalid. Try again.
        </p>
      ) : null}
    </main>
  );
}
