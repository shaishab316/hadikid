export const OtpReason = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

export type OtpReason = keyof typeof OtpReason;

export const OTP_LENGTH = 4;
