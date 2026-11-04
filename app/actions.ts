"use server";

import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(6, "新密码至少 6 位"),
    confirmPassword: z.string().min(1, "请确认新密码"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = {
  error?: string;
};

type CategoryActionState = {
  error?: string;
};

const categoryNameSchema = z.string().trim().min(1, "类型名称不能为空").max(20, "类型名称过长");

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const admin = await prisma.adminAuth.findUnique({ where: { id: 1 } });
  if (!admin) {
    return { error: "管理员账号不存在" };
  }

  const isCurrentPasswordValid = await compare(
    parsed.data.currentPassword,
    admin.passwordHash,
  );
  if (!isCurrentPasswordValid) {
    return { error: "当前密码错误" };
  }

  const nextPasswordHash = await hash(parsed.data.newPassword, 12);
  await prisma.adminAuth.update({
    where: { id: 1 },
    data: { passwordHash: nextPasswordHash },
  });

  await signOut({ redirectTo: "/login" });
  return {};
}

export async function createCategoryAction(name: string): Promise<CategoryActionState> {
  await requireAuth();

  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "名称不合法" };
  }

  const exists = await prisma.category.findUnique({ where: { name: parsed.data } });
  if (exists) {
    return { error: "该类型已存在" };
  }

  const last = await prisma.category.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.category.create({
    data: {
      name: parsed.data,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return {};
}

export async function updateCategoryAction(
  id: number,
  name: string,
): Promise<CategoryActionState> {
  await requireAuth();

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "类型ID无效" };
  }

  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "名称不合法" };
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      name: parsed.data,
      NOT: { id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { error: "该类型名称已被使用" };
  }

  await prisma.category.update({
    where: { id },
    data: { name: parsed.data },
  });

  return {};
}

export async function deleteCategoryAction(id: number): Promise<CategoryActionState> {
  await requireAuth();

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "类型ID无效" };
  }

  const todoCount = await prisma.todo.count({ where: { categoryId: id } });
  if (todoCount > 0) {
    return { error: "删除失败，已经有事项。" };
  }

  await prisma.category.delete({ where: { id } });
  return {};
}
