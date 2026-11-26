-- 006：訪客（未登入）可以留言
-- 使用方式：已經執行過 002_auth.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後：
--   未登入（anon）可以新增留言，但 user_id 必須是 null（不能冒用別人的帳號）。
--   未登入仍然不能建立、修改、刪除片段，也不能刪除任何留言。

grant insert on public.comments to anon;

create policy "guests can add comments without a user id" on public.comments
  for insert to anon with check (user_id is null);
