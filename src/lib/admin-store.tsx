import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface Category {
  id: string;
  name: string;
  description: string;
}

interface AdminStore {
  categories: Category[];
  addCategory: (data: { name: string; description: string }) => void;
  updateCategory: (id: string, data: { name: string; description: string }) => void;
  removeCategory: (id: string) => void;
  globalPassword: string;
  changePassword: (next: string) => void;
}

const initialCategories: Category[] = [
  { id: "c1", name: "입문형", description: "처음 개발에 도전하는 선생님들을 위한 게시판" },
  { id: "c2", name: "성장형", description: "한 단계 더 깊이 있는 프로젝트를 공유하는 게시판" },
];

const AdminStoreContext = createContext<AdminStore | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [globalPassword, setGlobalPassword] = useState("seoul2025");

  const value = useMemo<AdminStore>(
    () => ({
      categories,
      addCategory: ({ name, description }) =>
        setCategories((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name, description },
        ]),
      updateCategory: (id, data) =>
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
        ),
      removeCategory: (id) => setCategories((prev) => prev.filter((c) => c.id !== id)),
      globalPassword,
      changePassword: (next) => setGlobalPassword(next),
    }),
    [categories, globalPassword],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
