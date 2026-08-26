-- Add video_duration column to store video length in seconds
ALTER TABLE images ADD COLUMN video_duration DOUBLE PRECISION;
