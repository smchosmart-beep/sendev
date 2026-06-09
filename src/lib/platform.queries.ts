import { queryOptions } from "@tanstack/react-query";

import {
  listCategories,
  listEvents,
  listPosts,
  getPost,
  getPostByNo,
  listPostChain,
  resolveCanvaLink,
  searchPosts,
  listCriteria,
  listReviews,
  listReviewAllowlist,
  listCategoryReviews,
  getMyReview,
  listMyReviewedPostIds,
  listPostStubs,
  listReadPostIds,
  listComments,
  fetchReadme,
  fetchOgImage,
  fetchLinkPreview,
  refreshOgImage,
  listHeroSlides,
  listUserProfiles,
  getProfileMap,
  getNicknameStatus,
  getAwardIcon,
  listAwardIconRules,
} from "./platform.functions";

export const searchPostsQueryOptions = (
  q: string,
  mode: "title" | "title_content" | "author",
) =>
  queryOptions({
    queryKey: ["search-posts", q.trim(), mode],
    queryFn: () => searchPosts({ data: { q: q.trim(), mode } }),
    enabled: q.trim().length > 0,
  });

export const postChainQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ["post-chain", postId],
    queryFn: () => listPostChain({ data: { postId } }),
    enabled: !!postId,
  });

export const canvaLinkQueryOptions = (url: string) =>
  queryOptions({
    queryKey: ["canva-link", url],
    queryFn: () => resolveCanvaLink({ data: { url } }),
    enabled: !!url,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });




export const heroSlidesQueryOptions = () =>
  queryOptions({
    queryKey: ["hero-slides"],
    queryFn: () => listHeroSlides(),
  });


export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

export const eventsQueryOptions = () =>
  queryOptions({
    queryKey: ["events"],
    queryFn: () => listEvents(),
  });

// Reads the board password the visitor entered at the gate (kept only for the
// browser session, keyed by board slug). Returns "" on the server or for open
// boards, so protected content is withheld during SSR and only fetched after a
// successful unlock.
export function getBoardPassword(slug: string): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(`board-pw-${slug}`) ?? "";
  } catch {
    return "";
  }
}


export const postsQueryOptions = (
  categoryId: string,
  boardPassword = "",
  adminPassword = "",
) =>
  queryOptions({
    queryKey: ["posts", categoryId, boardPassword, adminPassword],
    queryFn: () => listPosts({ data: { categoryId, boardPassword, adminPassword } }),
  });

export const postQueryOptions = (id: string, boardPassword = "") =>
  queryOptions({
    queryKey: ["post", id, boardPassword],
    queryFn: () => getPost({ data: { id, boardPassword } }),
  });

// Resolves a post by board slug + per-board number for short URLs.
export const postByNoQueryOptions = (
  slug: string,
  postNo: number,
  boardPassword = "",
) =>
  queryOptions({
    queryKey: ["post-by-no", slug, postNo, boardPassword],
    queryFn: () => getPostByNo({ data: { slug, postNo, boardPassword } }),
  });

export const criteriaQueryOptions = (categoryId: string, activeOnly = false) =>
  queryOptions({
    queryKey: ["criteria", categoryId, activeOnly],
    queryFn: () => listCriteria({ data: { categoryId, activeOnly } }),
  });

export const reviewsQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ["reviews", postId],
    queryFn: () => listReviews({ data: { postId } }),
  });

export const reviewAllowlistQueryOptions = (
  categoryId: string,
  adminPassword: string,
) =>
  queryOptions({
    queryKey: ["review-allowlist", categoryId],
    queryFn: () => listReviewAllowlist({ data: { categoryId, adminPassword } }),
  });

export const categoryReviewsQueryOptions = (
  categoryId: string,
  adminPassword: string,
) =>
  queryOptions({
    queryKey: ["category-reviews", categoryId],
    queryFn: () => listCategoryReviews({ data: { categoryId, adminPassword } }),
  });


export const myReviewQueryOptions = (postId: string, reviewerName: string) =>
  queryOptions({
    queryKey: ["my-review", postId, reviewerName],
    queryFn: () => getMyReview({ data: { postId, reviewerName } }),
    enabled: reviewerName.trim().length > 0,
  });


export const myReviewedPostIdsQueryOptions = (reviewerName: string) =>
  queryOptions({
    queryKey: ["my-reviewed", reviewerName.trim()],
    queryFn: () =>
      listMyReviewedPostIds({ data: { reviewerName: reviewerName.trim() } }),
    enabled: reviewerName.trim().length > 0,
  });

export const postStubsQueryOptions = () =>
  queryOptions({
    queryKey: ["post-stubs"],
    queryFn: () => listPostStubs(),
  });

export const readPostIdsQueryOptions = (author: string) =>
  queryOptions({
    queryKey: ["read-post-ids", author.trim().toLowerCase()],
    queryFn: () => listReadPostIds({ data: { author: author.trim() } }),
    enabled: author.trim().length > 0,
  });


export const commentsQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ["comments", postId],
    queryFn: () => listComments({ data: { postId } }),
  });

export const readmeQueryOptions = (githubUrl: string) =>
  queryOptions({
    queryKey: ["readme", githubUrl],
    queryFn: () => fetchReadme({ data: { githubUrl } }),
    enabled: !!githubUrl,
    staleTime: 5 * 60 * 1000,
  });

export const ogImageQueryOptions = (url: string) =>
  queryOptions({
    queryKey: ["og-image", url],
    queryFn: () => fetchOgImage({ data: { url } }),
    enabled: !!url,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

// OG metadata (image + title + site name) for an arbitrary link placed in a
// post body. Resolved on render and cached client-side.
export const linkPreviewQueryOptions = (url: string) =>
  queryOptions({
    queryKey: ["link-preview", url],
    queryFn: () => fetchLinkPreview({ data: { url } }),
    enabled: !!url,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

// Backfills the cached OG image for an existing post (one external request,
// then stored in the DB). Keyed by postId so it runs at most once per post.
export const ogImageBackfillQueryOptions = (
  postId: string,
  deployUrl: string,
) =>
  queryOptions({
    queryKey: ["og-image-backfill", postId],
    queryFn: () => refreshOgImage({ data: { postId } }),
    enabled: !!postId && !!deployUrl,
    staleTime: Infinity,
    retry: false,
  });


export const userProfilesQueryOptions = () =>
  queryOptions({
    queryKey: ["user-profiles"],
    queryFn: () => listUserProfiles(),
  });

export const profileMapQueryOptions = () =>
  queryOptions({
    queryKey: ["profile-map"],
    queryFn: () => getProfileMap(),
    staleTime: 5 * 60 * 1000,
  });

export const nicknameStatusQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ["nickname-status", name.trim().toLowerCase()],
    queryFn: () => getNicknameStatus({ data: { name: name.trim() } }),
    enabled: name.trim().length > 0,
    staleTime: 30 * 1000,
  });


export const awardIconQueryOptions = () =>
  queryOptions({
    queryKey: ["award-icon"],
    queryFn: () => getAwardIcon(),
    staleTime: 5 * 60 * 1000,
  });

export const awardIconRulesQueryOptions = () =>
  queryOptions({
    queryKey: ["award-icon-rules"],
    queryFn: () => listAwardIconRules(),
    staleTime: 5 * 60 * 1000,
  });
