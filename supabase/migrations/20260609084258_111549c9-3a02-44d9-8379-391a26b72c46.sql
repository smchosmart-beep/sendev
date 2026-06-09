ALTER TABLE public.posts
  ADD COLUMN parent_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON public.posts(parent_post_id);

-- 특정 글이 속한 연재 체인 전체(루트 -> 모든 후손)를 작성순으로 반환.
-- 같은 카테고리 내로 한정하고, CYCLE 절 + 깊이 제한(100)으로 순환/무한루프 방지.
CREATE OR REPLACE FUNCTION public.get_post_chain(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  category_id uuid,
  post_no integer,
  title text,
  author text,
  parent_post_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_root uuid;
  v_category uuid;
BEGIN
  -- 시작 글의 카테고리 확인
  SELECT p.category_id INTO v_category FROM public.posts p WHERE p.id = p_post_id;
  IF v_category IS NULL THEN
    RETURN;
  END IF;

  -- 루트(부모가 없거나 다른 카테고리인 지점)까지 거슬러 올라가기
  WITH RECURSIVE up AS (
    SELECT p.id, p.parent_post_id, 1 AS depth
    FROM public.posts p
    WHERE p.id = p_post_id
    UNION ALL
    SELECT par.id, par.parent_post_id, up.depth + 1
    FROM public.posts par
    JOIN up ON par.id = up.parent_post_id
    WHERE par.category_id = v_category AND up.depth < 100
  ) CYCLE id SET is_cycle USING path
  SELECT u.id INTO v_root
  FROM up u
  ORDER BY u.depth DESC
  LIMIT 1;

  -- 루트에서 모든 후손을 작성순으로 반환
  RETURN QUERY
  WITH RECURSIVE down AS (
    SELECT p.id, p.category_id, p.post_no, p.title, p.author, p.parent_post_id, p.created_at, 1 AS depth
    FROM public.posts p
    WHERE p.id = v_root
    UNION ALL
    SELECT c.id, c.category_id, c.post_no, c.title, c.author, c.parent_post_id, c.created_at, down.depth + 1
    FROM public.posts c
    JOIN down ON c.parent_post_id = down.id
    WHERE c.category_id = v_category AND down.depth < 100
  ) CYCLE id SET is_cycle USING path
  SELECT down.id, down.category_id, down.post_no, down.title, down.author, down.parent_post_id, down.created_at
  FROM down
  ORDER BY down.created_at ASC, down.post_no ASC;
END;
$$;

-- 한 글의 연재 체인 전체를 대상 카테고리로 단일 트랜잭션으로 이동.
-- 작성순으로 연속된 post_no를 부여하고, 기준 글의 새 post_no를 반환.
CREATE OR REPLACE FUNCTION public.move_post_chain(p_post_id uuid, p_target_category uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
  v_rec record;
  v_result integer;
BEGIN
  SELECT COALESCE(MAX(post_no), 0) INTO v_next
  FROM public.posts WHERE category_id = p_target_category;

  FOR v_rec IN
    SELECT * FROM public.get_post_chain(p_post_id)
  LOOP
    v_next := v_next + 1;
    UPDATE public.posts
      SET category_id = p_target_category,
          post_no = v_next,
          type = 'post'
      WHERE id = v_rec.id;
    IF v_rec.id = p_post_id THEN
      v_result := v_next;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;