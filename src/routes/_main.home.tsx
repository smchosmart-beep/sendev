import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Clock, ArrowRight, Sparkles, StickyNote, Users } from "lucide-react";

import {
  heroSlidesQueryOptions,
  eventsQueryOptions,
} from "@/lib/platform.queries";
import { HeroStackCarousel } from "@/components/hero-stack-carousel";
import { KakaoMap } from "@/components/KakaoMap";

export const Route = createFileRoute("/_main/home")({
  head: () => ({
    meta: [
      { title: "홈 — 교사 개발자 플랫폼" },
      {
        name: "description",
        content:
          "교사 개발자 플랫폼의 메인 화면입니다. 진행 중인 행사와 챌린지, 다가오는 일정을 한눈에 확인하세요.",
      },
      { property: "og:title", content: "홈 — 교사 개발자 플랫폼" },
      {
        property: "og:description",
        content:
          "진행 중인 행사와 챌린지, 다가오는 일정을 한눈에 확인하세요.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(heroSlidesQueryOptions());
    context.queryClient.ensureQueryData(eventsQueryOptions());
  },
  component: HomePage,
});

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const base = d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekday = d.toLocaleDateString("ko-KR", { weekday: "short" });
  return `${base} (${weekday})`;
}

function HomePage() {
  const { data: slides = [] } = useQuery(heroSlidesQueryOptions());
  const { data: events = [] } = useQuery(eventsQueryOptions());

  const today = todayStr();
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Hero banner */}
      <section className="md:mx-auto md:max-w-[50%]">
        {slides.length > 0 ? (
          <HeroStackCarousel slides={slides} />
        ) : (
          <div className="flex aspect-[9/16] w-full flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-secondary p-8 text-center shadow-sm">
            <Sparkles className="mb-3 h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              교사 개발자 플랫폼
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              관리자 메뉴의 ‘메인화면 구성’에서 배너 이미지를 등록하면 이곳에
              표시됩니다.
            </p>
          </div>
        )}
      </section>

      {/* Upcoming events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            다가오는 이벤트
          </h2>
          <Link
            to="/calendar"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            전체 일정 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <Link
                key={e.id}
                to="/calendar"
                search={{ date: e.date }}
                className="group rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(e.date)}
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground">
                  {e.title}
                </h3>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {e.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {e.time}
                    </span>
                  )}
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {e.location}
                    </span>
                  )}
                  {e.target && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {e.target}
                    </span>
                  )}
                </div>
                {e.placeAddress && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {e.placeAddress}
                  </p>
                )}
                <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="line-clamp-2">
                    {e.description || "작성된 메모가 없습니다."}
                  </span>
                </p>
                {e.latitude != null && e.longitude != null ? (
                  <div
                    role="button"
                    tabIndex={0}
                    className="mt-3 cursor-pointer"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      window.open(
                        `https://map.kakao.com/link/map/${encodeURIComponent(
                          e.location || "장소",
                        )},${e.latitude},${e.longitude}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <KakaoMap
                      lat={e.latitude}
                      lng={e.longitude}
                      name={e.location}
                      asLink={false}
                      className="h-32 w-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg bg-muted text-muted-foreground">
                    <MapPin className="h-6 w-6 opacity-50" />
                    <span className="text-xs">위치 정보 없음</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              예정된 이벤트가 없어요. 캘린더에서 일정을 확인해 보세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
