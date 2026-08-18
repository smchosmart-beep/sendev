import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { postTemplateQueryOptions } from "@/lib/platform.queries";

function isEmptyHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "") === "";
}

/**
 * Prefills the post body with the admin-authored template for this board+type.
 * Applied at most once, and only while the editor is still empty, so a user
 * who clears the template never gets it back automatically.
 */
export function useApplyPostTemplate(
  categoryId: string | undefined,
  type: "post" | "question" | "vote",
  content: string,
  setContent: (value: string) => void,
) {
  const { data } = useQuery(postTemplateQueryOptions(categoryId ?? "", type));
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const template = data?.template ?? "";
    if (!template) return;
    if (!isEmptyHtml(content)) return;
    appliedRef.current = true;
    setContent(template);
  }, [data, content, setContent]);
}
