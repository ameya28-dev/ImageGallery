CREATE TABLE image_tags (
    image_id BIGINT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    tag_id   BIGINT NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    PRIMARY KEY (image_id, tag_id)
);

CREATE INDEX idx_image_tags_tag_id ON image_tags(tag_id);
