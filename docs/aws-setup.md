# AWS Setup — Feature Profile

The `feature` profile requires two AWS services:
- **Amazon S3** — stores uploaded images and generated thumbnails
- **Amazon RDS (PostgreSQL)** — the production database

Both are fully covered by the AWS Free Tier for 12 months from account creation. A personal gallery with light use will not exceed free tier limits during that window.

---

## Free Tier at a Glance

| Service | Free Tier Allowance | Typical monthly use | After free tier |
|---------|---------------------|---------------------|-----------------|
| S3 storage | 5 GB | ~1–2 GB (500–1000 photos) | $0.023/GB |
| S3 GET requests | 20,000 | ~2,500 (500 page views × 5 images) | $0.0004/1,000 |
| S3 PUT requests | 2,000 | ~100 (100 uploads) | $0.005/1,000 |
| RDS `db.t3.micro` | 750 hours/month | 744 (31 days × 24h) | ~$0.017/hour |
| RDS storage | 20 GB | ~1 GB | $0.115/GB |
| Data transfer out | 100 GB/month | ~1 GB | $0.09/GB |
| CloudFront (optional) | 1 TB + 10M requests | — | Pay as you go |

> The free tier is per-account, not per-service. It applies for 12 months from when you create your AWS account.

---

## Step 1 — Create an AWS Account

Go to [aws.amazon.com](https://aws.amazon.com) → **Create an AWS Account**. A credit card is required for verification but will not be charged while you stay within free tier limits.

After signing in, immediately set up a billing alert (Step 8) before doing anything else.

---

## Step 2 — IAM User and Permissions

**Never use root account credentials in application config.** Create a dedicated IAM user:

1. Go to **IAM → Users → Create user**
2. Name: `imagegallery-app`
3. **Permissions → Attach policies directly** — select **AmazonS3FullAccess** for initial setup
4. Create user → open the user → **Security credentials** tab → **Create access key**
5. Select **Application running outside AWS** → create → copy both keys immediately (shown only once)

### Minimal S3 policy (recommended after setup)

Replace the broad `AmazonS3FullAccess` with a policy scoped to your specific bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name. This is IAM best practice — limits the blast radius if the key is ever exposed.

---

## Step 3 — S3 Bucket

1. Go to **S3 → Create bucket**
2. **Bucket name**: `imagegallery-yourname` — must be globally unique across all AWS accounts
3. **Region**: pick one close to you
   - India: `ap-south-1` (Mumbai)
   - Europe: `eu-west-1` (Ireland)
   - US East: `us-east-1` (N. Virginia)
4. **Block all public access**: leave ON — the app serves files through Spring Boot, not direct S3 URLs
5. **Bucket versioning**: leave OFF — enabling it doubles storage for every overwrite
6. Everything else: leave as default → **Create bucket**

### Cost tips for S3

- **Versioning OFF**: critical — if you accidentally enable versioning, every deleted or overwritten file still counts toward storage
- **No lifecycle rules needed** for a personal gallery unless you add large test uploads
- **Region matches** your application server: cross-region data transfer between EC2 and S3 incurs charges; same region is free
- **Thumbnails save GET costs**: the app already generates 400×400 thumbnails at upload time, so gallery views fetch small files instead of full-resolution images

---

## Step 4 — RDS PostgreSQL Instance

1. Go to **RDS → Create database**
2. **Engine**: PostgreSQL → latest version (16.x)
3. **Templates**: select **Free tier** — this locks the instance class to `db.t3.micro` and disables paid options
4. **Settings**:
   - DB instance identifier: `imagegallery`
   - Master username: `postgres`
   - Master password: choose a strong password and save it
5. **Instance configuration**: `db.t3.micro` — confirmed by Free tier template
6. **Storage**:
   - Allocated storage: `20 GiB` (the free tier maximum)
   - **Disable storage autoscaling** — if this is left ON and storage grows beyond 20 GB, you will be charged immediately; a personal gallery will never need this
7. **Connectivity**:
   - VPC: default
   - Public access: **Yes** (required for connecting from your local machine)
   - VPC security group: **Create new** → name `imagegallery-rds`
8. **Additional configuration** (expand this section):
   - Initial database name: `imagegallery`
   - Automated backups: consider disabling for development (backup storage beyond 20 GB is charged separately)
   - Performance Insights: disable
   - Enhanced monitoring: disable
9. **Create database** — takes approximately 5 minutes

### Open port 5432 in the security group

By default the RDS security group blocks all inbound connections:

1. **RDS → Databases → imagegallery → Connectivity & security → VPC security groups**
2. Click the security group link → **Inbound rules → Edit inbound rules → Add rule**
3. Type: `PostgreSQL` (port 5432), Source: **My IP**
4. Save rules

If you develop from multiple locations, add each IP separately — or use `0.0.0.0/0` temporarily with the understanding that anyone who knows your endpoint and password can attempt to connect.

### Cost tips for RDS

- **750 hours ÷ 24 = 31.25 days**: one `db.t3.micro` running 24/7 fits exactly within the free tier
- **Stop when not developing**: RDS → Actions → Stop temporarily — suspends compute billing; storage still counts but is within the 20 GB free limit
  - AWS automatically restarts stopped instances after 7 days
- **Single-AZ only**: Multi-AZ creates a standby replica and doubles compute cost — leave it off
- **No read replicas**: each replica is a separate instance and billed separately
- **gp2 vs gp3 storage**: the free tier specifies gp2; gp3 is slightly cheaper after the free tier but requires a manual change

---

## Step 5 — Configure the Backend

### `application.yml` — feature profile section

Fill in the highlighted placeholders:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://<YOUR-RDS-ENDPOINT>:5432/imagegallery
    username: postgres
    password: ${DB_PASSWORD}
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate.ddl-auto: validate
  flyway.enabled: true

gallery:
  frontend.url: http://localhost:3000
  storage.type: s3
  s3:
    bucket-name: imagegallery-yourname
    region: ap-south-1
    access-key: ${AWS_ACCESS_KEY_ID}
    secret-key: ${AWS_SECRET_ACCESS_KEY}

  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:}
