// Korean public holidays (대한민국 공휴일). Lunar-based holidays (설날/추석/
// 부처님오신날) and substitute holidays (대체공휴일) are precomputed per year.
// Fixed-date holidays are generated automatically for any year.

const FIXED: Array<{ md: string; name: string }> = [
  { md: "01-01", name: "신정" },
  { md: "03-01", name: "삼일절" },
  { md: "05-05", name: "어린이날" },
  { md: "06-06", name: "현충일" },
  { md: "08-15", name: "광복절" },
  { md: "10-03", name: "개천절" },
  { md: "10-09", name: "한글날" },
  { md: "12-25", name: "크리스마스" },
];

// year -> { "MM-DD": name } for lunar + substitute holidays.
const VARIABLE: Record<number, Record<string, string>> = {
  2025: {
    "01-27": "임시공휴일",
    "01-28": "설날 연휴",
    "01-29": "설날",
    "01-30": "설날 연휴",
    "03-03": "대체공휴일",
    "05-06": "대체공휴일",
    "10-05": "추석 연휴",
    "10-06": "추석",
    "10-07": "추석 연휴",
    "10-08": "대체공휴일",
  },
  2026: {
    "02-16": "설날 연휴",
    "02-17": "설날",
    "02-18": "설날 연휴",
    "03-02": "대체공휴일",
    "05-24": "부처님오신날",
    "05-25": "대체공휴일",
    "09-24": "추석 연휴",
    "09-25": "추석",
    "09-26": "추석 연휴",
  },
  2027: {
    "02-06": "설날 연휴",
    "02-07": "설날",
    "02-08": "설날 연휴",
    "02-09": "대체공휴일",
    "05-13": "부처님오신날",
    "06-07": "대체공휴일",
    "08-16": "대체공휴일",
    "09-14": "추석 연휴",
    "09-15": "추석",
    "09-16": "추석 연휴",
    "10-04": "대체공휴일",
  },
};

// 2026 부처님오신날 already in VARIABLE; 2025 falls on 05-05 (children's day),
// handled via the 05-06 substitute above.

export function getHolidayName(iso: string): string | null {
  const [year, mm, dd] = iso.split("-");
  const md = `${mm}-${dd}`;
  const fixed = FIXED.find((f) => f.md === md);
  if (fixed) return fixed.name;
  const variable = VARIABLE[Number(year)];
  if (variable && variable[md]) return variable[md];
  return null;
}

export function isHoliday(iso: string): boolean {
  return getHolidayName(iso) !== null;
}
