import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "교사 개발자 플랫폼" },
      {
        name: "description",
        content: "서울시교육청 소속 교사 개발자들을 위한 프로젝트 산출물 공유 및 행사 관리 플랫폼.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-md">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">교사 개발자 플랫폼</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          관리자 대시보드에서 게시판과 공용 비밀번호를 관리할 수 있어요.
        </p>
        <Link
          to="/admin/categories"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          관리자 대시보드로 이동
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
