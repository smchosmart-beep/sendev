// 08 사례집 출력 — 미리보기 + 브라우저 인쇄(PDF 저장)
import { Printer } from "lucide-react";

import { CasebookDocument } from "@/components/record/CasebookDocument";
import { Button } from "@/components/ui/button";
import type { RecordOverviewTeam } from "@/lib/record.functions";

export function CasebookOutput({ team }: { team: RecordOverviewTeam }) {
  return (
    <section className="casebook-root space-y-4 rounded-2xl bg-card p-5 shadow-sm sm:p-6">
      <div className="casebook-ui flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold text-foreground">08 사례집 출력</h2>
          <p className="text-xs text-muted-foreground">
            작성한 내용을 A4 지면으로 조판해 보여 줍니다. 인쇄 대화상자에서 &lsquo;PDF로 저장&rsquo;을
            고르고 배경 그래픽 옵션을 켜면 그대로 저장돼요.
          </p>
        </div>
        <Button type="button" size="sm" className="rounded-xl" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          인쇄·PDF 저장
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl bg-muted/30 p-3">
        <CasebookDocument team={team} />
      </div>
    </section>
  );
}
