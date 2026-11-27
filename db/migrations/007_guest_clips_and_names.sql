-- 007：訪客（未登入）可以建立片段；復盤可以命名
-- 使用方式：已經執行過 006_guest_comments.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後：
--   未登入（anon）可以新增片段，但 user_id 必須是 null（不能冒用別人的帳號）。
--   未登入仍然不能修改、刪除片段。

grant insert on public.clips to anon;

create policy "guests can add clips without a user id" on public.clips
  for insert to anon with check (user_id is null);

-- 復盤名稱（alias）：名稱不必唯一，進入復盤一律以編號（set_id）為準。
-- 任何人（anon 與登入者）都可以讀取、新增、修改名稱；不能刪除（改成空字串即可清除名稱）。
create table public.review_names (
  set_id text primary key,
  name text not null
);

alter table public.review_names enable row level security;

grant select, insert, update on public.review_names to anon, authenticated;

create policy "anyone can read review names" on public.review_names
  for select to anon, authenticated using (true);
create policy "anyone can add review names" on public.review_names
  for insert to anon, authenticated with check (true);
create policy "anyone can rename reviews" on public.review_names
  for update to anon, authenticated using (true) with check (true);
