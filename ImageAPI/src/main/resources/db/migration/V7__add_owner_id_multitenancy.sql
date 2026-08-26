-- V7: Multi-tenant support
-- Adds owner-scoping so that authenticated users have private galleries
-- and guests browse a shared public seed pool.

-- 1. Owner scoping: NULL = public/guest "seed" pool. Non-null = a private gallery.
ALTER TABLE images ADD COLUMN owner_id BIGINT REFERENCES users(id);
CREATE INDEX idx_images_owner_id ON images(owner_id);

-- 2. Dedicated thumbnail storage key (previously implicitly == filename; see design docs).
ALTER TABLE images ADD COLUMN thumbnail_key VARCHAR(512);

-- 3. Marks exactly the curated starter-pack seed images (the 8 in seed-data/), as opposed
--    to *all* owner_id IS NULL rows, which will also include guest uploads over time.
--    Only rows with is_seed_sample = TRUE are ever offered by the first-login import prompt.
ALTER TABLE images ADD COLUMN is_seed_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Relax filename uniqueness from global to per-owner scope (including the NULL scope).
--    SQL NULLs are pairwise-distinct, so a plain UNIQUE(owner_id, filename) would NOT stop
--    two owner_id IS NULL rows from sharing a filename. Use two partial unique indexes instead.
ALTER TABLE images DROP CONSTRAINT IF EXISTS images_filename_key;

-- For non-null owner_id: each owner can have at most one image with a given filename.
CREATE UNIQUE INDEX ux_images_owner_filename
  ON images(owner_id, filename)
  WHERE owner_id IS NOT NULL;

-- For null owner_id (guest pool): all filenames must be globally unique.
CREATE UNIQUE INDEX ux_images_filename_seedpool
  ON images(filename)
  WHERE owner_id IS NULL;
