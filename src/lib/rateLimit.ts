interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
  firstAttemptTime: number;
}

// In-memory rate limit store (for IP and username combination)
const loginAttemptStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    loginAttemptStore.forEach((entry, key) => {
      if (entry.lockedUntil && entry.lockedUntil < now) {
        loginAttemptStore.delete(key);
      } else if (now - entry.firstAttemptTime > 15 * 60 * 1000) {
        loginAttemptStore.delete(key);
      }
    });
  }, 15 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutMinutes?: number;
  message?: string;
}

/**
 * Check if a login attempt is allowed or locked out
 */
export function checkLoginRateLimit(identifier: string, maxAttempts = 5, lockDurationMinutes = 10): RateLimitResult {
  const now = Date.now();
  const entry = loginAttemptStore.get(identifier);

  if (!entry) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  // Check if currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutMinutes: remainingMinutes,
      message: `Xavfsizlik yuzasidan ushbu hisob vaqtincha bloklandi. Iltimos, ${remainingMinutes} daqiqadan so‘ng qayta urinib ko‘ring.`,
    };
  }

  // If lockout expired or window passed, reset
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    loginAttemptStore.delete(identifier);
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  const remaining = Math.max(0, maxAttempts - entry.attempts);
  return { allowed: true, remainingAttempts: remaining };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLoginAttempt(identifier: string, maxAttempts = 5, lockDurationMinutes = 10): RateLimitResult {
  const now = Date.now();
  let entry = loginAttemptStore.get(identifier);

  if (!entry) {
    entry = {
      attempts: 1,
      firstAttemptTime: now,
    };
    loginAttemptStore.set(identifier, entry);
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  entry.attempts += 1;

  if (entry.attempts >= maxAttempts) {
    entry.lockedUntil = now + lockDurationMinutes * 60 * 1000;
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutMinutes: lockDurationMinutes,
      message: `Ketma-ket ${maxAttempts} marta noto‘g‘ri parol kiritildi! Hisob ${lockDurationMinutes} daqiqaga xavfsizlik maqsadida bloklandi.`,
    };
  }

  const remaining = Math.max(0, maxAttempts - entry.attempts);
  return {
    allowed: true,
    remainingAttempts: remaining,
    message: `Noto‘g‘ri login yoki parol. Qolgan urinishlar: ${remaining} ta.`,
  };
}

/**
 * Clear login attempts on successful login
 */
export function resetLoginRateLimit(identifier: string): void {
  loginAttemptStore.delete(identifier);
}
