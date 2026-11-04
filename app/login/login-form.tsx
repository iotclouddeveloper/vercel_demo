"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

const initialState = { error: "" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1 block text-sm text-zinc-600">
          用户名
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          placeholder="请输入用户名"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-zinc-600">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
          placeholder="请输入密码"
        />
      </div>
      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white"
      >
        {isPending ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
