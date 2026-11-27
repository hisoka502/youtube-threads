-- 007：訪客（未登入）可以建立片段；復盤可以命名
-- 使用方式：已經執行過 006_guest_comments.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後：
--   未登入（anon）可以新增片段，但 user_id 必須是 null（不能冒用別人的帳號）。
--   未登入仍然不能修改、刪除片段。

grant insert on public.clips to anon;

create policy "guests can add clips without a user id" on public.clips
  for insert to anon with check (user_id is null);
