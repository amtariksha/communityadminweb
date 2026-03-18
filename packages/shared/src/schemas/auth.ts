import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91\d{10}$/, 'Phone must be a valid Indian number in +91XXXXXXXXXX format'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91\d{10}$/, 'Phone must be a valid Indian number in +91XXXXXXXXXX format'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
