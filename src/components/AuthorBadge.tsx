import { useState } from "react";
import { Trophy, icons as lucideIcons } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import {
  normalizeUsername,
  resolveAwardIcon,
  type ProfileMap,
} from "@/lib/platform.functions";
import {
  awardIconQueryOptions,
  awardIconRulesQueryOptions,
} from "@/lib/platform.queries";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AuthorBadgeProps {
  author: string;
  profileMap: ProfileMap;
  size?: "sm" | "md";
  className?: string;
  // Controls which badge parts render: level only, award badges only, or both.
  only?: "level" | "awards" | "all";
}

// Renders level / hackathon-award badges next to an author name when the
// (normalized) name exactly matches an admin-managed profile mapping.
// To save space inline, only the first (representative) award is shown; any
// extra awards collapse into a "+N" chip that reveals the full list on tap.
export function AuthorBadge({
  author,
  profileMap,
  size = "sm",
  className,
  only = "all",
}: AuthorBadgeProps) {
  const [open, setOpen] = useState(false);
  const { data: awardIcon } = useQuery(awardIconQueryOptions());
  const { data: awardRules } = useQuery(awardIconRulesQueryOptions());
  const profile = profileMap[normalizeUsername(author ?? "")];
  if (!profile) return null;

  const showLevel = only === "level" || only === "all";
  const showAwards = only === "awards" || only === "all";
  const hasLevel =
    showLevel && typeof profile.level === "number" && author !== "운영진";
  const awards = showAwards
    ? (profile.awards ?? []).filter((a) => a.trim().length > 0)
    : [];
  const hasAward = awards.length > 0;
  if (!hasLevel && !hasAward) return null;

  const padding =
    size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[11px]";
  const defaultIcon = awardIcon ?? "Trophy";

  const iconFor = (name: string) => {
    const iconName = resolveAwardIcon(name, awardRules ?? [], defaultIcon);
    return (lucideIcons as Record<string, typeof Trophy>)[iconName] || Trophy;
  };

  const primary = awards[0];
  const PrimaryIcon = hasAward ? iconFor(primary) : Trophy;
  const extraCount = awards.length - 1;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1 align-middle",
        className,
      )}
    >
      {hasLevel && author !== "운영진" && (
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-primary font-bold leading-none text-primary-foreground shadow-sm",
            padding,
          )}
        >
          Lv.{profile.level}
        </span>
      )}
      {hasAward && extraCount > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              className="group inline-flex cursor-pointer items-center gap-1 align-middle"
              aria-label={`배지 ${awards.length}개 전체 보기`}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-secondary font-medium leading-none text-secondary-foreground shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-secondary/80 group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/30",
                  padding,
                )}
              >
                <PrimaryIcon className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {primary}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full bg-secondary font-bold leading-none text-secondary-foreground shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md",
                  padding,
                )}
              >
                +{extraCount}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-56 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-1 pb-1.5 text-xs font-semibold text-muted-foreground">
              보유 배지 {awards.length}개
            </p>
            <ul className="space-y-1">
              {awards.map((name, i) => {
                const Icon = iconFor(name);
                return (
                  <li
                    key={`${name}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{name}</span>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      ) : (
        hasAward && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-secondary font-medium leading-none text-secondary-foreground shadow-sm",
              padding,
            )}
          >
            <PrimaryIcon className="h-3 w-3 shrink-0" />
            {primary}
          </span>
        )
      )}

    </span>
  );
}
