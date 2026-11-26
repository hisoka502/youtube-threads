-- 003：同一部影片的多組討論串
-- 使用方式：已經執行過 002_auth.sql 的專案，在 SQL Editor 貼上整段後執行一次。
--
-- 每次貼上 YouTube 網址帶進影片時，頁面會產生新的討論串組 id（網址的 s 參數）。
-- 片段屬於「影片 ＋ 討論串組」；加入此功能前建立的片段，set_id 為 null。

alter table public.clips add column set_id text;

-- 列出片段時依影片與討論串組查詢
create index clips_video_id_set_id_idx on public.clips (video_id, set_id);
