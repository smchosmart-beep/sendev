import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "sendev:copyright-notice-dismissed";

const NOTICE_ITEMS = [
  {
    title: "저작권의 귀속",
    body: "선생님께서 sendev.kr에 직접 기획·집필·개발하여 게시한 강의 원고, PPT, 소스 코드 등의 모든 저작권(저작인격권 및 저작재산권)은 본래의 개발자(집필 교사) 본인에게 있습니다.",
  },
  {
    title: "플랫폼 내 이용 허락",
    body: "원활한 서비스 제공을 위해, 등록된 게시물은 sendev.kr 플랫폼 내에서 노출·보관·커뮤니티 활성화를 위한 홍보 목적으로 무상 활용될 수 있습니다.",
  },
  {
    title: "코드의 공유와 면책",
    body: "본 커뮤니티는 선생님들의 자발적인 지식 공유를 지향합니다. 단, 공유된 소스 코드나 자료를 활용하여 발생하는 결과에 대한 책임은 전적으로 활용자 본인에게 있으며, 플랫폼 및 원작자는 법적 책임을 지지 않습니다. 올바른 공유 문화를 위해 오픈소스 라이선스(예: MIT, CC-BY 등) 표기를 권장합니다.",
  },
];

// 게시글 작성 화면 진입 시 저작권·게시물 이용 안내를 보여주는 팝업.
// "다시 보지 않기"를 체크하면 이 브라우저(localStorage)에 한 번만 저장된다.
export function CopyrightNoticeDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // localStorage를 쓸 수 없는 환경이면 그냥 닫는다.
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>저작권 및 게시물 이용 안내</DialogTitle>
          <DialogDescription>
            게시글을 작성하기 전에 아래 내용을 확인해 주세요.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm leading-relaxed text-foreground">
          {NOTICE_ITEMS.map((item, idx) => (
            <li key={item.title}>
              <p className="font-semibold">
                {idx + 1}. {item.title}
              </p>
              <p className="mt-1 text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>

        <DialogFooter className="mt-2 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="copyright-dont-show"
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            <Label
              htmlFor="copyright-dont-show"
              className="cursor-pointer text-sm font-normal text-muted-foreground"
            >
              다시 보지 않기
            </Label>
          </div>
          <Button onClick={handleConfirm} className="rounded-xl active:scale-95">
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
