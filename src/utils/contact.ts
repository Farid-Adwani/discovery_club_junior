// Same rules as the server (server/routes.ts: phone() and email())

/** Digits, spaces, + - ( ) and at least 8 digits, e.g. "+216 55 987 654" */
export const isValidPhone = (s: string) => /^\+?[0-9 ()-]+$/.test(s.trim()) && s.replace(/\D/g, '').length >= 8;

export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/** For <input pattern>: browsers compile it with the `v` flag, so ( ) - are escaped inside classes */
export const PHONE_PATTERN = String.raw`\+?[\d \(\)\-]*(\d[ \(\)\-]*){8,}`;
