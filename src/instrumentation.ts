// Runs once when the Next.js server starts (Next docs: instrumentation).
// The app refuses to start without a real SESSION_SECRET (design rule 5,
// §6 — nobody ships a default key).

const SECRET_MIN_LENGTH = 32;

export function register() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < SECRET_MIN_LENGTH) {
    throw new Error(
      `SESSION_SECRET is missing or shorter than ${SECRET_MIN_LENGTH} characters. ` +
        "Copy .env.example to .env and set a long random value before starting the app.",
    );
  }
}
