# Docker Compose Scripts

This directory contains convenient shell script wrappers for common Docker Compose operations, organized by profile.

## Quick Start

```bash
# Local profile (SQLite, guest mode enabled)
./scripts/local/up.sh              # Start the app
./scripts/local/down.sh            # Stop containers

# Feature profile (RDS + S3, login required)
./scripts/feature/up.sh            # Start the app
./scripts/feature/down.sh          # Stop containers
```

## Local Profile Scripts

**Location**: `./scripts/local/`

| Script | Purpose |
|--------|---------|
| `up.sh` | Start the app with local profile (SQLite + local storage) |
| `down.sh` | Stop containers (data preserved) |
| `reset.sh` | Full reset: delete containers, volumes, and all local data ⚠️ |
| `debug.sh` | Start with debug services (SQLite Web UI on :8085) |
| `logs.sh` | Tail logs from all services or a specific service |
| `status.sh` | Show container status and service URLs |
| `rebuild.sh` | Rebuild Docker images without starting |
| `shell-backend.sh` | Open bash shell in backend container |
| `shell-frontend.sh` | Open sh shell in frontend container |
| `clean.sh` | Clean up Docker artifacts (stopped containers, dangling images) |

### Examples

```bash
# Start the app and follow logs
./scripts/local/up.sh &
./scripts/local/logs.sh -f

# Check what's running
./scripts/local/status.sh

# Debug with SQLite Web UI
./scripts/local/debug.sh

# Enter the backend container
./scripts/local/shell-backend.sh

# Full reset
./scripts/local/reset.sh
```

## Feature Profile Scripts

**Location**: `./scripts/feature/`

| Script | Purpose |
|--------|---------|
| `up.sh` | Start the app with feature profile (RDS + S3, login required) |
| `down.sh` | Stop containers (RDS/S3 data preserved) |
| `reset.sh` | Reset: delete local containers/volumes (AWS data preserved) |
| `logs.sh` | Tail logs from all services or a specific service |
| `status.sh` | Show container status, service URLs, and .env.feature validation |
| `rebuild.sh` | Rebuild Docker images without starting |
| `shell-backend.sh` | Open bash shell in backend container |
| `shell-frontend.sh` | Open sh shell in frontend container |
| `clean.sh` | Clean up Docker artifacts (stopped containers, dangling images) |

### Prerequisites

Before running feature profile scripts, create `.env.feature` with AWS credentials:

```bash
# See .env.feature.example for a template
cp .env.feature.example .env.feature
# Edit .env.feature with your AWS credentials, RDS details, and Google OAuth keys
```

### Examples

```bash
# Start the feature profile
./scripts/feature/up.sh

# Check status and validate .env.feature
./scripts/feature/status.sh

# Enter the backend container
./scripts/feature/shell-backend.sh

# Stop the app
./scripts/feature/down.sh
```

## Making Scripts Executable

If scripts are not executable, run:

```bash
chmod +x scripts/local/*.sh
chmod +x scripts/feature/*.sh
```

## General Workflow

### Local Development

```bash
# Terminal 1: Start the app
./scripts/local/up.sh

# Terminal 2: Watch logs
./scripts/local/logs.sh

# Terminal 3: Debug or shell in
./scripts/local/debug.sh
./scripts/local/shell-backend.sh
```

### Feature Profile Testing

```bash
# Terminal 1: Start the feature profile
./scripts/feature/up.sh

# Terminal 2: Watch logs
./scripts/feature/logs.sh

# Terminal 3: Monitor status
watch -n 5 ./scripts/feature/status.sh
```

### Cleanup

```bash
# Local: delete everything
./scripts/local/reset.sh

# Local: just prune images/containers
./scripts/local/clean.sh

# Feature: reset local Docker state (AWS data preserved)
./scripts/feature/reset.sh
```

## Troubleshooting

**Script not found?**
```bash
ls -la scripts/local/
ls -la scripts/feature/
```

**Permission denied?**
```bash
chmod +x scripts/local/*.sh scripts/feature/*.sh
```

**Container not responding?**
```bash
./scripts/local/status.sh
./scripts/local/logs.sh backend
```

**Feature profile won't start?**
```bash
./scripts/feature/status.sh  # checks for .env.feature
```
