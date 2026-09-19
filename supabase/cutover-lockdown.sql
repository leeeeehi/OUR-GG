-- Riot API 전환(컷오버) 시점에 적용하는 og_posts 잠금 SQL
--
-- 목적: 전적 수치(kills, damage_dealt, is_hidden 등)를 클라이언트가 REST로 직접 넣거나 고치지 못하게 한다.
--       게시물 등록은 riot-proxy Edge Function(service_role)만 수행한다.
--
-- 적용 조건 (순서 중요, 하나라도 빠지면 운영 사이트의 게시물 등록이 깨진다)
--   1. RIOT_API_KEY 시크릿이 등록되어 riot-proxy가 실제로 동작한다.
--   2. createPostFromMatch를 쓰는 새 클라이언트가 main에 배포되어 있다. (옛 클라이언트는 직접 INSERT)
--
-- 영향 없음 확인: og_posts를 UPDATE하는 트리거 함수(og_handle_report, og_sync_reaction_counts)는
--               모두 SECURITY DEFINER(소유자 postgres)라 이 권한 회수와 무관하게 동작한다.
--
-- 롤백: grant insert, update on public.og_posts to anon, authenticated;

revoke insert, update on public.og_posts from anon, authenticated;

-- 소감/공개범위 수정 기능을 위해 안전한 컬럼만 본인 행 수정 허용 (RLS 정책 og_posts_update_own이 본인 행으로 제한)
grant update (caption, visibility) on public.og_posts to authenticated;
