import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--mika-bg-page)] text-[var(--mika-fg-muted)]">
          Đang tải…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
