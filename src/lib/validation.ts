import * as z from "zod/mini";

export const emailSchema = z.email().check(
  z.minLength(1, "Email is required"),
  z.maxLength(255, "Email must be less than 255 characters"),
  z.refine(
    (email) => !email.includes("<") && !email.includes(">"),
    "Email contains invalid characters"
  )
);

export const passwordSchema = z
  .string()
  .check(
    z.minLength(8, "Password must be at least 8 characters"),
    z.maxLength(255, "Password must be less than 255 characters"),
    z.regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    )
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().check(z.minLength(1, "Password is required")),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .check(z.minLength(1, "Please confirm your password")),
  })
  .check(
    z.refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
  );

export const nameSchema = z
  .string()
  .check(
    z.minLength(1, "Name is required"),
    z.maxLength(255, "Name must be less than 255 characters"),
    z.regex(/^[^<>:"/\\|?*\x00-\x1f]+$/, "Name contains invalid characters")
  );

export function validateEmail(email: string): string {
  const { success, error } = emailSchema.safeParse(email);
  if (success) {
    return "";
  }
  if (error instanceof z.core.$ZodError) {
    return z.prettifyError(error) || "Invalid email";
  }
  return "Invalid email";
}

export function validatePassword(password: string): string {
  const { success, error } = passwordSchema.safeParse(password);
  if (success) {
    return "";
  }
  if (error instanceof z.core.$ZodError) {
    return z.prettifyError(error) || "Invalid password";
  }
  return "Invalid password";
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

export function validateName(name: string): string {
  const { success, error } = nameSchema.safeParse(name);
  if (success) {
    return "";
  }
  if (error instanceof z.core.$ZodError) {
    return z.prettifyError(error) || "Invalid name";
  }
  return "Invalid name";
}

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
