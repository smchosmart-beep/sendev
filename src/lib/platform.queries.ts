import { queryOptions } from "@tanstack/react-query";

import {
  listCategories,
  listEvents,
  listPosts,
  getPost,
  listCriteria,
  listReviews,
  fetchReadme,
  fetchOgImage,
} from "./platform.functions";

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
