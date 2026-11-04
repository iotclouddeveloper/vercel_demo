"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  createCategoryAction,
  deleteCategoryAction,
  type ChangePasswordState,
  logoutAction,
  updateCategoryAction,
} from "@/app/actions";

const initialState: ChangePasswordState = {};

type CategoryItem = {
  id: number;
  name: string;
};

type HeaderActionsProps = {
  categories: CategoryItem[];
  selectedCategoryId: number;
};

export function HeaderActions({ categories, selectedCategoryId }: HeaderActionsProps) {
  const [openPassword, setOpenPassword] = useState(false);
  const [openCategoryManage, setOpenCategoryManage] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [isPendingCategoryAction, startCategoryTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const router = useRouter();

  const hasCategories = categories.length > 0;
  const selected = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? categories[0],
    [categories, selectedCategoryId],
  );

  function switchCategory(categoryId: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("categoryId", String(categoryId));
    router.replace(`/?${params.toString()}`);
  }

  function createCategory() {
    const name = newCategoryName;
    startCategoryTransition(async () => {
      const result = await createCategoryAction(name);
      if (result.error) {
        setCategoryError(result.error);
        return;
      }
      setCategoryError("");
      setNewCategoryName("");
      router.refresh();
    });
  }

  function updateCategory() {
    if (!editingCategory) {
      return;
    }
    startCategoryTransition(async () => {
      const result = await updateCategoryAction(editingCategory.id, editingCategory.name);
      if (result.error) {
        setCategoryError(result.error);
        return;
      }
      setCategoryError("");
      setEditingCategory(null);
      router.refresh();
    });
  }

  function deleteCategory(id: number) {
    startCategoryTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (result.error) {
        setCategoryError(result.error);
        return;
      }
      setCategoryError("");
      if (id === selectedCategoryId) {
        const next = categories.find((item) => item.id !== id);
        if (next) {
          switchCategory(next.id);
        }
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={selected?.id ?? ""}
          onChange={(event) => switchCategory(Number(event.target.value))}
          className="h-9 min-w-28 rounded-md border-2 border-zinc-400 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-800 shadow-sm outline-none transition focus:border-zinc-700 focus:bg-white focus:ring-2 focus:ring-zinc-300"
          disabled={!hasCategories}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpenCategoryManage(true)}
          className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          类型管理
        </button>
        <button
          type="button"
          onClick={() => setOpenPassword(true)}
          className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          修改密码
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            退出登录
          </button>
        </form>
      </div>

      {openCategoryManage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">类型管理</h3>
              <p className="text-sm text-zinc-500">支持新增、修改、删除类型。</p>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="新增类型名称"
                className="h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={isPendingCategoryAction}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                新增
              </button>
            </div>

            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {categories.map((category) => {
                const isEditing = editingCategory?.id === category.id;
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    {isEditing ? (
                      <input
                        value={editingCategory.name}
                        onChange={(event) =>
                          setEditingCategory({
                            id: category.id,
                            name: event.target.value,
                          })
                        }
                        className="h-8 flex-1 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
                      />
                    ) : (
                      <p className="flex-1 text-sm text-zinc-800">{category.name}</p>
                    )}
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={updateCategory}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCategory({ id: category.id, name: category.name })
                          }
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category.id)}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {categoryError ? (
              <p className="mt-3 text-sm text-red-600">{categoryError}</p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpenCategoryManage(false);
                  setCategoryError("");
                  setEditingCategory(null);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openPassword ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">修改密码</h3>
              <p className="text-sm text-zinc-500">修改成功后将自动退出登录。</p>
            </div>
            <form action={formAction} className="space-y-3">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-1 block text-sm text-zinc-700"
                >
                  当前密码
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm text-zinc-700">
                  新密码
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm text-zinc-700"
                >
                  确认新密码
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                />
              </div>
              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpenPassword(false)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isPending ? "提交中..." : "确认修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
