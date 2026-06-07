// Client-side holder for the admin passwords entered at the gates. The values
// are kept only for the browser session and forwarded with each admin server
// call, where they are verified server-side against ADMIN_PASSWORD /
// PROFILE_ADMIN_PASSWORD. Holding them client-side is not the security
// boundary — the server check is.

const ADMIN_PW_KEY = "admin-password";
const PROFILE_PW_KEY = "profile-admin-password";

export function setAdminPassword(pw: string): void {
  try {
    sessionStorage.setItem(ADMIN_PW_KEY, pw);
  } catch {
    /* ignore */
  }
}

export function getAdminPassword(): string {
  try {
    return sessionStorage.getItem(ADMIN_PW_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setProfileAdminPassword(pw: string): void {
  try {
    sessionStorage.setItem(PROFILE_PW_KEY, pw);
  } catch {
    /* ignore */
  }
}

export function getProfileAdminPassword(): string {
  try {
    return sessionStorage.getItem(PROFILE_PW_KEY) ?? "";
  } catch {
    return "";
  }
}
