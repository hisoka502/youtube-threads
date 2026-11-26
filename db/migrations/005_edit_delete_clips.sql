-- 005：開放登入者修改與刪除討論串（片段）
-- 使用方式：已經執行過 002_auth.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後：
--   登入者可以修改任何片段的時間範圍（只開放 start_sec、end_sec 兩個欄位），
--   也可以刪除任何片段；片段的留言會因 comments.clip_id 的 on delete cascade 一併刪除。
--   未登入仍然只能讀取。

grant update (start_sec, end_sec), delete on public.clips to authenticated;

create policy "signed-in users can update clips" on public.clips
  for update to authenticated using (true) with check (true);
create policy "signed-in users can delete clips" on public.clips
  for delete to authenticated using (true);
