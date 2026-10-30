const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
const PKCE_VERIFIER_KEY = 'signbridge_supabase_pkce_verifier';
const PKCE_CREATED_AT_KEY = 'signbridge_supabase_pkce_created_at';

const assertConfigured = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase Google Sign-In is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to frontend/.env.');
  }
};

const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const createVerifier = () => {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
};

const createChallenge = async (verifier: string) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64Url(new Uint8Array(digest));
};

export const supabaseConfig = {
  url: SUPABASE_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
  isConfigured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
};

export const startGoogleOAuth = async () => {
  assertConfigured();
  clearGoogleOAuthState();
  const verifier = createVerifier();
  const challenge = await createChallenge(verifier);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_CREATED_AT_KEY, String(Date.now()));

  const redirectTo = `${window.location.origin}/auth/callback`;
  const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', redirectTo);
  authorizeUrl.searchParams.set('flow_type', 'pkce');
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 's256');
  authorizeUrl.searchParams.set('prompt', 'select_account');

  window.location.assign(authorizeUrl.toString());
};


export const getGoogleOAuthVerifier = () => {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const createdAt = Number(sessionStorage.getItem(PKCE_CREATED_AT_KEY) || 0);
  if (!verifier || (createdAt && Date.now() - createdAt > 10 * 60 * 1000)) {
    clearGoogleOAuthState();
    throw new Error('Google sign-in session expired. Please start again.');
  }
  return verifier;
};

export const clearGoogleOAuthState = () => {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_CREATED_AT_KEY);
};

// The authorization-code exchange is deliberately completed by the SignBridge
// backend. This avoids browser CORS/proxy issues against Supabase's token
// endpoint and lets the app finish in one bounded request before opening the dashboard.

export const signOutSupabase = async (accessToken?: string) => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !accessToken) return;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch {
    // Local SignBridge session is still cleared even if remote sign-out fails.
  }
};
