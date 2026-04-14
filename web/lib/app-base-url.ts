/**
 * Base URL for links in outbound email/MMS (no trailing slash).
 *
 * Order: `NEXT_PUBLIC_APP_URL` → Vercel `VERCEL_URL` → `http://localhost:3000` in development only.
 */
export function getAppBaseUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return null;
}

export function appBaseUrlErrorMessage(): string {
  return "Set NEXT_PUBLIC_APP_URL in .env.local (e.g. http://localhost:3000) or deploy on Vercel so links in messages are correct.";
}
