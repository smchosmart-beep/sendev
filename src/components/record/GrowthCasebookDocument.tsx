// 07 사례집 출력 — 표지 + 01 프로젝트 + 02 문제와 해결 + 03 결과물 + 04 검토 및 개선 + 05 성찰과 성장 (A4 조판)
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GROWTH_FIX_KIND_LABELS,
  GROWTH_FIX_TYPES,
  growthFixDone,
  type GrowthReceivedFeedback,
  type GrowthRecordData,
} from "@/lib/record-growth-schema";

const clean = (items: string[]) => items.map((i) => (i ?? "").trim()).filter(Boolean);

function Show({ value, fallback = "아직 입력하지 않았습니다." }: { value: string; fallback?: string }) {
  if ((value ?? "").trim()) return <p className="casebook-p">{value}</p>;
  return <p className="casebook-p text-muted-foreground">{fallback}</p>;
}

function GrowthDoc({
  data,
  author,
  received = [],
}: {
  data: GrowthRecordData;
  author: string;
  received?: GrowthReceivedFeedback[];
}) {
  const features = clean(data.features);
  const flow = clean(data.flow);
  const ethics = clean(data.ethics);
  const review = data.review;
  return (
    <div className="casebook-doc">
      {/* 표지 */}
      <article className="casebook-page casebook-cover">
        <div className="casebook-cover-top">Growth Record · Individual</div>
        <h3 className="casebook-title">{data.projectName || "제목 없는 프로젝트"}</h3>
        <p className="casebook-lead">{data.oneLine || "한 줄 소개를 입력해 주세요."}</p>
        <div className="casebook-cover-meta">
          <div className="casebook-cover-member">
            <span className="casebook-cover-member-name">{author}</span>
            <span className="casebook-cover-member-meta">개인 성장형 활동기록</span>
          </div>
          <div className="casebook-badges">
            {data.primaryUser && <span className="casebook-badge">{data.primaryUser}</span>}
            {data.resultType && <span className="casebook-badge">{data.resultType}</span>}
            {data.status && <span className="casebook-badge">{data.status}</span>}
          </div>
        </div>
      </article>

      {/* 01 프로젝트 */}
      <article className="casebook-page">
        <div className="casebook-body">
          <h2 className="casebook-h2">
            <span className="casebook-no">01</span> 나의 프로젝트
          </h2>
          <dl className="casebook-dl casebook-grid">
            <div className="casebook-field">
              <dt>프로젝트명</dt>
              <dd>{data.projectName || "미입력"}</dd>
            </div>
            <div className="casebook-field">
              <dt>주 사용자</dt>
              <dd>{data.primaryUser || "미입력"}</dd>
            </div>
            <div className="casebook-field">
              <dt>문제 영역</dt>
              <dd>{data.problemArea || "미입력"}</dd>
            </div>
            <div className="casebook-field">
              <dt>결과물 형태</dt>
              <dd>{data.resultType || "미입력"}</dd>
            </div>
          </dl>
          <div className="casebook-block">
            <h3 className="casebook-h3">한 줄 소개</h3>
            <Show value={data.oneLine} />
          </div>
        </div>
        <footer className="casebook-foot">
          <span>{data.projectName || "성장형 활동기록"}</span>
          <span>01 · 나의 프로젝트</span>
        </footer>
      </article>

      {/* 02 문제와 해결 */}
      <article className="casebook-page">
        <div className="casebook-body">
          <h2 className="casebook-h2">
            <span className="casebook-no">02</span> 문제와 해결
          </h2>
          <div className="casebook-block">
            <h3 className="casebook-h3">해결하려는 문제</h3>
            <Show value={data.problemText} />
          </div>
          <div className="casebook-block">
            <h3 className="casebook-h3">문제를 발견한 경험</h3>
            <Show value={data.evidence} />
          </div>
          <div className="casebook-grid">
            <div className="casebook-block">
              <h3 className="casebook-h3">해결 아이디어</h3>
              <Show value={data.solution} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">기대하는 변화</h3>
              <Show value={data.expectedChange} />
            </div>
          </div>
        </div>
        <footer className="casebook-foot">
          <span>{data.projectName || "성장형 활동기록"}</span>
          <span>02 · 문제와 해결</span>
        </footer>
      </article>

      {/* 03 결과물 */}
      <article className="casebook-page">
        <div className="casebook-body">
          <h2 className="casebook-h2">
            <span className="casebook-no">03</span> 결과물
          </h2>
          {data.heroImageUrl && (
            <img className="casebook-figure" src={data.heroImageUrl} alt="결과물 대표 이미지" />
          )}
          <dl className="casebook-dl casebook-grid">
            <div className="casebook-field">
              <dt>완성 상태</dt>
              <dd>{data.status || "미입력"}</dd>
            </div>
            <div className="casebook-field">
              <dt>사용한 도구</dt>
              <dd>{data.tools || "미입력"}</dd>
            </div>
            {data.resultUrl && (
              <div className="casebook-field">
                <dt>배포 주소</dt>
                <dd>
                  <a href={data.resultUrl} target="_blank" rel="noreferrer">
                    {data.resultUrl}
                  </a>
                </dd>
              </div>
            )}
            {data.githubUrl && (
              <div className="casebook-field">
                <dt>GitHub 저장소</dt>
                <dd>
                  <a href={data.githubUrl} target="_blank" rel="noreferrer">
                    {data.githubUrl}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="casebook-block">
            <h3 className="casebook-h3">핵심 기능</h3>
            {features.length ? (
              <ul className="casebook-list">
                {features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            ) : (
              <p className="casebook-p text-muted-foreground">아직 입력하지 않았습니다.</p>
            )}
          </div>
          <div className="casebook-block">
            <h3 className="casebook-h3">사용 흐름</h3>
            {flow.length ? (
              <ol className="casebook-list">
                {flow.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            ) : (
              <p className="casebook-p text-muted-foreground">아직 입력하지 않았습니다.</p>
            )}
          </div>
        </div>
        <footer className="casebook-foot">
          <span>{data.projectName || "성장형 활동기록"}</span>
          <span>03 · 결과물</span>
        </footer>
      </article>

      {/* 04 검토 및 개선 */}
      <article className="casebook-page">
        <div className="casebook-body">
          <h2 className="casebook-h2">
            <span className="casebook-no">04</span> 검토 및 개선
          </h2>
          {(["self", "ai", "peer"] as const).map((kind) => {
            const label = GROWTH_FIX_KIND_LABELS[kind];
            const fix = review?.[kind].fix;
            return (
              <div className="casebook-block" key={kind}>
                <h3 className="casebook-h3">{label}</h3>
                {fix && growthFixDone(fix) ? (
                  <ul className="casebook-list">
                    <li>
                      <strong>고친 것</strong>
                      <p className="mt-1">{fix.what}</p>
                    </li>
                    <li>
                      <strong>어떻게 고쳤나(전 → 후)</strong>
                      <p className="mt-1">{fix.how}</p>
                    </li>
                    {fix.skipped.trim() && (
                      <li>
                        <strong>고치지 않기로 한 것과 이유</strong>
                        <p className="mt-1">{fix.skipped}</p>
                      </li>
                    )}
                    <li>
                      분류: {GROWTH_FIX_TYPES.find((t) => t.value === fix.type)?.label ?? ""}
                    </li>
                  </ul>
                ) : (
                  <p className="casebook-p text-muted-foreground">아직 입력하지 않았습니다.</p>
                )}
              </div>
            );
          })}
          <div className="casebook-block">
            <h3 className="casebook-h3">AI 점검에서 답하지 못한 질문</h3>
            {review && review.ai.questions.some((q) => q.unanswered) ? (
              <ul className="casebook-list">
                {review.ai.questions
                  .filter((q) => q.unanswered)
                  .map((q, i) => (
                    <li key={i}>{q.q}</li>
                  ))}
              </ul>
            ) : (
              <p className="casebook-p text-muted-foreground">없음</p>
            )}
          </div>
          <div className="casebook-block">
            <h3 className="casebook-h3">동료가 남긴 말</h3>
            {received && received.length > 0 ? (
              <ul className="casebook-list">
                {received.map((r) => (
                  <li key={r.id}>
                    <strong>{r.fromName}</strong>
                    <p className="mt-1">
                      기대: {r.expected} / 실제: {r.actual}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="casebook-p text-muted-foreground">아직 받은 피드백이 없습니다.</p>
            )}
          </div>
        </div>
        <footer className="casebook-foot">
          <span>{data.projectName || "성장형 활동기록"}</span>
          <span>04 · 검토 및 개선</span>
        </footer>
      </article>

      {/* 05 성찰과 성장 */}
      <article className="casebook-page">
        <div className="casebook-body">
          <h2 className="casebook-h2">
            <span className="casebook-no">05</span> 성찰과 성장
          </h2>
          <div className="casebook-grid">
            <div className="casebook-block">
              <h3 className="casebook-h3">어려웠던 점</h3>
              <Show value={data.difficulty} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">해결 방법</h3>
              <Show value={data.resolution} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">AI에 맡긴 일</h3>
              <Show value={data.aiWork} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">사람이 확인한 일</h3>
              <Show value={data.humanCheck} />
            </div>
          </div>
          <div className="casebook-block">
            <h3 className="casebook-h3">교육적 점검</h3>
            <Show value={data.educationCheck} />
          </div>
          <div className="casebook-grid">
            <div className="casebook-block">
              <h3 className="casebook-h3">개인정보 처리</h3>
              <Show value={data.privacy} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">중요하게 생각한 원칙</h3>
              {ethics.length ? (
                <ul className="casebook-list">
                  {ethics.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : (
                <p className="casebook-p text-muted-foreground">아직 입력하지 않았습니다.</p>
              )}
            </div>
          </div>
          <div className="casebook-block">
            <h3 className="casebook-h3">나의 약속</h3>
            <Show value={data.promise} />
          </div>
          <div className="casebook-grid">
            <div className="casebook-block">
              <h3 className="casebook-h3">새롭게 할 수 있게 된 것</h3>
              <Show value={data.learned} />
            </div>
            <div className="casebook-block">
              <h3 className="casebook-h3">다음 계획</h3>
              <Show value={data.nextPlan} />
            </div>
          </div>
        </div>
        <footer className="casebook-foot">
          <span>{data.projectName || "성장형 활동기록"}</span>
          <span>05 · 성찰과 성장</span>
        </footer>
      </article>
    </div>
  );
}

export function GrowthCasebookOutput({
  data,
  author,
  received = [],
}: {
  data: GrowthRecordData;
  author: string;
  received?: GrowthReceivedFeedback[];
}) {
  return (
    <section className="casebook-root space-y-4">
      <div className="casebook-ui flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-muted-foreground">
          인쇄할 때 &lsquo;배경 그래픽&rsquo; 옵션을 켜면 화면의 색상이 함께 저장됩니다.
        </p>
        <Button type="button" size="sm" className="rounded-xl" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          인쇄·PDF 저장
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl bg-muted/30 p-3">
        <GrowthDoc data={data} author={author} received={received} />
      </div>
    </section>
  );
}
