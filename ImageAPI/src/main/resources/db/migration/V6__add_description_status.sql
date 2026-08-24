-- Add description status tracking for Vision API attempts
-- Allows distinguishing between "no results" and "API call failed"
ALTER TABLE images ADD COLUMN description_status VARCHAR(20);
ALTER TABLE images ADD COLUMN description_error VARCHAR(40);
