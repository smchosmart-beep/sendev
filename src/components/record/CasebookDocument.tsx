// 활동기록 사례집 — A4 지면 조판(브라우저 인쇄 → PDF 저장)
import type { ReactNode } from "react";

import { ETHICS_PRINCIPLES } from "@/lib/record-ethics";
import { parseAttachments } from "@/lib/file-upload";
import { normalizeUrl } from "@/lib/record-readme";
import {
  ROW_SECTION_DEFS,
  STANCE_QUESTIONS,
  type RecordFinalKey,
  type RecordRowKindName,
} from "@/lib/record-schema";
import type { RecordOverviewTeam } from "@/lib/record.functions";

function val(team: RecordOverviewTeam, key: RecordFinalKey): string {
  const f = team.final as Record<string, string> | null;
  return (f?.[key] ?? "").trim();
}

function rowsOf(team: RecordOverviewTeam, kind: RecordRowKindName) {
  return team.rows
    .filter((r) => r.kind === kind)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function Page({
  team,
  section,
  children,
}: {
  team: RecordOverviewTeam;
  section: string;
  children: ReactNode;
}) {
  return (
    <section className="casebook-page">
      <div className="casebook-body">{children}</div>
      <footer className="casebook-foot">
        <span>{team.final?.serviceName?.trim() || team.teamName}</span>
        <span>{section}</span>
      </footer>
    </section>
  );
}

function Heading({ no, title }: { no: string; title: string }) {
  return (
    <h2 className="casebook-h2">
      <span className="casebook-no">{no}</span>
      {title}
    </h2>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="casebook-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function LinkBadge({ label, url }: { label: string; url: string }) {
  if (!url.trim()) return null;
  return (
    <a className="casebook-badge" href={normalizeUrl(url)}>
      {label}
    </a>
  );
}

function RowTable({
  team,
  kind,
  title,
  no,
}: {
  team: RecordOverviewTeam;
  kind: RecordRowKindName;
  title: string;
  no?: string;
}) {
  const rows = rowsOf(team, kind);
  if (rows.length === 0) return null;
  const def = ROW_SECTION_DEFS[kind];
  const cols = def?.cols ?? [];

  return (
    <div className="casebook-block">
      {no ? <Heading no={no} title={title} /> : <h3 className="casebook-h3">{title}</h3>}
      <ul className="casebook-cards">
        {rows.map((r, idx) => {
          const values = [r.col1, r.col2, r.col3, r.col4, r.col5, r.col6];
          const head = [r.subtype, r.author].filter((v) => (v ?? "").trim()).join(" · ");
          return (
            <li key={idx} className="casebook-card">
              <div className="casebook-card-head">
                <span className="casebook-card-no">{String(idx + 1).padStart(2, "0")}</span>
                {head ? <span className="casebook-card-sub">{head}</span> : null}
              </div>
              <dl className="casebook-dl">
                {values.map((v, i) => {
                  const text = (v ?? "").trim();
                  if (!text) return null;
                  const label = cols[i] || `항목 ${i + 1}`;
                  if (def?.linkCol === i) {
                    return (
                      <div key={i} className="casebook-field">
                        <dt>{label}</dt>
                        <dd>
                          <a href={normalizeUrl(text)}>{text}</a>
                        </dd>
                      </div>
                    );
                  }
                  if (def?.fileCol === i) {
                    const files = parseAttachments(text);
                    if (files.length === 0) return null;
                    return (
                      <div key={i} className="casebook-field">
                        <dt>{label}</dt>
                        <dd>{files.map((f) => f.name).join(", ")}</dd>
                      </div>
                    );
                  }
                  return <Field key={i} label={label} value={text} />;
                })}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CasebookDocument({ team }: { team: RecordOverviewTeam }) {
  const name = val(team, "serviceName") || team.teamName;
  const hero = val(team, "heroImageUrl");
  const stance = rowsOf(team, "stance");
  const ethics = team.ethics ?? [];

  const overviewFields: [string, string][] = [
    ["문제 영역", val(team, "problemArea")],
    ["주 사용자", val(team, "targetUser")],
    ["결과물 형태", val(team, "outputType")],
    ["배포 상태", val(team, "deployStatus")],
    ["사용 환경", val(team, "usageEnv")],
    ["태그", val(team, "tags")],
  ];

  const techFields: [string, string][] = [
    ["화면", val(team, "techScreen")],
    ["서버·백엔드", val(team, "techServer")],
    ["AI", val(team, "techAi")],
    ["저장소", val(team, "techStorage")],
    ["배포", val(team, "techDeploy")],
  ];

  const cautionFields: [string, string][] = [
    ["개인정보 처리 여부", val(team, "privacyStatus")],
    ["예상되는 위험", val(team, "riskExpected")],
    ["위험을 줄이려고 한 일", val(team, "riskMitigation")],
    ["멈춤 기준", val(team, "riskStop")],
    ["검증 방법", val(team, "riskTest")],
  ];

  const licenseFields: [string, string][] = [
    ["코드 라이선스", val(team, "licenseCode")],
    ["문서 라이선스", val(team, "licenseDocs")],
    ["외부 자료 출처", val(team, "licenseExternal")],
  ];

  const hasOverview =
    overviewFields.some(([, v]) => v) || val(team, "problem") || val(team, "solution");
  const hasResult =
    rowsOf(team, "feature").length > 0 ||
    rowsOf(team, "flow").length > 0 ||
    techFields.some(([, v]) => v) ||
    rowsOf(team, "limit").length > 0 ||
    rowsOf(team, "plan").length > 0 ||
    !!val(team, "currentScope");
  const hasProcess = rowsOf(team, "process").length > 0;
  const hasDevlog =
    rowsOf(team, "devlog").length > 0 ||
    rowsOf(team, "decision").length > 0 ||
    rowsOf(team, "stuck").length > 0;
  const hasCheck =
    stance.length > 0 || rowsOf(team, "ai_use").length > 0 || rowsOf(team, "ai_error").length > 0;
  const hasSafety = rowsOf(team, "privacy").length > 0 || cautionFields.some(([, v]) => v);
  const hasCredit =
    team.members.length > 0 || rowsOf(team, "maker").length > 0 || licenseFields.some(([, v]) => v);
  const hasReflection = team.reflections.length > 0;

  return (
    <article className="casebook-doc">
      {/* 표지 */}
      <section className="casebook-page casebook-cover">
        <div className="casebook-cover-top">활동기록 사례집</div>
        <h1 className="casebook-title">{name}</h1>
        {val(team, "oneLiner") ? (
          <p className="casebook-lead">{val(team, "oneLiner")}</p>
        ) : null}
        {hero ? (
          <img className="casebook-hero" src={hero} alt={`${name} 대표 이미지`} loading="eager" />
        ) : null}
        <div className="casebook-cover-meta">
          <div>
            <span className="casebook-meta-label">팀</span>
            {team.teamName} (No.{team.postNo})
          </div>
          {team.members.length > 0 ? (
            <div>
              <span className="casebook-meta-label">팀원</span>
              {team.members
                .map((m) =>
                  [m.username, m.affiliation, m.role].filter((v) => (v ?? "").trim()).join(" · "),
                )
                .join(", ")}
            </div>
          ) : null}
          <div>
            <span className="casebook-meta-label">발행</span>
            {new Date().toLocaleDateString("ko-KR")}
          </div>
        </div>
        <div className="casebook-badges">
          <LinkBadge label="바로 사용하기" url={val(team, "deployUrl")} />
          <LinkBadge label="소스코드" url={val(team, "githubUrl")} />
          <LinkBadge label="시연 보기" url={val(team, "demoVideoUrl")} />
        </div>
      </section>

      {/* 개요 */}
      {hasOverview ? (
        <Page team={team} section="개요">
          <Heading no="01" title="프로젝트 개요" />
          <dl className="casebook-dl casebook-grid">
            {overviewFields.map(([label, v]) => (
              <Field key={label} label={label} value={v} />
            ))}
          </dl>
          {val(team, "problem") ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">어떤 문제를 풀었나요?</h3>
              <p className="casebook-p">{val(team, "problem")}</p>
            </div>
          ) : null}
          {val(team, "solution") ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">어떻게 풀었나요?</h3>
              <p className="casebook-p">{val(team, "solution")}</p>
            </div>
          ) : null}
        </Page>
      ) : null}

      {/* 결과물 */}
      {hasResult ? (
        <Page team={team} section="결과물">
          <Heading no="02" title="결과물과 기술 구성" />
          <RowTable team={team} kind="feature" title="핵심 기능" />
          <RowTable team={team} kind="flow" title="사용 흐름" />
          {techFields.some(([, v]) => v) ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">기술 스택</h3>
              <dl className="casebook-dl casebook-grid">
                {techFields.map(([label, v]) => (
                  <Field key={label} label={label} value={v} />
                ))}
              </dl>
            </div>
          ) : null}
          {val(team, "currentScope") ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">지금까지 확인한 범위</h3>
              <p className="casebook-p">{val(team, "currentScope")}</p>
            </div>
          ) : null}
          <RowTable team={team} kind="limit" title="현재 한계" />
          <RowTable team={team} kind="plan" title="다음 계획" />
        </Page>
      ) : null}

      {/* 문제 정의 과정 */}
      {hasProcess ? (
        <Page team={team} section="문제 정의">
          <RowTable team={team} kind="process" title="문제 정의 과정" no="03" />
        </Page>
      ) : null}

      {/* 개발 기록 */}
      {hasDevlog ? (
        <Page team={team} section="개발 기록">
          <Heading no="04" title="개발 과정 기록" />
          <RowTable team={team} kind="devlog" title="개발 과정 자유기록" />
          <RowTable team={team} kind="decision" title="구현하며 바꾼 중요한 판단" />
          <RowTable team={team} kind="stuck" title="막혔던 순간" />
        </Page>
      ) : null}

      {/* 교육적 점검 */}
      {hasCheck ? (
        <Page team={team} section="교육적 점검">
          <Heading no="05" title="교육적 태도와 AI 활용 점검" />
          {stance.length > 0 ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">교사와 학생의 자리</h3>
              <table className="casebook-table">
                <thead>
                  <tr>
                    <th>문항</th>
                    <th>응답</th>
                  </tr>
                </thead>
                <tbody>
                  {stance.map((r, i) => (
                    <tr key={i}>
                      <td>
                        {STANCE_QUESTIONS[r.sortOrder] ?? `문항 ${r.sortOrder + 1}`}
                        {r.col2.trim() ? <div className="casebook-note">{r.col2}</div> : null}
                      </td>
                      <td className="casebook-td-narrow">{r.col1 || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <RowTable team={team} kind="ai_use" title="AI 활용과 사람의 확인" />
          <RowTable team={team} kind="ai_error" title="AI의 실수를 잡은 사례" />
        </Page>
      ) : null}

      {/* 안전과 개인정보 */}
      {hasSafety ? (
        <Page team={team} section="안전 점검">
          <Heading no="06" title="개인정보와 안전 점검" />
          <RowTable team={team} kind="privacy" title="입력·전송·저장 정보" />
          {cautionFields.some(([, v]) => v) ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">위험과 대응</h3>
              <dl className="casebook-dl">
                {cautionFields.map(([label, v]) => (
                  <Field key={label} label={label} value={v} />
                ))}
              </dl>
            </div>
          ) : null}
        </Page>
      ) : null}

      {/* 제작자와 라이선스 */}
      {hasCredit ? (
        <Page team={team} section="제작자">
          <Heading no="07" title="제작자와 라이선스" />
          {team.members.length > 0 ? (
            <ul className="casebook-list">
              {team.members.map((m, i) => (
                <li key={i}>
                  {[m.username, m.affiliation, m.role].filter((v) => (v ?? "").trim()).join(" · ")}
                </li>
              ))}
            </ul>
          ) : null}
          <RowTable team={team} kind="maker" title="담당한 부분" />
          {licenseFields.some(([, v]) => v) ? (
            <dl className="casebook-dl">
              {licenseFields.map(([label, v]) => (
                <Field key={label} label={label} value={v} />
              ))}
            </dl>
          ) : null}
        </Page>
      ) : null}

      {/* 후기 */}
      {hasReflection ? (
        <Page team={team} section="후기">
          <Heading no="08" title="팀원 개인 후기" />
          <ul className="casebook-cards">
            {team.reflections.map((r, i) => (
              <li key={r.id ?? i} className="casebook-card">
                <div className="casebook-card-head">
                  <span className="casebook-card-sub">
                    {[r.username, r.affiliation, r.role]
                      .filter((v) => (v ?? "").trim())
                      .join(" · ")}
                  </span>
                </div>
                <dl className="casebook-dl">
                  <Field label="가장 기억에 남는 순간" value={r.q1} />
                  <Field label="배운 점과 남은 질문" value={r.q2} />
                  <Field label="약속" value={(r.promises ?? []).join(", ")} />
                  <Field label="약속 실천 계획" value={r.promiseDetail} />
                  <Field label="확산 계획" value={r.spreadPlan} />
                </dl>
              </li>
            ))}
          </ul>
        </Page>
      ) : null}

      {/* 윤리 설문 */}
      {ethics.length > 0 ? (
        <Page team={team} section="윤리 설문">
          <Heading no="09" title="교사 개발자 윤리 자가점검" />
          <p className="casebook-p">
            응답 인원 {ethics.length}명 / 팀원 {team.members.length}명
          </p>
          <table className="casebook-table">
            <thead>
              <tr>
                <th>원칙</th>
                <th>평균</th>
                <th>척도</th>
              </tr>
            </thead>
            <tbody>
              {ETHICS_PRINCIPLES.map((p) => {
                const avg =
                  ethics.reduce(
                    (sum, e) => sum + Number((e as unknown as Record<string, number>)[p.key] ?? 0),
                    0,
                  ) / ethics.length;
                return (
                  <tr key={p.key}>
                    <td>{p.title}</td>
                    <td className="casebook-td-narrow">{avg.toFixed(1)} / 5.0</td>
                    <td className="casebook-td-bar">
                      <span className="casebook-bar">
                        <span
                          className="casebook-bar-fill"
                          style={{ width: `${Math.max(0, Math.min(100, (avg / 5) * 100))}%` }}
                        />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ethics.some((e) => (e.extraPromise ?? "").trim()) ? (
            <div className="casebook-block">
              <h3 className="casebook-h3">우리가 더한 약속</h3>
              <ul className="casebook-list">
                {ethics
                  .filter((e) => (e.extraPromise ?? "").trim())
                  .map((e, i) => (
                    <li key={i}>
                      {e.username}: {e.extraPromise}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </Page>
      ) : null}
    </article>
  );
}
