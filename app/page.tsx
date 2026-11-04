"use client";
import { useEffect, useState } from "react";
import { CalendarWidget } from "@/components/cards/CalendarWidget";
import { readTodos, type LocalTodo } from "@/lib/calendar-actions";
const categories = [{id: 1, name: "日常"}, {id: 2, name: "工作"}, {id: 3, name: "学习"}];
export default function Home() {
  const [todos, setTodos] = useState<LocalTodo[]>([]);
  const [categoryId, setCategoryId] = useState(1);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reload = () => { setTodos(readTodos()); setReady(true); };
    reload(); window.addEventListener("calendar-change", reload); window.addEventListener("storage", reload);
    return () => { window.removeEventListener("calendar-change", reload); window.removeEventListener("storage", reload); };
  }, []);
  return <main className="h-screen overflow-hidden bg-zinc-50 p-2 sm:p-3"><div className="mx-auto flex h-full max-w-[1600px] flex-col gap-2">
    <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div><h1 className="text-base font-semibold">拾光 · 日程管理</h1><p className="text-xs text-zinc-500">前端演示版 · 记录仅保存在当前浏览器，清除浏览器数据后将丢失</p></div>
      <select aria-label="事项分类" className="rounded border border-zinc-300 px-3 py-2 text-sm" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    </header><div className="min-h-0 flex-1">{ready ? <CalendarWidget todos={todos.filter(t => t.categoryId === categoryId)} selectedCategoryId={categoryId} /> : <p className="p-4 text-sm text-zinc-500">正在加载日历…</p>}</div>
  </div></main>;
}