```

Find your RDS endpoint: **RDS → Databases → imagegallery → Connectivity & security** — the endpoint looks like `imagegallery.xxxxxxxxxxxx.ap-south-1.rds.amazonaws.com`.

### Set environment variables (per-session)

```powershell
$env:DB_PASSWORD           = "your-rds-master-password"
$env:AWS_ACCESS_KEY_ID     = "AKIA..."
$env:AWS_SECRET_ACCESS_KEY = "your-secret-access-key"
$env:ANTHROPIC_API_KEY     = "sk-ant-..."   # optional — only needed for visual search

cd ImageAPI
mvn spring-boot:run "-Dspring-boot.run.profiles=feature"
```

### Set environment variables permanently (User scope)

```powershell
[System.Environment]::SetEnvironmentVariable("DB_PASSWORD", "your-password", "User")
[System.Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID", "AKIA...", "User")
[System.Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", "your-secret", "User")
```

Restart your terminal after running these.

---

## Step 6 — Verify

```powershell
# 1. Check Flyway ran migrations successfully — backend log should show:
#    Successfully applied 5 migrations to schema "public"

# 2. Gallery API returns empty list (no images yet)
Invoke-RestMethod http://localhost:8080/api/images

# 3. Upload a test image
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/images" `
  -Form @{ file = (Get-Item "C:\path\to\test.jpg") }

# 4. Verify it appears in the gallery
Invoke-RestMethod http://localhost:8080/api/images

# 5. Verify S3 storage
# Go to S3 → your bucket — you should see:
#   images/test.jpg
#   thumbnails/test.jpg
```

---

## Step 7 — Backfill Visual Descriptions (if API key is configured)

If you have an Anthropic API key configured, trigger descriptions for all existing images:

```powershell
# Replace <token> with your owner JWT access token
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:8080/api/images/describe-all" `
  -Headers @{ Authorization = "Bearer <token>" }

# Response: { "queued": 5, "message": "5 images queued for description" }
```

---

## Step 8 — Set Up a Billing Alert

Do this immediately after creating your account — before anything else:

1. **Billing → Budgets → Create budget**
2. Type: **Cost budget**, Period: Monthly
3. Budgeted amount: `$5.00` (anything above $0 triggers the alert before you're charged)
4. Alert threshold: `80%` of budget
5. Email notifications: your email
6. Create budget

**Monthly check**: **Billing → Bills** shows a per-service cost breakdown. Look at it once a month.

**Free tier usage dashboard**: **Billing → Free Tier** — shows your current usage against limits in real time.

---

## Estimating Your Costs After Free Tier (Month 13+)

For a personal gallery with 1,000 photos and light traffic:

| Line item | Estimate | Cost |
|-----------|----------|------|
| S3 storage (2 GB) | 2 × $0.023 | $0.05 |
| S3 GETs (5,000) | 5 × $0.0004 | $0.002 |
| S3 PUTs (200) | 0.2 × $0.005 | $0.001 |
| RDS db.t3.micro (720h) | 720 × $0.017 | $12.24 |
| RDS storage (2 GB) | 2 × $0.115 | $0.23 |
| Data transfer (1 GB) | 1 × $0.09 | $0.09 |
| **Total** | | **~$12.61/month** |

The RDS compute cost dominates. If you want to cut costs after the free tier:
- **Stop RDS when not using the app** — reduces compute cost to only the days you run it
- **Switch to Aurora Serverless v2** — scales to zero when idle; pay only for what you use (more complex setup)
- **Use Neon or Supabase instead** — both offer generous free PostgreSQL tiers with no expiry

---

## Quick Reference

| Variable | Set in | Where to get it |
|----------|--------|-----------------|
| `DB_PASSWORD` | OS env var | Password you chose when creating RDS |
| `AWS_ACCESS_KEY_ID` | OS env var | IAM → Users → imagegallery-app → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | OS env var | Same place — shown only once at creation |
| `ANTHROPIC_API_KEY` | OS env var + `ImageWebPage/.env.local` | platform.anthropic.com → API Keys |

RDS endpoint location: **RDS → Databases → imagegallery → Connectivity & security → Endpoint and port**

S3 bucket region: must match the `gallery.s3.region` value in the feature profile section of `application.yml`
