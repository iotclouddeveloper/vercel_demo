export type TodoPriority = "NORMAL" | "URGENT" | "IMPORTANT" | "URGENT_IMPORTANT";
export type LocalTodo = { id: number; title: string; content: string; date: string; priority: TodoPriority; categoryId: number };
type Result = { error?: string };
const key = "shiguang-demo-todos";
export function readTodos(): LocalTodo[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function save(todos: LocalTodo[]): Result {
  try { localStorage.setItem(key, JSON.stringify(todos)); return {}; }
  catch { return { error: "无法保存，请检查浏览器存储空间和权限" }; }
}
export async function createCalendarTodo(_: Result, data: FormData): Promise<Result> {
  const title = String(data.get("title") ?? "").trim();
  if (!title || title.length > 60) return { error: "标题需要填写 1–60 个字符" };
  return save([...readTodos(), { id: Date.now(), title, content: String(data.get("content") ?? ""), date: new Date(`${data.get("date")}T12:00:00`).toISOString(), priority: data.get("priority") as TodoPriority, categoryId: Number(data.get("categoryId")) }]);
}
export async function updateCalendarTodo(_: Result, data: FormData): Promise<Result> {
  const title = String(data.get("title") ?? "").trim();
  if (!title || title.length > 60) return { error: "标题需要填写 1–60 个字符" };
  return save(readTodos().map(todo => todo.id === Number(data.get("id")) ? { ...todo, title, content: String(data.get("content") ?? ""), priority: data.get("priority") as TodoPriority } : todo));
}
export async function deleteCalendarTodo(_: Result, data: FormData): Promise<Result> {
  return save(readTodos().filter(todo => todo.id !== Number(data.get("id"))));
}
export async function copyCalendarTodoToDate(id: number, date: string): Promise<Result> {
  const todos = readTodos(); const source = todos.find(todo => todo.id === id);
  if (!source) return { error: "事项不存在" };
  const target = new Date(`${date}T12:00:00`).toISOString();
  if (target === source.date) return {};
  return save([...todos, { ...source, id: Date.now(), date: target }]);
}
