export const SENSITIVE_PATTERN =
  /password|token|secret|hash|key|auth|credential|otp|pin|cvv|ssn|card/i;

export const maskSensitiveFields = (
  body: Record<string, any>,
): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [
      k,
      SENSITIVE_PATTERN.test(k)
        ? '********'
        : v && typeof v === 'object' && !Array.isArray(v)
          ? maskSensitiveFields(v)
          : v,
    ]),
  );
};
