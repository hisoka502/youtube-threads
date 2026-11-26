-- 004：允許在 Supabase 刪除註冊者，並保留他建立的片段與留言
-- 使用方式：已經執行過 002_auth.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 執行後，在 Authentication → Users 刪除使用者時：
--   他建立的片段與留言保留，畫面上仍顯示當初的顯示名稱（存在 created_by）；
--   user_id 變成 null，所以沒有人能再透過網站刪除那些留言（管理者仍可在 Supabase 刪除）。

alter table public.clips
  drop constraint clips_user_id_fkey,
  add constraint clips_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete set null;

alter table public.comments
  drop constraint comments_user_id_fkey,
  add constraint comments_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete set null;
