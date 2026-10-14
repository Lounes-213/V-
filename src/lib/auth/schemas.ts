import { z } from "zod";

/**
 * One set of rules, used by the form in the browser and by the route handler on
 * the server, so a field can never be accepted in one place and rejected in the
 * other.
 */

const email = z
  .string()
  .min(1, "errorInvalidEmail")
  .max(254)
  .email("errorInvalidEmail")
  .transform((value) => value.trim().toLowerCase());

const password = z
  .string()
  .min(8, "errorShortPassword")
  .max(200, "errorShortPassword")
  // Deliberately no composition rules: length is what matters, and blocking
  // passphrases is how you get weaker passwords.
  .refine((value) => value.trim().length === value.length, "errorShortPassword");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "errorShortPassword").max(200),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, "errorMismatch").max(80),
    email,
    password,
    confirmPassword: z.string(),
    // zod 4 takes a flat message here; the value must be literally true.
    acceptTerms: z.literal(true, { message: "errorMismatch" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "errorMismatch",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

/** Shape accepted by POST /api/auth/session — never contains a password hash. */
export const sessionRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("sign-in"), email, password: z.string().min(1).max(200) }),
  z.object({
    mode: z.literal("sign-up"),
    name: z.string().min(2).max(80),
    email,
    password,
    acceptTerms: z.literal(true),
  }),
  z.object({ mode: z.literal("magic-link"), email }),
  z.object({ mode: z.literal("oauth"), provider: z.literal("google") }),
]);

export type SessionRequest = z.infer<typeof sessionRequestSchema>;

/** True when a real auth backend is configured for this deployment. */
export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
