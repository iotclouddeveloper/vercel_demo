import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">拾光-日程管理工具</h1>
        <div className="mt-5">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
