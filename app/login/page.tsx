import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { Button, Field, Input } from "@/components/ui";

async function authenticate(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error; // re-throw NEXT_REDIRECT and anything else
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-ink">Happily</span>
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        </div>
        <form action={authenticate} className="flex flex-col gap-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error && <p className="text-sm text-down">Incorrect email or password.</p>}
          <Button type="submit" className="mt-2">
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-xs text-faint">
          Membership is closed — accounts are created at setup.
        </p>
      </div>
    </div>
  );
}
