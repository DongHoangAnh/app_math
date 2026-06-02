-- Migration 003: Supabase Storage bucket for user avatars
-- Run in Supabase Dashboard → SQL Editor

-- ─── Create avatars bucket (public) ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- ─── RLS policies for storage.objects ────────────────────────────────────────
-- Xoá policies cũ nếu có
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"   ON storage.objects;

-- Cho phép mọi người đọc ảnh đại diện
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Cho phép user upload ảnh vào thư mục của mình ({userId}/avatar.ext)
CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Cho phép user cập nhật (upsert) ảnh của mình
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Cho phép user xoá ảnh của mình
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Constraint: validate display_name trong user_profiles ───────────────────
-- Chặn tên rỗng hoặc quá ngắn/dài trực tiếp ở DB
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_display_name_length;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT chk_display_name_length
  CHECK (
    display_name IS NULL
    OR (
      char_length(trim(display_name)) >= 2
      AND char_length(display_name) <= 30
    )
  );
