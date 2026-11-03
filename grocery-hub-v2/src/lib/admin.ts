import { timingSafeEqual } from "crypto";

export function checkAdmin(input: unknown): "ok" | "unset" | "bad" {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "unset";
  const a = Buffer.from(String(input ?? ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "bad";
}

export function adminError(state: "unset" | "bad") {
  return state === "unset"
    ? { error: "ADMIN_PASSWORD is not set in Vercel yet. Add it under Settings > Environment Variables, then redeploy.", status: 503 }
    : { error: "Admin password is incorrect", status: 401 };
}
