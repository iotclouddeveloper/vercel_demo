"use client";

import { useMemo, useState, useTransition, type DragEvent } from "react";

import type { TodoPriority } from "@/lib/calendar-actions";
import Holidays from "date-holidays";
import {
  copyCalendarTodoToDate,
  createCalendarTodo,
  deleteCalendarTodo,
  updateCalendarTodo,
} from "@/lib/calendar-actions";

const TODO_DRAG_MIME = "application/x-calendar-todo";

function DragHandleIcon() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      className="shrink-0 text-zinc-400"
      aria-hidden
    >
      <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const lunarFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
  month: "long",
  day: "numeric",
});
const priorityItems: Array<{ value: TodoPriority; label: string; className: string }> = [
  { value: "NORMAL", label: "普通", className: "bg-zinc-100 text-zinc-700" },
  { value: "URGENT", label: "紧急", className: "bg-amber-100 text-amber-700" },
  { value: "IMPORTANT", label: "重要", className: "bg-sky-100 text-sky-700" },
  { value: "URGENT_IMPORTANT", label: "紧急重要", className: "bg-rose-100 text-rose-700" },
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function getCalendarDays(currentMonth: Date) {
  const firstDay = startOfMonth(currentMonth);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Monday-first index
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const prevMonthDays = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    0,
  ).getDate();

  const cells: Array<{ date: number; inCurrentMonth: boolean; fullDate: Date }> = [];
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    cells.push({
      date: prevMonthDays - i,
      inCurrentMonth: false,
      fullDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDays - i),
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: day,
      inCurrentMonth: true,
      fullDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      date: nextDay,
      inCurrentMonth: false,
      fullDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, nextDay),
    });
    nextDay += 1;
  }
  return cells;
}

function getLunarLabel(date: Date) {
  const parts = lunarFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const dayLabel = [
    "",
    "初一",
    "初二",
    "初三",
    "初四",
    "初五",
    "初六",
    "初七",
    "初八",
    "初九",
    "初十",
    "十一",
    "十二",
    "十三",
    "十四",
    "十五",
    "十六",
    "十七",
    "十八",
    "十九",
    "二十",
    "廿一",
    "廿二",
    "廿三",
    "廿四",
    "廿五",
    "廿六",
    "廿七",
    "廿八",
    "廿九",
    "三十",
  ][day];

  return day === 1 ? `${month}${dayLabel}` : dayLabel;
}

