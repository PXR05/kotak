import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(255, "Email must be less than 255 characters")
  .email("Invalid email format")
  .refine(
    (email) => !email.includes("<") && !email.includes(">"),
    "Email contains invalid characters"
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(255, "Password must be less than 255 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function validateEmail(email: string): string {
  try {
    emailSchema.parse(email);
    return "";
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || "Invalid email";
    }
    return "Invalid email";
  }
}

export function validatePassword(password: string): string {
  try {
    passwordSchema.parse(password);
    return "";
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || "Invalid password";
    }
    return "Invalid password";
  }
}

export function validateLoginPassword(password: string): string {
  if (!password) return "Password is required";
  return "";
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return "";
}

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
