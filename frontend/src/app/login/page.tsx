import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#141414] text-zinc-500">
          Đang tải…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
