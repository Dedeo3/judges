export function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const rpConfig = {
  rpId: process.env.RP_ID ?? "localhost",
  rpName: process.env.RP_NAME ?? "Judges",
  origin: process.env.RP_ORIGIN ?? "http://localhost:3000",
};
