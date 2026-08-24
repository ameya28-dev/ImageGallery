-- V5: Add AI-generated visual description column to images
-- Populated asynchronously after each upload and on-demand via POST /api/images/describe-all
ALTER TABLE images ADD COLUMN ai_description TEXT;
