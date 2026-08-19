// 교사 개발자 윤리 자가점검 7대 원칙 (활동기록 06 단계)
export const ETHICS_PRINCIPLES = [
  {
    key: "s1",
    title: "학생 성장 최우선",
    desc: "편리함보다 학생의 학습권과 성장을 앞에 두는 것",
  },
  {
    key: "s2",
    title: "개인정보·데이터 보호",
    desc: "학생·교사의 데이터를 최소로 모으고 안전하게 다루는 것",
  },
  {
    key: "s3",
    title: "책임과 출처 존중",
    desc: "AI가 만든 코드와 남의 자료의 출처를 밝히고 책임지는 것",
  },
  {
    key: "s4",
    title: "안전한 실험과 검증",
    desc: "교실에 들이기 전에 충분히 시험하고 점검하는 것",
  },
  {
    key: "s5",
    title: "역할 경계 인식",
    desc: "기술이 교사의 판단과 관계를 대신하지 않도록 선을 긋는 것",
  },
  {
    key: "s6",
    title: "공공성",
    desc: "내가 만든 것을 사적 소유가 아닌 공교육의 자산으로 여기는 것",
  },
  {
    key: "s7",
    title: "투명성 및 설명 가능성",
    desc: "도구가 어떻게 판단하는지 학생·학부모에게 설명할 수 있는 것",
  },
] as const;

export type EthicsScoreKey = (typeof ETHICS_PRINCIPLES)[number]["key"];

export const ETHICS_EXTRA_QUESTION =
  "이 일곱 가지 말고, 교사 개발자가 지켜야 할 약속을 하나 더 만든다면 무엇일까요?";

export const ETHICS_EXTRA_MAX = 200;

export function ethicsAverage(scores: Record<EthicsScoreKey, number>): number {
  const list = ETHICS_PRINCIPLES.map((p) => Number(scores[p.key] ?? 0));
  const sum = list.reduce((a, b) => a + b, 0);
  return Math.round((sum / list.length) * 10) / 10;
}
