WITH gp AS (
  SELECT p.id FROM posts p JOIN categories c ON c.id = p.category_id
  WHERE c.record_kind = 'growth' AND p.type = 'record'
),
gc AS (SELECT id FROM categories WHERE record_kind = 'growth')
, d1 AS (DELETE FROM record_growth_heart WHERE stage_id IN (SELECT id FROM record_growth_stage WHERE category_id IN (SELECT id FROM gc) OR post_id IN (SELECT id FROM gp)) RETURNING 1)
, d2 AS (DELETE FROM record_growth_stage_comment WHERE stage_id IN (SELECT id FROM record_growth_stage WHERE category_id IN (SELECT id FROM gc) OR post_id IN (SELECT id FROM gp)) RETURNING 1)
, d3 AS (DELETE FROM record_growth_stage WHERE category_id IN (SELECT id FROM gc) OR post_id IN (SELECT id FROM gp) RETURNING 1)
, d4 AS (DELETE FROM record_growth_quote_pick WHERE post_id IN (SELECT id FROM gp) OR evaluation_id IN (SELECT id FROM record_growth_evaluation WHERE post_id IN (SELECT id FROM gp) OR from_post_id IN (SELECT id FROM gp)) RETURNING 1)
, d5 AS (DELETE FROM record_growth_evaluation WHERE post_id IN (SELECT id FROM gp) OR from_post_id IN (SELECT id FROM gp) RETURNING 1)
, d6 AS (DELETE FROM record_growth_group_member WHERE post_id IN (SELECT id FROM gp) OR group_id IN (SELECT id FROM record_growth_group WHERE category_id IN (SELECT id FROM gc)) RETURNING 1)
, d7 AS (DELETE FROM record_growth_group WHERE category_id IN (SELECT id FROM gc) RETURNING 1)
, d8 AS (DELETE FROM record_growth_peer_feedback WHERE post_id IN (SELECT id FROM gp) OR from_post_id IN (SELECT id FROM gp) RETURNING 1)
, d9 AS (DELETE FROM record_growth WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d10 AS (DELETE FROM record_members WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d11 AS (DELETE FROM record_reflections WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d12 AS (DELETE FROM record_ethics WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d13 AS (DELETE FROM record_rows WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d14 AS (DELETE FROM record_final WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d15 AS (DELETE FROM comments WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d16 AS (DELETE FROM post_likes WHERE target_id IN (SELECT id FROM gp) RETURNING 1)
, d17 AS (DELETE FROM post_reads WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d18 AS (DELETE FROM reviews WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d19 AS (DELETE FROM votes WHERE post_id IN (SELECT id FROM gp) RETURNING 1)
, d20 AS (DELETE FROM posts WHERE id IN (SELECT id FROM gp) RETURNING 1)
SELECT (SELECT count(*) FROM d20) AS deleted_posts;