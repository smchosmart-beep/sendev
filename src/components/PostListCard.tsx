import { Link } from "@tanstack/react-router";
import { Eye, MessageCircle, User } from "lucide-react";

import { AuthorBadge } from "@/components/AuthorBadge";
import type { ProfileMap } from "@/lib/platform.functions";

interface PostListCardProps {
  slug: string;
  postNo: number;
  title: string;
  author: string;
  profileMap: ProfileMap;
  viewCount: number;
  commentCount: number;
  unread?: boolean;
}

// Shared list card for 공지/일반 posts.
// Mobile: title gets the full row, author meta drops to its own row.
// Desktop (sm+): title on the left, meta inline on the right.
export function PostListCard({
  slug,
  postNo,
  title,
  author,
  profileMap,
  viewCount,
  commentCount,
  unread = false,
}: PostListCardProps) {
  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug, postNo: String(postNo) }}
      className="flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
    >
      <span className="flex min-w-0 flex-1 items-start gap-2">
        {unread && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500"
            aria-label="읽지 않음"
          />
        )}
        <span className="min-w-0 line-clamp-2 text-sm font-medium text-foreground">
          {title}
        </span>
      </span>

      <span className="flex w-full items-center justify-between gap-3 text-sm text-muted-foreground sm:w-auto sm:shrink-0 sm:justify-end">
        <span className="flex min-w-0 flex-col items-start gap-0.5 sm:order-2 sm:items-end">
          <span
            className="flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap"
            title={author}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{author}</span>
            <AuthorBadge author={author} profileMap={profileMap} only="level" />
          </span>
          <AuthorBadge
            author={author}
            profileMap={profileMap}
            only="awards"
            expand
          />
        </span>

        <span className="flex shrink-0 items-center gap-3 sm:order-1">
          <span className="hidden items-center gap-1 sm:flex">
            <Eye className="h-3.5 w-3.5" />
            {viewCount}
          </span>
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
              {commentCount}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
