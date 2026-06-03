import { queryOptions } from "@tanstack/react-query";

import {
  listCategories,
  listEvents,
  listPosts,
  getPost,
  getPostByNo,
  listCriteria,
  listReviews,
  fetchReadme,
  fetchOgImage,
  refreshOgImage,
  listHeroSlides,
} from "./platform.functions";

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

export const postsQueryOptions = (categoryId: string) =>
  queryOptions({
    queryKey: ["posts", categoryId],
    queryFn: () => listPosts({ data: { categoryId } }),
  });

export const postQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["post", id],
    queryFn: () => getPost({ data: { id } }),
  });

// Resolves a post by board slug + per-board number for short URLs.
export const postByNoQueryOptions = (slug: string, postNo: number) =>
  queryOptions({
    queryKey: ["post-by-no", slug, postNo],
    queryFn: () => getPostByNo({ data: { slug, postNo } }),
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
