/** Synthetic email domain for customers who sign up with phone only (OTP is email-based today). */
export const PHONE_SIGNUP_EMAIL_DOMAIN = "tpw-phone.local";

export function isSyntheticPhoneSignupEmail(email: string) {
  return email.toLowerCase().endsWith(`@${PHONE_SIGNUP_EMAIL_DOMAIN}`);
}

export function syntheticEmailForPhone(normalizedPhoneDigits: string) {
  return `${normalizedPhoneDigits}@${PHONE_SIGNUP_EMAIL_DOMAIN}`;
}
