"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(60, "标题过长"),
  content: z.string().trim().max(1000, "内容过长"),
  priority: z.enum(["NORMAL", "URGENT", "IMPORTANT", "URGENT_IMPORTANT"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.coerce.number().int().positive(),
});

export type CreateTodoState = {
  error?: string;
};

export type UpdateTodoState = {
  error?: string;
};

export type DeleteTodoState = {
  error?: string;
};

export type CopyTodoState = {
  error?: string;
};

function dateKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const updateTodoSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1, "标题不能为空").max(60, "标题过长"),
  content: z.string().trim().max(1000, "内容过长"),
  priority: z.enum(["NORMAL", "URGENT", "IMPORTANT", "URGENT_IMPORTANT"]),
});

const deleteTodoSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

export async function createCalendarTodo(
  _prevState: CreateTodoState,
  formData: FormData,
): Promise<CreateTodoState> {
  await requireAuth();

  const parsed = createTodoSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    priority: formData.get("priority"),
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "表单校验失败",
    };
  }

  const date = new Date(`${parsed.data.date}T12:00:00`);
  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) {
    return { error: "分类不存在，请刷新页面重试" };
  }

  await prisma.todo.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
      date,
      categoryId: parsed.data.categoryId,
    },
  });

  return {};
}

export async function updateCalendarTodo(
  _prevState: UpdateTodoState,
  formData: FormData,
): Promise<UpdateTodoState> {
  await requireAuth();

  const parsed = updateTodoSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    content: formData.get("content"),
    priority: formData.get("priority"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "表单校验失败",
    };
  }

  await prisma.todo.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
    },
  });

  return {};
}

export async function deleteCalendarTodo(
  _prevState: DeleteTodoState,
  formData: FormData,
): Promise<DeleteTodoState> {
  await requireAuth();

  const parsed = deleteTodoSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "参数不合法",
    };
  }

  try {
    await prisma.todo.delete({
      where: { id: parsed.data.id },
    });
  } catch {
    return { error: "删除失败，请稍后重试。" };
  }

  return {};
}

const copyTodoSchema = z.object({
  sourceId: z.coerce.number().int().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** 将事项复制到目标日期（原事项保留）；拖到同一天则不操作。 */
export async function copyCalendarTodoToDate(
  sourceId: number,
  targetDate: string,
): Promise<CopyTodoState> {
  await requireAuth();

  const parsed = copyTodoSchema.safeParse({ sourceId, targetDate });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "参数不合法" };
  }

  const source = await prisma.todo.findUnique({
    where: { id: parsed.data.sourceId },
  });
  if (!source) {
    return { error: "事项不存在" };
  }

  if (!source.categoryId) {
    return { error: "事项缺少分类，无法复制" };
  }

  const sourceKey = dateKeyFromDate(source.date);
  if (sourceKey === parsed.data.targetDate) {
    return {};
  }

  const newDate = new Date(`${parsed.data.targetDate}T12:00:00`);

  await prisma.todo.create({
    data: {
      title: source.title,
      content: source.content,
      priority: source.priority,
      date: newDate,
      categoryId: source.categoryId,
    },
  });

  return {};
}
