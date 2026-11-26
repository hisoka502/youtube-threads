-- 002：加入登入（Supabase Auth）後的資料表與權限規則
-- 使用方式：已經執行過 db/schema.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後的權限：
--   未登入（anon）：只能讀取片段與留言。
--   登入（authenticated）：可以讀取、新增片段與留言；只能刪除自己的留言；片段沒有人能刪。

-- 1. 片段與留言記錄建立者的使用者 id。
--    預設值 auth.uid() 是送出請求的登入者；舊資料（登入功能之前建立的）為 null。
alter table public.clips add column user_id uuid default auth.uid() references auth.users (id);
alter table public.comments add column user_id uuid default auth.uid() references auth.users (id);

-- 2. 未登入：移除新增、刪除的權限，只保留讀取
drop policy "anyone can add clips" on public.clips;
drop policy "anyone can add comments" on public.comments;
drop policy "anyone can delete comments" on public.comments;
revoke insert on public.clips from anon;
revoke insert, delete on public.comments from anon;

-- 3. 登入：讀取、新增（user_id 必須是自己）、刪除自己的留言
grant select, insert on public.clips to authenticated;
grant select, insert, delete on public.comments to authenticated;

create policy "signed-in users can read clips" on public.clips
  for select to authenticated using (true);
create policy "signed-in users can add their own clips" on public.clips
  for insert to authenticated with check (user_id = auth.uid());
-- clips 沒有 delete 規則：沒有人能透過 API 刪除片段（要刪除請在 Supabase 管理頁面操作）

create policy "signed-in users can read comments" on public.comments
  for select to authenticated using (true);
create policy "signed-in users can add their own comments" on public.comments
  for insert to authenticated with check (user_id = auth.uid());
create policy "signed-in users can delete their own comments" on public.comments
  for delete to authenticated using (user_id = auth.uid());
