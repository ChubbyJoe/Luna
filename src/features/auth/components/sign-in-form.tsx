"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailSchema, otpCodeSchema } from "@/features/auth/schemas";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "email" | "code";

export function SignInForm() {
  const router = useRouter();
  const linkFailed = useSearchParams().get("error") === "link";

  // A failed link lands here with no email known, so the code step asks for both.
  const [step, setStep] = useState<Step>(linkFailed ? "code" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(
    linkFailed
      ? "That sign in link has expired or was already used. Enter your email and the 6 digit code from the same email, or send a new one."
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendEmail(event?: FormEvent) {
    event?.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
        email: parsed.data,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setEmail(parsed.data);
      setCode("");
      setMessage(`We sent a sign in link and a 6 digit code to ${parsed.data}.`);
      setStep("code");
    });
  }

  function verifyCode(event: FormEvent) {
    event.preventDefault();
    const parsedEmail = emailSchema.safeParse(email.trim());
    const parsedCode = otpCodeSchema.safeParse(code);
    if (!parsedEmail.success || !parsedCode.success) {
      setError(
        (parsedEmail.error ?? parsedCode.error)?.issues[0].message ?? "Check your details.",
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error } = await getSupabaseBrowserClient().auth.verifyOtp({
        email: parsedEmail.data,
        token: parsedCode.data,
        type: "email",
      });
      if (error) {
        setError("That code did not work. Check it, or send a new one.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={sendEmail} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "sign-in-error" : undefined}
          />
        </div>
        {error && <FormError message={error} />}
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Email me a sign in link"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="flex flex-col gap-4" noValidate>
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {linkFailed && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">6 digit code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={!linkFailed}
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "sign-in-error" : undefined}
        />
      </div>
      {error && <FormError message={error} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          disabled={pending || !email}
          onClick={() => sendEmail()}
        >
          Send a new code
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            setStep("email");
          }}
        >
          Use a different email
        </Button>
      </div>
    </form>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p id="sign-in-error" className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
