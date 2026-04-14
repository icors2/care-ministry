import nodemailer from "nodemailer";

export function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host) return null;

  const useTls = port === 587;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: useTls,
    tls: useTls
      ? {
          minVersion: "TLSv1.2",
        }
      : undefined,
    auth: user && pass ? { user, pass } : undefined,
  });
}
