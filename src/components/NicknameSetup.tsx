import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

interface NicknameSetupProps {
  // "icon" renders a compact header button; "menu" renders a full-width row.
  variant?: "icon" | "menu";
  // Called after the dialog is opened from a menu, so the parent sheet can close.
  onOpened?: () => void;
}

// Recommended (never forced) nickname setup. Stores a nickname + nickname
// password in this browser so post/comment forms auto-fill them. No account.
export function NicknameSetup({ variant = "icon", onOpened }: NicknameSetupProps) {
  const { identity, save, clear } = useStoredIdentity();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [nicknamePassword, setNicknamePassword] = useState("");
  const [nicknamePasswordConfirm, setNicknamePasswordConfirm] = useState("");

  // Confirm field only matters when registering a new nickname (none stored).
  const isNewRegistration = !identity?.author;

  // Sync form fields whenever the dialog opens with the latest stored values.
  useEffect(() => {
    if (open) {
      setAuthor(identity?.author ?? "");
      setNicknamePassword(identity?.nicknamePassword ?? "");
      setNicknamePasswordConfirm("");
    }
  }, [open, identity]);

  const openDialog = () => {
    setOpen(true);
    onOpened?.();
  };

  const handleSave = () => {
    const name = author.trim();
    if (!name) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    if (nicknamePassword.trim().length < 4) {
      toast.error("닉네임 비밀번호는 4자 이상으로 입력해주세요.");
      return;
    }
    save(name, nicknamePassword.trim());
    toast.success("닉네임이 이 기기에 저장되었어요.");
    setOpen(false);
  };

  const handleClear = () => {
    clear();
    setAuthor("");
    setNicknamePassword("");
    toast.success("저장된 닉네임을 지웠어요.");
    setOpen(false);
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={openDialog}
          aria-label="내 닉네임 설정"
          className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:flex"
        >
          <UserRound className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          )}
        >
          <UserRound className="h-5 w-5" />
          <span className="min-w-0">
            내 닉네임 설정
            {identity?.author && (
              <span className="block truncate text-xs text-muted-foreground/80">
                현재: {identity.author}
              </span>
            )}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>내 닉네임 설정 (선택)</DialogTitle>
            <DialogDescription>
              닉네임과 비밀번호를 한 번 저장해두면 글·댓글 작성 시 자동으로 채워져요.
              이 기기에만 저장되며, 언제든 지울 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nick-name">닉네임</Label>
              <Input
                id="nick-name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="사용할 닉네임"
                maxLength={100}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nick-pw">닉네임 비밀번호</Label>
              <Input
                id="nick-pw"
                type="password"
                value={nicknamePassword}
                onChange={(e) => setNicknamePassword(e.target.value)}
                placeholder="이 닉네임을 보호할 비밀번호 (4자 이상)"
                maxLength={100}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                이 닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 인증합니다.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {identity?.author ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="rounded-xl text-muted-foreground"
              >
                저장 지우기
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={handleSave} className="rounded-xl active:scale-95">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
