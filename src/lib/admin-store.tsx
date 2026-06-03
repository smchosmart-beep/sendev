import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface AppEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  description: string;
}

export type PostType = "notice" | "project";

export interface Post {
  id: string;
  categoryId: string;
  type: PostType;
  title: string;
  author: string;
}

interface AdminStore {
  categories: Category[];
  addCategory: (data: { name: string; description: string }) => void;
  updateCategory: (id: string, data: { name: string; description: string }) => void;
  removeCategory: (id: string) => void;
  events: AppEvent[];
  posts: Post[];
  globalPassword: string;
  changePassword: (next: string) => void;
}

const initialCategories: Category[] = [
  { id: "c1", name: "입문형", description: "처음 개발에 도전하는 선생님들을 위한 게시판" },
  { id: "c2", name: "성장형", description: "한 단계 더 깊이 있는 프로젝트를 공유하는 게시판" },
];

function isoDate(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const now = new Date();
const initialEvents: AppEvent[] = [
  {
    id: "e1",
    title: "교사 개발자 정기 모임",
    date: isoDate(now.getFullYear(), now.getMonth(), 10),
    time: "오후 4:00 - 6:00",
    location: "서울시교육청 본관 3층 세미나실",
    description: "이번 달 산출물 공유 및 네트워킹. 노트북을 지참해주세요.",
  },
  {
    id: "e2",
    title: "산출물 제출 마감",
    date: isoDate(now.getFullYear(), now.getMonth(), 20),
    time: "오후 11:59",
    location: "온라인 제출",
    description: "성장형 게시판 프로젝트 산출물 제출 마감일입니다.",
  },
  {
    id: "e3",
    title: "입문형 워크숍",
    date: isoDate(now.getFullYear(), now.getMonth(), 25),
    time: "오전 10:00 - 오후 1:00",
    location: "온라인 (Zoom)",
    description: "Git/GitHub 기초와 README 작성법을 함께 배워봅니다.",
  },
];

const initialPosts: Post[] = [
  { id: "p1", categoryId: "c1", type: "notice", title: "입문형 게시판 이용 안내", author: "운영진" },
  { id: "p2", categoryId: "c1", type: "project", title: "나의 첫 출석부 앱", author: "김교사" },
  { id: "p3", categoryId: "c1", type: "project", title: "수학 퀴즈 메이커", author: "이교사" },
  { id: "p4", categoryId: "c2", type: "notice", title: "성장형 평가 기준 공지", author: "운영진" },
  { id: "p5", categoryId: "c2", type: "project", title: "학급 일정 자동화 봇", author: "박교사" },
];

const AdminStoreContext = createContext<AdminStore | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [events] = useState<AppEvent[]>(initialEvents);
  const [posts] = useState<Post[]>(initialPosts);
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
      events,
      posts,
      globalPassword,
      changePassword: (next) => setGlobalPassword(next),
    }),
    [categories, events, posts, globalPassword],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return ctx;
}
