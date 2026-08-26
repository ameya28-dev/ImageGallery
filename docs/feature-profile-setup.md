# Feature Profile Setup — AWS + Google OAuth + Docker

This guide walks you through setting up the **feature** profile for the Image Gallery, which uses:
- **Amazon RDS** for PostgreSQL database
- **Amazon S3** for image storage (with versioning for soft-delete safety)
- **Google OAuth2** for "Sign in with Google"
- **Docker Compose** for local development with cloud-connected services

---

## Cost Summary

**Free Tier (first 12 months):**
- AWS S3: 5 GB storage + 20K GETs + 2K PUTs/month — free
- AWS RDS `db.t3.micro`: 750 hours/month (24/7 for one month) — free
- Google OAuth: Free forever, unlimited quota

**After Free Tier (month 13+):**
- ~$12.61/month (mostly RDS compute; S3 adds ~$0.05)

---

## Prerequisites

- AWS account (create at [aws.amazon.com](https://aws.amazon.com))
- Google account (for OAuth setup)
- Docker & Docker Compose installed on your machine
- This repository checked out locally

---

## Part 1: AWS Setup

### Step 1A — Create AWS Account & Set Billing Alert

1. Go to [aws.amazon.com](https://aws.amazon.com) → **Create an AWS Account**
2. Use your email + credit card (for verification; won't be charged in free tier)
3. **Immediately** set a billing alert (do this before proceeding):
   - **AWS Console** → **Billing** → **Budgets** → **Create budget**
   - Type: Cost budget, Period: Monthly
   - Budgeted amount: `$5.00` (alert before you're charged)
   - Alert threshold: 80%
   - Email notifications: your email
   - Create budget

---

### Step 1B — Create IAM User for Application

**Never use root AWS account credentials in application code.**

1. Go to **IAM** → **Users** → **Create user**
2. Name: `imagegallery-app`
3. Click **Create user**
4. Open the user → **Security credentials** tab → **Create access key**
5. Select **Application running outside AWS**
6. Click **Create access key**
7. **Copy and save both immediately** (shown only once):
   - Access Key ID: `AKIA...` (save as `AWS_ACCESS_KEY_ID`)
   - Secret Access Key: `wJalr...` (save as `AWS_SECRET_ACCESS_KEY`)
8. Attach S3 permissions to the user:
   - Go to **Permissions** → **Add permissions** → **Attach policies directly**
   - Search for `AmazonS3FullAccess` → select → **Add permissions**
   - (Later, after setup works, replace this with the minimal policy below)

### Minimal S3 Policy (Recommended After Initial Setup)

Once you've verified everything works, replace `AmazonS3FullAccess` with this scoped policy:

1. Go to **IAM** → **Users** → **imagegallery-app**
2. **Permissions** → **Inline policies** → **Create inline policy**
3. Paste this JSON (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME",
        "arn:aws:s3:::YOUR-BUCKET-NAME/*"
      ]
    }
  ]
}
```

---

### Step 1C — Create S3 Bucket

1. Go to **S3** → **Create bucket**
2. **Bucket name**: `imagegallery-yourname` (globally unique; must be lowercase + alphanumeric + hyphens)
3. **Region**: Pick one close to you:
   - India: `ap-south-1` (Mumbai)
   - Europe: `eu-west-1` (Ireland)
   - US East: `us-east-1` (N. Virginia)
   - (Same region as your application server; cross-region transfer costs money)
4. **Block all public access**: Leave ON (app serves images through Spring Boot, not direct S3)
5. **ACL disabled**: Leave enabled (default, OK)
6. **Encryption**: Leave as default (Amazon-managed encryption, free)
7. Click **Create bucket**
8. Open the bucket → **Properties** → **Versioning** → **Edit**:
   - Select **Enable**
   - Save
   - (Versioning keeps deleted/overwritten objects recoverable for ~30 days; cost is minimal)

**Save the bucket name** (e.g., `imagegallery-yourname`) as `S3_BUCKET_NAME`.

---

### Step 1D — Create RDS PostgreSQL Instance

1. Go to **RDS** → **Create database**
2. **Engine**: Select **PostgreSQL** → latest version (16.x)
3. **Templates**: Select **Free tier** (locks instance class to `db.t3.micro`)
4. **Settings**:
   - DB instance identifier: `imagegallery`
   - Master username: `postgres`
   - Master password: **Choose a strong password** (20+ random chars; save it as `DB_PASSWORD`)
5. **Instance configuration**: Should show `db.t3.micro` (free tier)
6. **Storage**:
   - Allocated storage: `20 GiB` (free tier max)
   - **Uncheck** "Enable automatic scaling" (if enabled, charges kick in if you exceed 20 GB)
7. **Connectivity**:
   - VPC: default
   - Public access: **Yes** (so you can connect from your machine)
   - **Create new VPC security group** → name: `imagegallery-rds`
8. **Additional configuration**:
   - Initial database name: `imagegallery`
   - Automated backups: Leave enabled (7 days; part of free tier)
   - Performance Insights: Disable
   - Enhanced monitoring: Disable
9. Click **Create database** (takes ~5 minutes)

#### Open RDS Security Group

By default, RDS blocks all inbound connections. Allow your machine:

1. **RDS** → **Databases** → **imagegallery** → **Connectivity & security** → **VPC security groups** → click the security group
2. **Inbound rules** → **Edit inbound rules** → **Add rule**:
   - Type: `PostgreSQL` (port 5432)
   - Source: **My IP** (or manually enter your home IP)
   - Save rules
3. (If your IP changes, update this rule; for development, this is fine)

#### Save RDS Connection Info

Once the database is created (status = "Available"), go back and note:
- **DB instance identifier**: `imagegallery` (save as `DB_NAME`)
- **Endpoint**: `imagegallery.c9akciq32.ap-south-1.rds.amazonaws.com` (save as `DB_HOST`)
- **Port**: `5432` (save as `DB_PORT`)
- **Master username**: `postgres` (save as `DB_USERNAME`)
- **Master password**: Whatever you chose (save as `DB_PASSWORD`)

---

## Part 2: Google OAuth Setup

Google OAuth is **free and separate from AWS**. You need Google Cloud Console.

### Step 2A — Create Google Cloud Project

1. Go to **console.cloud.google.com** (sign in with your Google account)
2. Click **Select a project** (top left) → **New Project**
3. Name: `imagegallery-oauth`
4. Create

### Step 2B — Enable Google+ API

1. **APIs & Services** → **Library**
2. Search: `Google+ API`
3. Click it → **Enable**

### Step 2C — Create OAuth2 Credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Name: `imagegallery-local`
4. **Authorized JavaScript origins** → **Add URI**:
   ```
   http://localhost:3000
   http://localhost:8000
   http://localhost:8080
   ```
   (Frontend, nginx, backend ports for local development)
5. **Authorized redirect URIs** → **Add URI**:
   ```
   http://localhost:8000/login/oauth2/code/google
   ```
   (Spring Security's OAuth callback endpoint via nginx)
6. Click **Create**
7. You'll see:
   - **Client ID**: `123456789.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-abcdefghijklmnop`
8. **Save both** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Part 3: Application Configuration

### Step 3A — Parameterize `application.yml` for Feature Profile

Update the `feature` profile section to use environment variables. Edit:
```
ImageAPI/src/main/resources/application.yml
```

Find the `# FEATURE PROFILE` section and replace it with:

```yaml
---
# FEATURE PROFILE (PostgreSQL & AWS S3)
spring:
  config:
    activate:
      on-profile: feature
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:imagegallery}?sslmode=require
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 5
      connection-timeout: 10000
      max-lifetime: 1700000
      keepalive-time: 300000
      leak-detection-threshold: 60000
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
    locations: classpath:db/migration

gallery:
  storage:
    type: s3
  frontend:
    url: ${GALLERY_FRONTEND_URL:http://localhost:3000}
  s3:
    bucket-name: ${S3_BUCKET_NAME}
    region: ${AWS_REGION:us-east-1}
    access-key: ${AWS_ACCESS_KEY_ID}
    secret-key: ${AWS_SECRET_ACCESS_KEY}
```

**Key changes:**
- `DB_HOST`, `DB_PORT`, `DB_NAME` are now env vars with defaults for development
- JDBC URL includes `?sslmode=require` (TLS is required for remote connections)
- HikariCP tuning for WAN latency
- CORS origin reads from `gallery.frontend.url` (no longer hardcoded in WebConfig)

### Step 3B — Google OAuth Profile (Already Correct)

The `google-auth` profile section is already correct; no changes needed.

---

## Part 4: Docker Setup

### Step 4A — Create `.env.feature` File

Create a new file in the repo root: `.env.feature`

```bash
# AWS S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
S3_BUCKET_NAME=imagegallery-yourname

# RDS PostgreSQL
DB_HOST=imagegallery.c9akciq32.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=imagegallery
DB_USERNAME=postgres
DB_PASSWORD=your-strong-password

# Google OAuth2
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop

# Application
GALLERY_FRONTEND_URL=http://localhost:3000
GALLERY_ADMIN_EMAIL=admin@example.com
GALLERY_ADMIN_PASSWORD=changeme
ANTHROPIC_API_KEY=
```

**Important:**
- Replace all `your-*` / `AKIA...` / `GOCSPX-...` with actual values from steps 1–2
- Keep `ANTHROPIC_API_KEY` empty (optional; only needed for AI image descriptions)
- **Never commit this file** — it contains secrets
- Ensure `.gitignore` includes `.env.feature`

### Step 4B — Create `compose.feature.override.yaml`

Create a new file: `compose.feature.override.yaml`

```yaml
services:
  backend:
    environment:
      SPRING_PROFILES_ACTIVE: feature,google-auth
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      AWS_REGION: ${AWS_REGION}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET_NAME: ${S3_BUCKET_NAME}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GALLERY_FRONTEND_URL: ${GALLERY_FRONTEND_URL}
      GALLERY_ADMIN_EMAIL: ${GALLERY_ADMIN_EMAIL}
      GALLERY_ADMIN_PASSWORD: ${GALLERY_ADMIN_PASSWORD}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    # No volume mounts — all data in RDS/S3
    env_file:
      - .env.feature

  frontend:
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
      BACKEND_URL: http://nginx:8000
      NEXT_PUBLIC_GOOGLE_AUTH: "true"  # Enable Google OAuth button
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    env_file:
      - .env.feature
```

**Key points:**
- Backend uses both `feature` and `google-auth` profiles
- All credentials passed as env vars from `.env.feature`
- Frontend has `NEXT_PUBLIC_GOOGLE_AUTH=true` (shows Google button)
- No `gallery-data` volume (stateless — all data in RDS/S3)

### Step 4C — Update `.gitignore`

Ensure `.gitignore` includes:

```
.env.feature
.env.local
```

Verify with:
```bash
git check-ignore .env.feature
# Should output: .env.feature
```

---

## Part 5: Starting the Feature Profile

### Step 5A — Build & Start

**Recommended (convenience script):**
```bash
./scripts/feature/up.sh
```

**Manual (equivalent to above):**
```bash
docker compose -f compose.yaml -f compose.feature.override.yaml up --build
```

**Expected output:**
- Backend builds ✓
- Frontend builds ✓
- Backend starts with `SPRING_PROFILES_ACTIVE=feature,google-auth`
- Flyway runs migrations (V1–V7) against RDS ✓
- All services are healthy ✓

### Step 5B — Test Endpoints

```bash
# Gallery API (should be empty)
curl http://localhost:8000/api/images

# Backend health
curl http://localhost:8080/api/auth/me
# Response: { "error": "Unauthorized" } — correct, no auth token

# Frontend loads
curl http://localhost:3000
```

### Step 5C — Test in Browser

1. Open **http://localhost:3000**
2. Click **"Sign in"** → should show email/password form + **"Sign in with Google"** button
3. Try email/password login (admin@example.com / changeme) ✓
4. Try "Sign in with Google" → redirects to Google consent → redirects back with token ✓
5. Upload an image → should appear in S3 bucket ✓
6. Verify in AWS S3 console:
   - Bucket `imagegallery-yourname`
   - Objects under `images/` and `thumbnails/` prefixes

---

## Part 6: Troubleshooting

### Issue: "Can't connect to RDS"
```
ERROR: java.sql.SQLException: Connection refused
```

**Fixes:**
1. Verify RDS is "Available" (takes ~5 minutes after creation)
2. Check security group inbound rule (step 1D)
3. Verify `.env.feature` has correct `DB_HOST` and password

### Issue: "S3 bucket not found"
```
ERROR: NoSuchBucket
```

**Fixes:**
1. Verify bucket name in `.env.feature` matches AWS
2. Verify IAM user has S3 permissions
3. Verify region in `.env.feature` matches bucket region

### Issue: "Invalid Google credentials"
```
ERROR: invalid_client
```

**Fixes:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are copied exactly
2. Check Google Console → Credentials → authorized origins include `http://localhost:3000` and `http://localhost:8000`
3. Check authorized redirect URIs include `http://localhost:8000/login/oauth2/code/google`

### Issue: Google button doesn't appear on login page
```
NEXT_PUBLIC_GOOGLE_AUTH is "false"
```

**Fixes:**
1. Verify `compose.feature.override.yaml` has `NEXT_PUBLIC_GOOGLE_AUTH: "true"`
2. Rebuild frontend: `docker compose -f compose.yaml -f compose.feature.override.yaml up --build`
3. Check browser console (DevTools) for errors

---

## What's Next

Once this setup works:

1. **Test uploading images** — verify they land in S3 (check AWS console)
2. **Test user registration** — verify users are stored in RDS
3. **Test OAuth flow** — sign in with Google, verify user created in RDS
4. **Run the test suite** (if tests exist for feature profile)
5. **Consider staging deployment** — use same setup on a cloud VM or container service

---

## Reference: Credential Checklist

Before starting Docker, verify you have:

- [ ] AWS Account created + billing alert set
- [ ] IAM user `imagegallery-app` created
- [ ] Access Key ID (`AWS_ACCESS_KEY_ID`)
- [ ] Secret Access Key (`AWS_SECRET_ACCESS_KEY`)
- [ ] S3 bucket created (`S3_BUCKET_NAME`)
- [ ] S3 versioning enabled
- [ ] RDS PostgreSQL instance created
- [ ] RDS security group allows your IP
- [ ] RDS endpoint (`DB_HOST`)
- [ ] RDS master password (`DB_PASSWORD`)
- [ ] Google Cloud Project created
- [ ] Google+ API enabled
- [ ] OAuth2 credentials created
- [ ] Google Client ID (`GOOGLE_CLIENT_ID`)
- [ ] Google Client Secret (`GOOGLE_CLIENT_SECRET`)
- [ ] `.env.feature` file created (gitignored)
- [ ] `compose.feature.override.yaml` file created
- [ ] `application.yml` feature profile parameterized

Once all checked ✓, run:
```bash
docker compose -f compose.yaml -f compose.feature.override.yaml up --build
```
