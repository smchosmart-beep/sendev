import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useAdminStore } from "@/lib/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { globalPassword, changePassword } = useAdminStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.trim().length < 4) {
      toast.error("새 비밀번호는 4자 이상이어야 해요.");
      return;
    }
    if (next !== confirm) {
      toast.error("새 비밀번호가 일치하지 않아요.");
      return;
    }
    changePassword(next.trim());
    setNext("");
    setConfirm("");
    toast.success("공용 비밀번호가 변경되었어요.");
  };

  return (
    <div className="mx-auto max-w-xl">
      <section className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">공용 입장 비밀번호 변경</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          사이트 접속 시 사용하는 공용 비밀번호를 변경할 수 있어요.
        </p>

        <div className="mb-6 space-y-2">
          <Label>현재 비밀번호</Label>
          <div className="relative">
            <Input
              readOnly
              type={showCurrent ? "text" : "password"}
              value={globalPassword}
              className="rounded-xl bg-muted pr-12"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-95"
              aria-label="현재 비밀번호 표시 전환"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="next">새 비밀번호</Label>
            <Input
              id="next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="새 비밀번호 (4자 이상)"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">새 비밀번호 확인</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="새 비밀번호를 다시 입력"
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            비밀번호 변경
          </Button>
        </form>
      </section>
    </div>
  );
}
