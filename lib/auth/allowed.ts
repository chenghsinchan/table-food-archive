const fallbackAllowedEmails = ["chenghsinchan@gmail.com", "saulemiezyte@gmail.com"];

export function getAllowedEmails() {
  const configured = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
  const emails = configured
    ? configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : fallbackAllowedEmails;

  return emails.length ? emails : fallbackAllowedEmails;
}

export function isAllowedEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAllowedEmails().includes(email.trim().toLowerCase());
}
