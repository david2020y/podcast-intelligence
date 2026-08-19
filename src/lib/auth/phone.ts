// Chinese mobile numbers only, for now: 1[3-9]xxxxxxxxx.
const PHONE_RE = /^1[3-9]\d{9}$/;

const SYNTHETIC_EMAIL_DOMAIN = "phone.podcast-intel.local";

export function isValidChinesePhone(phone: string): boolean {
  return PHONE_RE.test(phone);
}

// Supabase's native phone-auth provider requires a configured SMS gateway even when
// OTP confirmation is disabled. To get phone+password login without that dependency,
// real accounts are created under a synthetic, never-dispatched email address derived
// deterministically from the phone number; the phone itself lives in user_metadata.
export function phoneToSyntheticEmail(phone: string): string {
  return `p${phone}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
