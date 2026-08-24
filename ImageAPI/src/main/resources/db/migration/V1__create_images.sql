CREATE TABLE images (
    id           BIGSERIAL PRIMARY KEY,
    filename     VARCHAR(255) NOT NULL UNIQUE,
    s3_key       VARCHAR(512),
    taken_at     TIMESTAMP NOT NULL,
    is_favourite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_taken_at  ON images(taken_at DESC);
CREATE INDEX idx_images_favourite ON images(is_favourite);
