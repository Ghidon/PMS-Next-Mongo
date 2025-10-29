// app/login/page.tsx
"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/projects";

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 border rounded p-4 text-center">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm opacity-70">
          Use your Google account to continue
        </p>

        <button
          className="w-full border rounded px-3 py-2"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
