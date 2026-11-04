import { prisma } from "@/lib/prisma";

const defaultCategoryNames = ["工作", "学习", "小孩"] as const;

export async function ensureDefaultCategories() {
  const existingCount = await prisma.category.count();
  if (existingCount === 0) {
    for (const [index, name] of defaultCategoryNames.entries()) {
      await prisma.category.create({
        data: { name, sortOrder: index },
      });
    }
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const fallback = categories[0];
  if (fallback) {
    await prisma.todo.updateMany({
      where: { categoryId: null },
      data: { categoryId: fallback.id },
    });
  }

  return categories;
}
