-- 1) remove old-name rows that would collide with the existing name
DELETE FROM public.post_reads o
WHERE o.username_key = '창일중(이서영)'
  AND EXISTS (
    SELECT 1 FROM public.post_reads n
    WHERE n.username_key = '이서영' AND n.post_id = o.post_id
  );

DELETE FROM public.votes o
WHERE o.voter_key = '창일중(이서영)'
  AND EXISTS (
    SELECT 1 FROM public.votes n
    WHERE n.voter_key = '이서영'
      AND n.category_id = o.category_id
      AND n.post_id = o.post_id
      AND n.round = o.round
  );

-- 2) move the rest onto the current nickname
UPDATE public.post_reads SET username_key = '이서영' WHERE username_key = '창일중(이서영)';
UPDATE public.votes SET voter_key = '이서영', voter_name = '이서영' WHERE voter_key = '창일중(이서영)';