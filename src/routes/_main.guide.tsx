import { createFileRoute } from "@tanstack/react-router";
import {
  HelpCircle,
  KeyRound,
  KeySquare,
  ShieldCheck,
  Star,
  Award,
  LayoutGrid,
  Search,
  UserRound,
  Settings,
  RotateCcw,
  ListChecks,
  LinkIcon,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/_main/guide")({
  head: () => ({
    meta: [
      { title: "사용자 가이드 — SEN DEV CONNECT" },
      {
        name: "description",
        content:
          "SEN DEV CONNECT 사용법 안내: 닉네임·비밀번호, 레벨/배지 제도, 메뉴 설명, 검색, 내 페이지, 관리자 접근까지 한눈에 확인하세요.",
      },
      { property: "og:title", content: "사용자 가이드 — SEN DEV CONNECT" },
      {
        property: "og:description",
        content:
          "닉네임·비밀번호, 레벨/배지 제도, 메뉴 설명, 검색, 내 페이지, 관리자 접근 등 사이트 사용법 전체 안내.",
      },
    ],
  }),
  component: GuidePage,
});

const sections = [
  { id: "why-nickname", label: "닉네임·비밀번호를 쓰는 이유" },
  { id: "find-password", label: "닉네임 비밀번호 찾기" },
  { id: "password-diff", label: "닉네임 비밀번호 안내" },
  { id: "level", label: "레벨(LV) 제도" },
  { id: "badge", label: "배지 제도" },
  { id: "security", label: "보안 안전성" },
  { id: "menus", label: "메뉴 안내" },
  { id: "posting", label: "글쓰기와 공지" },
  { id: "unread", label: "읽지 않은 글 표시" },
  { id: "links", label: "본문 링크 미리보기" },
  { id: "search", label: "검색 기능" },
  { id: "mypage", label: "내 페이지" },
  { id: "admin", label: "관리자 대시보드" },
] as const;

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof HelpCircle;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function GuidePage() {
  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/40 p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <HelpCircle className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">사용자 가이드</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          SEN DEV CONNECT를 처음 사용하시나요? 닉네임과 비밀번호 운영 방식부터 레벨·배지 제도, 각 메뉴의
          용도, 내 페이지와 관리자 접근까지 이 문서 하나로 안내합니다.
        </p>
      </header>

      {/* 목차 */}
      <nav className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">목차</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <Section id="why-nickname" icon={KeyRound} title="닉네임과 비밀번호를 설정하는 이유">
        <p>
          이 사이트는 별도의 회원가입(이메일·계정) 없이 <strong>닉네임</strong>을 중심으로 활동합니다. 닉네임은
          내가 쓴 글·댓글, 받은 좋아요, 레벨, 배지 등 모든 활동 기록이 연결되는 기준입니다.
        </p>
        <p>
          누구나 같은 닉네임을 입력할 수 있으면 <strong>사칭</strong>이 가능하기 때문에, 닉네임을 처음 사용할 때
          <strong> 닉네임 비밀번호</strong>를 설정합니다. 이 비밀번호로 "이 닉네임은 내 것"임을 증명하고, 다른
          사람이 같은 닉네임으로 내 활동에 손대는 것을 막습니다.
        </p>
      </Section>

      <Section id="find-password" icon={RotateCcw} title="닉네임 비밀번호 찾기">
        <p>
          닉네임 비밀번호를 잊었다면 <strong>복구 질문</strong>으로 직접 재설정할 수 있습니다.
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>먼저 <strong>내 페이지</strong>에서 로그인한 상태로 "복구 질문/답변"을 미리 설정해 둡니다.</li>
          <li>
            비밀번호를 잊으면 로그인 화면의 <strong>"비밀번호를 잊으셨나요?"</strong>를 눌러 닉네임을 입력합니다.
          </li>
          <li>등록해 둔 복구 질문의 답을 맞히면 새 비밀번호로 재설정됩니다.</li>
        </ol>
        <p>
          복구 질문을 설정하지 않았거나 답을 잊은 경우에는 시스템 관리자에게 닉네임 비밀번호 초기화를 요청해야
          합니다. (사칭 방지를 위해 복구 질문 설정을 미리 해두시길 권장합니다.)
        </p>
      </Section>

      <Section id="password-diff" icon={KeySquare} title="닉네임 비밀번호 사용 안내">
        <p>
          이 사이트에서는 <strong>닉네임 비밀번호 하나</strong>로 모든 활동을 보호합니다. 별도의 회원가입 없이 닉네임과
          비밀번호만으로 글·댓글 작성, 수정·삭제, 산출물 평가 등을 할 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>글·댓글 작성</strong>: 닉네임과 닉네임 비밀번호를 입력하면 작성됩니다. 처음 사용하는 닉네임은
            비밀번호를 <strong>두 번 입력</strong>해 등록하고, 이후에는 한 번만 입력해 본인 확인을 합니다.
          </li>
          <li>
            <strong>글·댓글 수정·삭제</strong>: 수정이나 삭제를 할 때도 <strong>같은 닉네임 비밀번호</strong>로
            본인 확인을 합니다. 다른 사람이 내 닉네임으로 글이나 댓글을 지우는 것을 막습니다.
          </li>
          <li>
            <strong>산출물 평가</strong>: 별점 평가를 남길 때도 닉네임 비밀번호로 본인 확인을 합니다. 같은 닉네임으로
            여러 번 평가하거나, 다른 사람이 내 닉네임을 도용해 평가하는 것을 방지합니다.
          </li>
        </ul>
        <p>
          일부 평가는 운영자가 미리 정한 <strong>평가자 명단</strong>의 닉네임만 참여할 수 있습니다. 이런 경우
          명단에 없는 닉네임으로는 평가가 제출되지 않으니, 평가가 되지 않으면 운영자에게 명단 등록을 문의해 주세요.
        </p>
        <p>
          비밀번호 입력칸 오른쪽의 <strong>눈 버튼</strong>을 누르면 입력한 비밀번호를 잠깐 평문으로 확인할 수
          있어 오타를 막을 수 있습니다.
        </p>
      </Section>

      <Section id="level" icon={Star} title="레벨(LV) 제도">
        <p>활동량에 따라 레벨이 자동으로 계산되어 닉네임 옆에 표시됩니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>글 작성: <strong>1편당 5점</strong></li>
          <li>댓글 작성: <strong>1개당 1점</strong></li>
        </ul>
        <p>
          누적 점수가 높을수록 레벨이 올라가며, 최대 <strong>LV 99</strong>까지 도달할 수 있습니다. 레벨은 별도
          신청 없이 활동만으로 자동 반영됩니다.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">레벨 구간</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">필요 누적 점수</th>
                <th className="px-4 py-2.5 text-left font-semibold text-foreground">예상 활동량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { range: "LV 1", pts: "0 ~ 15점", act: "—" },
                { range: "LV 2 ~ 9", pts: "16 ~ 95점", act: "글 3~19편 또는 댓글 16~95개" },
                { range: "LV 10 ~ 19", pts: "96 ~ 196점", act: "글 19~39편 또는 댓글 96~196개" },
                { range: "LV 20 ~ 29", pts: "197 ~ 297점", act: "글 39~59편 또는 댓글 197~297개" },
                { range: "LV 30 ~ 39", pts: "298 ~ 398점", act: "글 59~79편 또는 댓글 298~398개" },
                { range: "LV 40 ~ 49", pts: "399 ~ 499점", act: "글 79~99편 또는 댓글 399~499개" },
                { range: "LV 50 ~ 59", pts: "500 ~ 601점", act: "글 100~120편 또는 댓글 500~601개" },
                { range: "LV 60 ~ 69", pts: "602 ~ 702점", act: "글 120~140편 또는 댓글 602~702개" },
                { range: "LV 70 ~ 79", pts: "703 ~ 803점", act: "글 140~160편 또는 댓글 703~803개" },
                { range: "LV 80 ~ 89", pts: "804 ~ 904점", act: "글 160~180편 또는 댓글 804~904개" },
                { range: "LV 90 ~ 99", pts: "905 ~ 1,000점", act: "글 181~200편 또는 댓글 905~1,000개" },
              ].map((row, i) => (
                <tr key={i} className="odd:bg-muted/30">
                  <td className="px-4 py-2 font-medium text-foreground">{row.range}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.pts}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.act}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          * 레벨 계산 공식: 레벨 = round(누적점수 × 99 ÷ 1,000), 최소 LV 1 / 최대 LV 99. 글과 댓글 점수가 합산됩니다.
        </p>
        <div className="mt-2 space-y-1">
          <p className="font-medium text-foreground">레벨은 어디에 표시되나요?</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>내 페이지</strong> 상단의 활동 카드에 <code>Lv.N</code> 형태로 크게 표시됩니다.</li>
            <li>게시글·댓글 목록에서 <strong>작성자 닉네임 옆</strong>에도 <code>Lv.N</code> 뱃지가 함께 표시됩니다.</li>
          </ul>
        </div>
      </Section>

      <Section id="badge" icon={Award} title="배지 제도">
        <p>
          배지는 운영진(관리자)이 특정 닉네임에게 부여하는 표식입니다. 우수 활동, 행사 참여 등에 대한 인정으로
          수여되며, 부여된 배지는 <strong>내 페이지</strong>와 글·댓글의 작성자 이름 옆에 표시됩니다.
        </p>
        <div className="space-y-1">
          <p className="font-medium text-foreground">배지는 어디에 어떻게 표시되나요?</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>내 페이지</strong>에서는 보유한 <strong>모든 배지</strong>가 각각 아이콘과 배지 이름으로 나열되어
              표시됩니다.
            </li>
            <li>
              게시글·댓글의 <strong>작성자 이름 옆</strong>에서는 공간 절약을 위해 <strong>대표 배지(첫 번째) 아이콘
              하나</strong>만 표시됩니다.
            </li>
            <li>
              배지가 여러 개인 경우, 나머지 배지는 <code>+N</code> 칩으로 축약되어 표시됩니다. (예: 배지 3개 →
              아이콘 1개 + <code>+2</code>)
            </li>
            <li>
              <code>+N</code> 칩을 누르면(클릭·탭) 팝오버가 열리며 <strong>보유한 배지 전체 목록</strong>을 확인할 수
              있습니다.
            </li>
          </ul>
        </div>
        <p>닉네임을 변경하더라도 보유한 배지는 그대로 유지됩니다.</p>
      </Section>

      <Section id="security" icon={ShieldCheck} title="보안 안전성">
        <ul className="ml-5 list-disc space-y-2">
          <li>모든 비밀번호와 복구 답변은 <strong>암호화(해시)되어 저장</strong>되며, 원문 그대로 저장되지 않습니다.</li>
          <li>비밀번호 검증은 <strong>서버에서만</strong> 처리되어 외부에 노출되지 않습니다.</li>
          <li>공지 작성, 카테고리·일정·평가 기준·홈 화면 관리, 사용자 프로필/배지 관리 등 <strong>모든 관리자 작업은 서버에서 관리자 비밀번호를 다시 확인</strong>합니다. 따라서 시크릿 창이나 개발자 콘솔에서 권한 없이 관리자 기능을 실행할 수 없습니다.</li>
          <li>닉네임을 변경해도 레벨·배지·작성 글·댓글·좋아요 기록은 모두 보존됩니다.</li>
          <li>복구 질문 방식으로 본인 확인을 거쳐 무단 비밀번호 초기화를 막습니다.</li>
        </ul>
      </Section>

      <Section id="menus" icon={LayoutGrid} title="메뉴 안내">
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>캘린더</strong>: 행사·일정·마감 등을 날짜별로 확인하는 일정 보기 메뉴입니다.</li>
          <li><strong>해커톤</strong>: 해커톤 관련 공지, 모집, 후기 등을 모아 보는 게시판입니다.</li>
          <li><strong>자료집</strong>: 학습·개발에 도움이 되는 자료와 문서를 공유하는 게시판입니다.</li>
          <li><strong>Dev Ground</strong>: 프로젝트·아이디어 등 개발 활동을 자유롭게 공유하는 공간입니다.</li>
          <li><strong>Hello, World</strong>: 자기소개, 인사, 가벼운 이야기 등을 나누는 게시판입니다.</li>
        </ul>
        <p className="mt-3">
          각 탭 안의 게시판은 <strong>폴더(그룹) 구조로 정리</strong>됩니다. 폴더를 펼치면 그 안에 속한
          하위 게시판들이 보이고, 게시판을 누르면 글 목록으로 들어갑니다. 폴더 안에 또 다른 폴더를 넣어
          여러 단계로 분류할 수도 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>폴더(그룹)</strong>: 게시판들을 묶어두는 상자입니다. 폴더에는 글을 쓰지 않습니다.</li>
          <li><strong>게시판</strong>: 실제로 글을 쓰고 읽는 공간입니다.</li>
        </ul>
      </Section>

      <Section id="posting" icon={LayoutGrid} title="글쓰기와 공지">
        <p>
          공지·질문·일반글은 하나의 <strong>글</strong> 형태로 통합되었습니다. 게시판에서 <strong>글 등록</strong> 버튼으로
          누구나 글을 쓸 수 있고, 글 작성 폼에서 <strong>상단 고정(공지)</strong> 체크박스를 켜면 그 글이 목록 최상단에 고정되어 공지처럼 표시됩니다. 이미 작성한 글도 <strong>글 수정</strong> 화면에서 같은 체크박스로 상단 고정을 켜거나 끌 수 있습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>일반 사용자도 공지(상단 고정 글)를 작성할 수 있습니다.</li>
          <li>고정되지 않은 글은 최신순으로 목록에 표시되며 페이지로 넘겨 볼 수 있습니다.</li>
          <li>산출물·링크 게시판은 기존과 동일하게 별도로 운영됩니다.</li>
          <li>본문 편집기 상단 도구 모음에서 <strong>제목·굵게·기울임·밑줄</strong>, <strong>글자 색상·글자 크기</strong>, 인용·목록·링크·이미지 서식을 적용할 수 있습니다. 글자 크기는 <strong>작게·보통·크게·매우 크게</strong> 4단계로 조절할 수 있습니다.</li>
          <li>본문에 넣는 이미지는 <strong>JPG·PNG·WEBP·GIF</strong> 형식만 지원하며, 올릴 때 자동으로 압축되어 <strong>2MB 이내</strong>로 저장됩니다. 행사·공지 첨부파일은 <strong>1개당 3MB</strong>까지 올릴 수 있습니다.</li>
          <li>도구 모음의 <strong>클립(파일 첨부)</strong> 버튼으로 <strong>HWP·PDF·ZIP·오피스 문서</strong> 등 일반 파일을 올릴 수 있습니다. 파일당 <strong>3MB</strong>까지 가능하며, 본문에는 클릭하면 내려받는 <strong>다운로드 카드</strong>로 표시됩니다. 파일 종류에 따라 아이콘이 달라집니다 — <strong>HWP·PDF·문서</strong>는 문서 아이콘, <strong>XLS·XLSX</strong>는 표(시트) 아이콘, <strong>ZIP</strong>은 압축파일 아이콘으로 표시됩니다.</li>
        </ul>

      </Section>

      <Section id="unread" icon={Bell} title="읽지 않은 글 표시">
        <p>
          <strong>닉네임을 등록한 경우</strong>, 아직 읽지 않은 글을 한눈에 알 수 있도록 표시해 드립니다.
          닉네임을 설정하지 않았다면 이 표시는 나타나지 않습니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>카테고리 카드</strong>: 각 게시판 카드 제목 옆에 <strong>읽지 않은 일반 글 개수</strong>가 분홍색 숫자
            배지로 표시됩니다. (산출물·링크는 세지 않고 일반 글만 셉니다.)
          </li>
          <li>
            <strong>글 목록</strong>: 아직 읽지 않은 글 제목 앞에 <strong>분홍색 점</strong>이 붙습니다. 상단 고정(공지) 글도
            포함됩니다. 글을 열어 보면 점이 사라집니다.
          </li>
          <li>
            <strong>기기 간 연동</strong>: 읽음 상태는 <strong>닉네임 기준으로 저장</strong>되므로, 같은 닉네임이라면 휴대폰에서
            읽은 글이 PC에서도 읽음으로 반영됩니다.
          </li>
          <li>비밀번호로 들어가는 게시판도 카드의 읽지 않은 글 개수는 표시됩니다.</li>
        </ul>
      </Section>




      <Section id="links" icon={LinkIcon} title="본문 링크 미리보기">
        <p>
          게시글 본문에 링크를 <strong>한 줄에 단독으로</strong> 붙이면, 그 링크가 자동으로 미리보기 형태로 표시됩니다.
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>유튜브·비메오·캔바</strong> 링크: 본문에서 바로 재생·임베드되는 화면으로 표시됩니다.</li>
          <li><strong>그 외 모든 웹사이트</strong>(블로그, 뉴스, 깃허브 등): 썸네일 이미지 + 제목 + 사이트 주소가 담긴 미리보기 카드로 표시됩니다.</li>
          <li>대상 사이트가 미리보기 정보를 제공하지 않으면 썸네일 없이 제목·주소만, 그래도 안 되면 일반 링크로 표시됩니다.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          ※ 문장 중간에 들어간 링크는 미리보기 카드 없이 일반 텍스트 링크로 표시됩니다. 미리보기 카드를 원하면 링크만 한 줄에 따로 적어주세요.
        </p>
        <p className="text-sm text-muted-foreground">
          ※ 게시글의 <strong>공유</strong> 버튼으로 링크를 카카오톡·SNS 등에 공유하면, 미리보기에 <strong>게시글 제목</strong>이 표시됩니다. (카카오톡 등은 미리보기를 잠시 저장해 두므로, 새 글은 갱신에 약간 시간이 걸릴 수 있습니다.)
        </p>

      </Section>



      <Section id="search" icon={Search} title="검색 기능">
        <p>상단의 검색 아이콘으로 게시글을 찾을 수 있으며, 세 가지 검색 방식을 지원합니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>제목</strong>: 글 제목에서 검색</li>
          <li><strong>제목+내용</strong>: 제목과 본문 내용을 함께 검색</li>
          <li><strong>작성자</strong>: 닉네임(작성자)으로 검색</li>
        </ul>
      </Section>

      <Section id="mypage" icon={UserRound} title="내 페이지에서 할 수 있는 것">
        <p>우측 상단 사람 아이콘으로 들어가는 <strong>내 페이지</strong>에서는 다음을 할 수 있습니다.</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>닉네임 비밀번호로 로그인</li>
          <li>내 레벨, 활동 점수, 보유 배지 확인</li>
          <li>내가 쓴 글·댓글, 받은 좋아요와 누른 좋아요 보기</li>
          <li>닉네임 변경 (레벨·배지·글·댓글·좋아요 모두 유지)</li>
          <li>복구 질문/답변 설정 (비밀번호 분실 대비)</li>
        </ul>
      </Section>

      <Section id="admin" icon={Settings} title="관리자 대시보드 접근">
        <p>
          관리자 기능은 우측 상단의 <strong>톱니바퀴(설정) 아이콘</strong>을 통해 접근합니다. 관리자 대시보드는
          권한이 있는 운영진만 사용할 수 있으며, <strong>관리자 비밀번호</strong>가 필요합니다. 사용자 프로필 관리는 시스템 관리자 비밀번호를 추가로 입력하여야 합니다.
        </p>
        <p>
          관리자는 카테고리·공지·일정 관리, 사용자 프로필/배지 관리, 평가 기준 설정 등 사이트 운영 전반을 담당합니다.
          모든 관리자 작업은 실행 시점에 서버에서 관리자 비밀번호를 다시 검증하므로, 비밀번호를 모르면 어떤 우회 방법으로도 관리자 기능을 사용할 수 없습니다.
        </p>
        <p>
          관리자 <strong>카테고리 목록</strong>은 폴더 구조로 정리됩니다. 폴더 행의 화살표를 눌러 펼치면
          그 폴더에 속한 하위 카테고리들이 들여쓰기되어 나타나고, 접으면 다시 숨겨집니다. 위/아래 순서 변경은
          <strong>같은 폴더 안(또는 최상위끼리)</strong>에서만 가능해, 폴더 경계를 넘어 이동하지 않습니다.
        </p>
        <p>
          평가자 명단은 닉네임을 하나씩 추가하는 <strong>추가</strong> 버튼과, 구글 시트·엑셀에서 복사한 닉네임을
          한 번에 붙여넣어 등록하는 <strong>일괄 추가</strong> 버튼을 제공합니다. 일괄 추가 창에서는 줄바꿈·쉼표·탭으로
          구분된 닉네임을 모두 인식하며, 이미 명단에 있는 닉네임은 자동으로 제외됩니다.
        </p>

      </Section>

      <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        이 가이드는 기능이 추가·변경될 때마다 함께 업데이트됩니다.
      </p>
    </div>
  );
}
