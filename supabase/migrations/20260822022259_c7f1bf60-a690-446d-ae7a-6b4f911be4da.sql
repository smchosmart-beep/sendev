
-- 1) 팀빌딩 행 → 페르소나 행으로 전환 (col5 유지, 나머지 비움)
INSERT INTO public.record_rows (post_id, kind, subtype, author, col1, col2, col3, col4, col5, col6, sort_order)
SELECT post_id, kind, '2. 고객 여정 맵', author, '', '', '', '', '', col6, 1
FROM public.record_rows
WHERE id = '5b7fbe36-87c0-405e-8ae4-2413b6d27559' AND COALESCE(col6,'') <> '';

INSERT INTO public.record_rows (post_id, kind, subtype, author, col1, col2, col3, col4, col5, col6, sort_order)
SELECT post_id, kind, '5. 종이 프로토타입 영상 콘티', author, '', '', '', col4, '', '', 2
FROM public.record_rows
WHERE id = '5b7fbe36-87c0-405e-8ae4-2413b6d27559' AND COALESCE(col4,'') <> '';

UPDATE public.record_rows
SET subtype = '1. 페르소나', col1='', col2='', col3='', col4='', col6='', sort_order = 0
WHERE id = '5b7fbe36-87c0-405e-8ae4-2413b6d27559';

-- 2) 내용이 비어 있는 옛 메모 행 삭제
DELETE FROM public.record_rows
WHERE id = 'fe5592dd-cbfe-42e6-89cc-2aee256b5e99';
