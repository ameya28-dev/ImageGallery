CREATE TABLE users (
    id                   BIGSERIAL PRIMARY KEY,
    email                VARCHAR(255) NOT NULL UNIQUE,
    password_hash        VARCHAR(255),
    provider             VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
    google_id            VARCHAR(255) UNIQUE,
    refresh_token        VARCHAR(512),
    refresh_token_expiry TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