function getHolidayLabel(holidays: Holidays, date: Date) {
  const result = holidays.isHoliday(date);
  if (!result || result.length === 0) {
    return "";
  }

  const nationalHoliday = result.find((item) => item.type === "public");
  const holiday = nationalHoliday ?? result[0];
  const rawName = holiday.name ?? "";
  const candidates = rawName
    .split(/[，,/\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  // Prefer simplified Chinese holiday text, e.g. "清明节" over "清明節".
  const simplified = candidates.find((part) => /[\u4e00-\u9fa5]+节$/.test(part));
  if (simplified) {
    return simplified;
  }

  const firstChinese = candidates.find((part) => /[\u4e00-\u9fa5]/.test(part));
  return firstChinese ?? candidates[0] ?? rawName;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

type CalendarTodo = {
  id: number;
  title: string;
  content: string;
  date: string;
  priority: TodoPriority;
};

type CalendarWidgetProps = {
  todos: CalendarTodo[];
  selectedCategoryId: number;
};

export function CalendarWidget({ todos, selectedCategoryId }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingTodo, setEditingTodo] = useState<CalendarTodo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<number | null>(null);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  const holidays = useMemo(() => {
    const hd = new Holidays("CN");
    hd.setLanguages("zh");
    return hd;
  }, []);

  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentRealMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const todoMap = useMemo(() => {
    const grouped = new Map<string, CalendarTodo[]>();
    for (const todo of todos) {
      const key = toDateKey(new Date(todo.date));
      const list = grouped.get(key) ?? [];
      list.push(todo);
      grouped.set(key, list);
    }
    return grouped;
  }, [todos]);

  function closeModal() {
    setSelectedDate(null);
    setFormError("");
  }

  function closeEditModal() {
    setEditingTodo(null);
    setEditError("");
    setDeletingTodoId(null);
  }

  function submitTodo(formData: FormData) {
    startTransition(async () => {
      const result = await createCalendarTodo({}, formData);
      if (!result?.error) {
        closeModal();
        window.dispatchEvent(new Event("calendar-change"));
      } else {
        setFormError(result.error);
      }
    });
  }

  function submitEditTodo(formData: FormData) {
    startTransition(async () => {
      const result = await updateCalendarTodo({}, formData);
      if (!result?.error) {
        closeEditModal();
        window.dispatchEvent(new Event("calendar-change"));
      } else {
        setEditError(result.error);
      }
    });
  }

  function submitDeleteTodo() {
    if (!deletingTodoId) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(deletingTodoId));
      const result = await deleteCalendarTodo({}, formData);
      if (!result?.error) {
        closeEditModal();
        window.dispatchEvent(new Event("calendar-change"));
      } else {
        setEditError(result.error);
        setDeletingTodoId(null);
      }
    });
  }

  function priorityClass(priority: TodoPriority) {
    return priorityItems.find((item) => item.value === priority)?.className ?? "bg-zinc-100 text-zinc-700";
  }

  function toggleCellExpand(dateKey: string) {
    setExpandedCells((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  }

  function handleCellDrop(targetDateKey: string, e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDateKey(null);
    const raw = e.dataTransfer.getData(TODO_DRAG_MIME);
    const sourceId = Number(raw);
    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      return;
    }
    startTransition(async () => {
      const result = await copyCalendarTodoToDate(sourceId, targetDateKey);
      if (result.error) {
        setCopyError(result.error);
      } else {
        setCopyError("");
        window.dispatchEvent(new Event("calendar-change"));
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {copyError ? (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {copyError}
          <button
            type="button"
            onClick={() => setCopyError("")}
            className="ml-2 underline"
          >
            关闭
          </button>
        </div>
      ) : null}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-center border-b border-zinc-200 px-3 py-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              className="h-6 w-6 rounded text-zinc-500 hover:bg-zinc-100"
              aria-label="上个月"
            >
              ‹
            </button>
            <p className="min-w-28 text-center text-base font-semibold text-zinc-800">
              {monthLabel(currentMonth)}
            </p>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              className="h-6 w-6 rounded text-zinc-500 hover:bg-zinc-100"
              aria-label="下个月"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-zinc-200 text-[11px] text-zinc-500">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="border-r border-zinc-200 py-1 text-center last:border-r-0"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 grid-rows-6">
          {days.map((day, index) => {
            const isToday = isCurrentRealMonth && day.inCurrentMonth && day.date === todayDay;
            const dateKey = toDateKey(day.fullDate);
            const cellTodos = todoMap.get(dateKey) ?? [];
            const isExpanded = !!expandedCells[dateKey];
            const visibleTodos = isExpanded ? cellTodos : cellTodos.slice(0, 5);
            const holidayLabel = getHolidayLabel(holidays, day.fullDate);

            return (
              <div
                key={`${day.date}-${index}`}
                role="button"
                tabIndex={0}
                aria-label={`${day.fullDate.getFullYear()}年${day.fullDate.getMonth() + 1}月${day.fullDate.getDate()}日，点击新增事项`}
                onClick={() => setSelectedDate(day.fullDate)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDate(day.fullDate);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  setDragOverDateKey(dateKey);
                }}
                onDragLeave={() => {
                  setDragOverDateKey((prev) => (prev === dateKey ? null : prev));
                }}
                onDrop={(e) => handleCellDrop(dateKey, e)}
                className={`relative min-h-0 cursor-default border-r border-b border-zinc-200 p-1.5 text-left align-top last:border-r-0 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${
                  dragOverDateKey === dateKey ? "bg-sky-50 ring-1 ring-inset ring-sky-300" : ""
                }`}
              >
                <div className="pointer-events-none absolute left-1.5 top-1.5">
                  <div
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                      isToday
                        ? "bg-blue-500 font-semibold text-white"
                        : day.inCurrentMonth
                          ? "text-zinc-800"
                          : "text-zinc-400"
                    }`}
                  >
                    {day.date}
                  </div>
                </div>
                <p
                  className={`pointer-events-none absolute right-1.5 top-1.5 text-[10px] ${
                    day.inCurrentMonth ? "text-zinc-500" : "text-zinc-300"
                  }`}
                >
                  {getLunarLabel(day.fullDate)}
                </p>
                {holidayLabel ? (
                  <p
                    className={`pointer-events-none absolute left-1/2 top-1.5 max-w-16 -translate-x-1/2 truncate text-center text-[10px] ${
                      day.inCurrentMonth ? "text-zinc-500" : "text-zinc-300"
                    }`}
                  >
                    {holidayLabel}
                  </p>
                ) : null}
                <div
                  className={`mt-7 space-y-0.5 ${isExpanded ? "max-h-24 overflow-y-auto pr-0.5" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "copy";
                    setDragOverDateKey(dateKey);
                  }}
                  onDrop={(e) => handleCellDrop(dateKey, e)}
                >
                  {visibleTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-center gap-0.5 rounded px-0.5 py-0.5 text-xs leading-4 ${priorityClass(todo.priority)}`}
                    >
                      <span
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.setData(TODO_DRAG_MIME, String(todo.id));
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="flex cursor-grab touch-none items-center rounded p-0.5 active:cursor-grabbing"
                        title="拖至其他日期格以复制"
                        aria-label="拖至其他日期格以复制"
                      >
                        <DragHandleIcon />
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingTodo(todo);
                          setEditError("");
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "copy";
                          setDragOverDateKey(dateKey);
                        }}
                        onDrop={(event) => handleCellDrop(dateKey, event)}
                        className="min-w-0 flex-1 truncate text-left"
                      >
                        {todo.title}
                      </button>
                    </div>
                  ))}
                  {cellTodos.length > 5 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleCellExpand(dateKey);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      {isExpanded ? "收起" : `+${cellTodos.length - 5} 项`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedDate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">新增事项</h3>
              <p className="text-sm text-zinc-500">{formatSelectedDate(selectedDate)}</p>
            </div>
            <form action={submitTodo} className="space-y-3">
              <input type="hidden" name="date" value={toDateKey(selectedDate)} />
              <input type="hidden" name="categoryId" value={String(selectedCategoryId)} />
              <div>
                <label htmlFor="title" className="mb-1 block text-sm text-zinc-700">
                  标题
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  maxLength={60}
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="content" className="mb-1 block text-sm text-zinc-700">
                  内容
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <p className="mb-2 block text-sm text-zinc-700">
                  优先级
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {priorityItems.map((item) => (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={item.value}
                        defaultChecked={item.value === "NORMAL"}
                        className="h-4 w-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isPending ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingTodo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">编辑事项</h3>
              <p className="text-sm text-zinc-500">
                {formatSelectedDate(new Date(editingTodo.date))}
              </p>
            </div>
            <form action={submitEditTodo} className="space-y-3">
              <input type="hidden" name="id" value={String(editingTodo.id)} />
              <div>
                <label htmlFor="edit-title" className="mb-1 block text-sm text-zinc-700">
                  标题
                </label>
                <input
                  id="edit-title"
                  name="title"
                  required
                  maxLength={60}
                  defaultValue={editingTodo.title}
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="edit-content" className="mb-1 block text-sm text-zinc-700">
                  内容
                </label>
                <textarea
                  id="edit-content"
                  name="content"
                  rows={4}
                  defaultValue={editingTodo.content}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <p className="mb-2 block text-sm text-zinc-700">优先级</p>
                <div className="grid grid-cols-2 gap-2">
                  {priorityItems.map((item) => (
                    <label
                      key={`edit-${item.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={item.value}
                        defaultChecked={item.value === editingTodo.priority}
                        className="h-4 w-4"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletingTodoId(editingTodo.id)}
                  disabled={isPending}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  删除事项
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isPending ? "保存中..." : "保存修改"}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingTodoId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-zinc-900">确认删除</h3>
            <p className="mt-2 text-sm text-zinc-600">确认删除该事项？此操作不可撤销。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTodoId(null)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitDeleteTodo}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
