// API xatolari turli shaklda keladi: ba'zan string, ba'zan { code, message } obyekti.
// React obyektni child sifatida render qila olmaydi (crash), shuning uchun har doim
// xavfsiz stringga normalizatsiya qilamiz.
export function getErrorMessage(error: unknown, fallback = "Xatolik yuz berdi"): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof e.message === "string" && e.message.trim()) return e.message;
    if (typeof e.error === "string" && e.error.trim()) return e.error;
    if (e.error && typeof e.error === "object") return getErrorMessage(e.error, fallback);
  }
  return fallback;
}
