import { useState } from "react";
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
  const count = slides.length;

  if (count === 0) return null;

  if (count === 1) {
    return <SlideCard slide={slides[0]} />;
  }

  const go = (dir: 1 | -1) => {
    setCurrent((prev) => (prev + dir + count) % count);
  };

  // Visual stacking config per depth offset (0 = front).
  const depthStyle = (offset: number): React.CSSProperties => {
    // Show up to 2 cards behind the front one.
    if (offset === 0) {
      return {
        transform: "translateY(0px) translateZ(0px) scale(1)",
        opacity: 1,
        zIndex: 30,
      };
    }
    if (offset === 1) {
      return {
        transform: "translateY(-18px) translateZ(-80px) scale(0.93)",
        opacity: 0.7,
        zIndex: 20,
      };
    }
    if (offset === 2) {
      return {
        transform: "translateY(-34px) translateZ(-160px) scale(0.86)",
        opacity: 0.4,
        zIndex: 10,
      };
    }
    // Hidden behind the stack.
    return {
      transform: "translateY(-44px) translateZ(-220px) scale(0.82)",
      opacity: 0,
      zIndex: 0,
    };
  };

  return (
    <div className="relative md:overflow-visible">
      <div
        className="relative aspect-[9/16] w-full"
        style={{ perspective: "1400px" }}
      >
        {slides.map((slide, i) => {
          const offset = (i - current + count) % count;
          return (
            <div
              key={slide.id}
              className="absolute inset-0 transition-all duration-500 ease-out"
              style={{
                ...depthStyle(offset),
                pointerEvents: offset === 0 ? "auto" : "none",
                transformStyle: "preserve-3d",
              }}
              aria-hidden={offset !== 0}
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
