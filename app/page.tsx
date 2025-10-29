// app/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import GoogleLoginButton from "./components/GoogleSignInButton"; // adjust path

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(var(--primary))` }} />
      <span className="text-sm opacity-90">{children}</span>
    </li>
  );
}

export const metadata = {
  title: "PM System — Home",
  description: "Minimal project management for focused teams.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthed = Boolean(session?.user);
  const cb = "/projects";

  return (
    <main className="min-h-[100dvh] grid place-items-center">
      <div className="container-max w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Intro */}
          <section className="order-2 lg:order-1">
            <div className="card p-6 md:p-8 h-full">
              <div className="space-y-6">
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                  A clean, fast Project Manager for small teams
                </h1>
                <p className="text-sm md:text-base opacity-80 max-w-prose">
                  Plan projects, track tasks and collaborate without the noise.
                  Tasks & Subtasks, Files, Activity, Members, and Settings—
                  all in a calm UI built with Next.js 15 and Tailwind.
                </p>
                <ul className="grid gap-2">
                  <Feature>Tasks & Subtasks with statuses and due dates</Feature>
                  <Feature>Files & Activity close to the work</Feature>
                  <Feature>Readable spacing, responsive by default</Feature>
                </ul>
              </div>
            </div>
          </section>

          {/* Right: Auth */}
          <section className="order-1 lg:order-2">
            <div className="card p-6 md:p-8 h-full">
              <div className="mb-6">
                <div className="text-lg font-semibold">Access your workspace</div>
                <div className="text-sm opacity-70">
                  {isAuthed ? "You are already signed in." : "Use your Google account to continue."}
                </div>
              </div>

              {!isAuthed ? (
            <GoogleLoginButton callbackUrl="/projects" />
              ) : (
                <div className="grid gap-3">
                  <div className="text-sm opacity-80">
                    Signed in as <span className="font-medium">{session!.user!.email}</span>
                  </div>
                  <Link href="/projects" className="btn btn-primary">
                    Go to Projects
                  </Link>
                </div>
              )}

              <div className="mt-6 text-xs opacity-60">
                More sign-in providers (GitHub, Microsoft) coming soon.
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 flex items-center justify-between text-xs opacity-60">
          <div>© {new Date().getFullYear()} PM System</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
            <Link href="/terms" className="hover:opacity-100">Terms</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
