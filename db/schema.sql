-- YouTube 片段討論串：Supabase 資料表與權限規則
-- 使用方式：在 Supabase 管理頁面的 SQL Editor 貼上整段後執行。
-- 執行完後，接著依序執行 db/migrations/ 裡的檔案（002_auth.sql 加入登入後的權限）。
--
-- 目前沒有登入，所以瀏覽器端用公開金鑰（anon 角色）存取：
--   片段：可讀取、新增；不可刪除（使用者決定：刪除討論串不開放給所有人）。
--   留言：可讀取、新增、刪除。

create table public.clips (
  seq bigint generated always as identity,  -- 建立順序，列出時依此排序
  id text primary key,
  video_id text not null,
  start_sec double precision not null,
  end_sec double precision not null,
  title text not null default '',
  created_by text not null,
  created_at bigint not null                -- 毫秒，與 JavaScript 的 Date.now() 相同
);
create index clips_video_id_idx on public.clips (video_id);

create table public.comments (
  seq bigint generated always as identity,  -- 建立順序，討論串依此排序
  id text primary key,
  clip_id text not null references public.clips (id) on delete cascade,
  body text not null,
  created_by text not null,
  created_at bigint not null
);
create index comments_clip_id_idx on public.comments (clip_id);

-- 開啟資料列權限規則（RLS）：沒有對應規則的操作一律不允許
alter table public.clips enable row level security;
alter table public.comments enable row level security;

grant select, insert on public.clips to anon;
grant select, insert, delete on public.comments to anon;

create policy "anyone can read clips" on public.clips for select to anon using (true);
create policy "anyone can add clips" on public.clips for insert to anon with check (true);
-- clips 沒有 delete 規則：anon 無法刪除片段

create policy "anyone can read comments" on public.comments for select to anon using (true);
create policy "anyone can add comments" on public.comments for insert to anon with check (true);
create policy "anyone can delete comments" on public.comments for delete to anon using (true);
