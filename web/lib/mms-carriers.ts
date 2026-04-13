/** Major US carriers: display label and email-to-MMS / SMS gateway domain (10-digit local number). */
export const MMS_GATEWAYS = [
  { label: "Verizon", domain: "vtext.com" },
  { label: "AT&T", domain: "txt.att.net" },
  { label: "T-Mobile", domain: "tmomail.net" },
  { label: "Sprint", domain: "messaging.sprintpcs.com" },
  { label: "US Cellular", domain: "email.uscc.net" },
  { label: "Cricket", domain: "mms.cricketwireless.net" },
  { label: "Metro by T-Mobile", domain: "mymetropcs.com" },
  { label: "Boost Mobile", domain: "smsmyboostmobile.com" },
  { label: "Google Fi", domain: "msg.fi.google.com" },
  { label: "Straight Talk", domain: "vtext.com" },
] as const;

export type MmsGatewayDomain = (typeof MMS_GATEWAYS)[number]["domain"];

export function gatewayLabel(domain: string | null | undefined): string {
  if (!domain) return "";
  const row = MMS_GATEWAYS.find((g) => g.domain === domain);
  return row?.label ?? domain;
}
