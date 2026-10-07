import { z } from "zod";

export const emailSchema = z.email("Enter a valid email address.");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6 digit code from the email.");
