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

interface AuthorBadgeProps {
  author: string;
  profileMap: ProfileMap;
  size?: "sm" | "md";
  className?: string;
}

// Renders level / hackathon-award badges next to an author name when the
// (normalized) name exactly matches an admin-managed profile mapping.
export function AuthorBadge({
  author,
  profileMap,
  size = "sm",
  className,
}: AuthorBadgeProps) {
  const { data: awardIcon } = useQuery(awardIconQueryOptions());
  const profile = profileMap[normalizeUsername(author ?? "")];
  if (!profile) return null;

  const hasLevel = typeof profile.level === "number";
  const hasAward = profile.award.trim().length > 0;
  if (!hasLevel && !hasAward) return null;

  const padding = size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[11px]";

  // Resolve the admin-configured icon by name, falling back to Trophy.
  const AwardIcon =
    (awardIcon && (lucideIcons as Record<string, typeof Trophy>)[awardIcon]) ||
    Trophy;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 align-middle", className)}>
      {hasLevel && (
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-primary font-bold leading-none text-primary-foreground shadow-sm",
            padding,
          )}
        >
          Lv.{profile.level}
        </span>
      )}
      {hasAward && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-secondary font-medium leading-none text-secondary-foreground shadow-sm",
            padding,
          )}
        >
          <AwardIcon className="h-3 w-3 shrink-0" />
          {profile.award}
        </span>
      )}
    </span>
  );
}
