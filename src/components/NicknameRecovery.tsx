import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  getRecoveryQuestion,
  recoverNicknamePassword,
  setRecoveryQuestion,
} from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Shown on the dashboard (after nickname login). Lets the verified owner set or
// update their recovery question/answer, used later for self-service recovery.
export function RecoveryQuestionCard({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const setFn = useServerFn(setRecoveryQuestion);

  const mutation = useMutation({
    mutationFn: (input: { question: string; answer: string }) =>
      setFn({ data: { username, password, ...input } }),
    onSuccess: () => {
      toast.success("복구 질문을 저장했어요. 비밀번호 분실 시 사용할 수 있어요.");
      setAnswer("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "저장에 실패했어요."),
  });

  const onSave = () => {
    const q = question.trim();
    const a = answer.trim();
    if (q.length < 2) {
      toast.error("복구 질문을 입력해주세요.");
      return;
    }
    if (a.length < 1) {
      toast.error("복구 답변을 입력해주세요.");
      return;
    }
    mutation.mutate({ question: q, answer: a });
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            복구 질문 설정
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            비밀번호를 잊어버려도 이 질문에 답하면 본인이 직접 새 비밀번호로
            재설정할 수 있어요. 답변은 안전하게 암호화되어 저장됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="rq-question">복구 질문</Label>
          <Input
            id="rq-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예) 내가 가장 좋아하는 음식은?"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rq-answer">복구 답변</Label>
          <Input
            id="rq-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변 (대소문자·공백 무시)"
            maxLength={200}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            개인정보(주민번호·전화번호 등)는 입력하지 마세요.
          </p>
        </div>
        <Button onClick={onSave} disabled={mutation.isPending} className="w-full">
          {mutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          복구 질문 저장
        </Button>
      </div>
    </Card>
  );
}

// Triggered from the login form ("비밀번호를 잊으셨나요?"). Three steps:
// 1) enter nickname -> fetch its recovery question
// 2) answer + new password -> reset
type Step = "nickname" | "reset";

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("nickname");
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const getQ = useServerFn(getRecoveryQuestion);
  const recover = useServerFn(recoverNicknamePassword);

  const reset = () => {
    setStep("nickname");
    setQuestion("");
    setAnswer("");
    setNewPassword("");
  };

  const lookupMutation = useMutation({
    mutationFn: (u: string) => getQ({ data: { username: u } }),
    onSuccess: (res) => {
      if (!res.question) {
        toast.error(
          "이 닉네임에는 복구 질문이 없어요. 관리자에게 초기화를 요청해주세요.",
        );
        return;
      }
      setQuestion(res.question);
      setStep("reset");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "조회에 실패했어요."),
  });

  const recoverMutation = useMutation({
    mutationFn: (input: { answer: string; newPassword: string }) =>
      recover({ data: { username: username.trim(), ...input } }),
    onSuccess: () => {
      toast.success("새 비밀번호로 재설정했어요. 이제 로그인할 수 있어요.");
      setOpen(false);
      reset();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "재설정에 실패했어요."),
  });

  const onLookup = () => {
    const u = username.trim();
    if (!u) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    lookupMutation.mutate(u);
  };

  const onReset = () => {
    if (!answer.trim()) {
      toast.error("복구 답변을 입력해주세요.");
      return;
    }
    if (newPassword.trim().length < 4) {
      toast.error("새 비밀번호는 4자 이상으로 입력해주세요.");
      return;
    }
    recoverMutation.mutate({
      answer: answer.trim(),
      newPassword: newPassword.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          비밀번호를 잊으셨나요?
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            비밀번호 찾기
          </DialogTitle>
          <DialogDescription>
            {step === "nickname"
              ? "복구 질문을 설정한 닉네임만 본인이 직접 재설정할 수 있어요."
              : "복구 질문에 답하고 새 비밀번호를 설정하세요."}
          </DialogDescription>
        </DialogHeader>

        {step === "nickname" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fp-username">닉네임</Label>
              <Input
                id="fp-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="비밀번호를 잊은 닉네임"
                maxLength={100}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onLookup();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">복구 질문: </span>
              <span className="font-medium text-foreground">{question}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-answer">답변</Label>
              <Input
                id="fp-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="복구 답변 (대소문자·공백 무시)"
                maxLength={200}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-newpw">새 비밀번호</Label>
              <PasswordInput
                id="fp-newpw"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (4자 이상)"
                maxLength={200}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "reset" && (
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="rounded-xl"
            >
              뒤로
            </Button>
          )}
          {step === "nickname" ? (
            <Button
              type="button"
              onClick={onLookup}
              disabled={lookupMutation.isPending}
              className="rounded-xl"
            >
              {lookupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              다음
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onReset}
              disabled={recoverMutation.isPending}
              className="rounded-xl"
            >
              {recoverMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              비밀번호 재설정
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
