import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HeroSlideDTO } from "@/lib/platform.functions";
import { cn } from "@/lib/utils";

interface HeroStackCarouselProps {
  slides: HeroSlideDTO[];
}

function SlideCard({ slide }: { slide: HeroSlideDTO }) {
  const inner = (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl shadow-md">
      <img
        src={slide.imageUrl}
        alt={slide.caption || "메인 배너"}
        className="h-full w-full object-cover"
        draggable={false}
      />
      {slide.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 sm:p-8">
          <p className="text-lg font-bold text-white drop-shadow sm:text-2xl">
            {slide.caption}
          </p>
        </div>
      )}
    </div>
  );

  if (slide.linkUrl) {
    return (
      <a
        href={slide.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

export function HeroStackCarousel({ slides }: HeroStackCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<{ index: number; dir: 1 | -1 } | null>(
    null,
  );
  const animatingRef = useRef(false);
  const count = slides.length;

  if (count === 0) return null;

  if (count === 1) {
    return <SlideCard slide={slides[0]} />;
  }

  const go = (dir: 1 | -1) => {
    if (animatingRef.current) return;
    const next = (current + dir + count) % count;
    animatingRef.current = true;
    setIncoming({ index: next, dir });
  };

  const handleAnimationEnd = () => {
    if (!incoming) return;
    setCurrent(incoming.index);
    setIncoming(null);
    animatingRef.current = false;
  };

  // 대기 중인 뒤 카드들의 stack 상태 (front = offset 0)
  const depthStyle = (offset: number): React.CSSProperties => {
    if (offset === 0) {
      return {
        transform: "translateX(0px) translateY(0px) scale(1)",
        opacity: 1,
        zIndex: 30,
      };
    }
    if (offset === 1) {
      return {
        transform: "translateX(14px) translateY(-16px) scale(0.93)",
        opacity: 0.7,
        zIndex: 20,
      };
    }
    if (offset === 2) {
      return {
        transform: "translateX(26px) translateY(-30px) scale(0.86)",
        opacity: 0.4,
        zIndex: 10,
      };
    }
    return {
      transform: "translateX(34px) translateY(-40px) scale(0.82)",
      opacity: 0,
      zIndex: 0,
    };
  };

  return (
    <div className="relative md:overflow-visible">
      <div className="relative aspect-[9/16] w-full">
        {slides.map((slide, i) => {
          const offset = (i - current + count) % count;
          const isIncoming = incoming?.index === i;
          return (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0",
                isIncoming
                  ? incoming.dir === 1
                    ? "hero-slide-over-right"
                    : "hero-slide-over-left"
                  : "transition-all duration-500 ease-out",
              )}
              style={{
                ...(isIncoming ? { zIndex: 40 } : depthStyle(offset)),
                pointerEvents: offset === 0 && !incoming ? "auto" : "none",
                willChange: "transform, opacity",
              }}
              aria-hidden={offset !== 0}
              onAnimationEnd={isIncoming ? handleAnimationEnd : undefined}
            >
              <SlideCard slide={slide} />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="이전 배너"
        className={cn(
          "absolute top-1/2 left-3 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background md:-left-12",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="다음 배너"
        className={cn(
          "absolute top-1/2 right-3 z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background md:-right-12",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
