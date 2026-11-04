import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CalendarWidget } from "@/components/cards/CalendarWidget";
import { HeaderActions } from "@/components/header/HeaderActions";
import { ensureDefaultCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

type HomePageProps = {
  searchParams?: Promise<{ categoryId?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const resolvedSearchParams = await searchParams;
  const categories = await ensureDefaultCategories();
  const selectedCategoryIdFromQuery = Number(resolvedSearchParams?.categoryId);
  const selectedCategory =
    categories.find((item) => item.id === selectedCategoryIdFromQuery) ?? categories[0];

  const now = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const todos = await prisma.todo.findMany({
    where: {
      categoryId: selectedCategory?.id,
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      date: true,
      priority: true,
    },
  });

  return (
    <main className="h-screen overflow-hidden bg-zinc-50 p-2 sm:p-3">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-2">
        <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">
              拾光-一个集日历查看与事项记录于一体的日程管理工具
            </h1>
            <p className="text-[11px] text-zinc-500">{now}</p>
          </div>
          <HeaderActions
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
            }))}
            selectedCategoryId={selectedCategory?.id ?? 0}
          />
        </header>

        <div className="min-h-0 flex-1">
          <CalendarWidget
            todos={todos.map((todo) => ({
              id: todo.id,
              title: todo.title,
              content: todo.content,
              date: todo.date.toISOString(),
              priority: todo.priority,
            }))}
            selectedCategoryId={selectedCategory?.id ?? 0}
          />
        </div>
      </div>
    </main>
  );
}
