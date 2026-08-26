# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### Backend Features
- **Multi-User Authentication**
  - JWT-based login and registration system
  - User isolation with owner_id field on images
  - Secure password hashing (BCrypt)
  - Token refresh mechanism
  - AuthController with /api/auth/login and /api/auth/register endpoints

- **Video Support**
  - VideoService for FFmpeg-based video processing
  - First-frame extraction from video files (MP4, MOV, WebM, AVI, MKV, WMV)
  - Video duration metadata extraction and storage
  - Auto-generated video thumbnails with:
    - First frame from video as background
    - Play button (▶️) in bottom-right corner
    - Duration text (mm:ss or hh:mm:ss) overlay
  - Full video player in lightbox with native HTML5 controls

- **WebP Image Support**
  - Added webp-imageio Maven dependency (org.sejda.imageio:webp-imageio:0.1.6)
  - Automatic JPEG thumbnail generation for WebP sources
  - Full-resolution WebP images remain accessible

- **Database Improvements**
  - V8 migration: Added video_duration column for video metadata tracking
  - V7 migration: Owner_id field for multi-tenancy support
  - Updated Image model with videoDuration field

- **Docker Enhancements**
  - FFmpeg installed in backend Docker image for video processing
  - Support for system-level video manipulation

#### Frontend Features
- **Enhanced Lightbox UI**
  - Double-click to toggle fullscreen (replaces single-click navigation)
  - Arrow keys always work for navigation (regardless of info panel state)
  - ESC key to exit fullscreen or close lightbox
  - Simplified click behavior (no accidental navigation)
  - Info panel stays open during navigation (no jarring close)

- **Video Player Integration**
  - HTML5 `<video>` tag rendering for video files
  - Native video controls (play, pause, volume, fullscreen)
  - Auto-play video when loaded
  - Blob URL-based video delivery for authenticated access

- **Authentication UI**
  - LoginPage component with email/password form
  - RegisterPage component for new user signup
  - AuthContext with JWT token management
  - Protected gallery pages (redirect to login if unauthenticated)
  - Improved error handling for auth-specific errors

- **Upload Support**
  - Updated file input to accept both images and videos
  - `accept="image/*,video/*"` on upload forms

#### Infrastructure & Configuration
- Nginx reverse proxy properly configured for CORS
- Docker Compose network setup for frontend-tier and backend-tier
- FFmpeg included in backend runtime image
- Flyway migrations compatible with both SQLite (local) and PostgreSQL (feature)

### Changed
- ThumbnailService completely refactored to support both image and video thumbnails
- ImageService uploadAndRegister method now processes videos asynchronously
- Image model extended with videoDuration field
- All endpoints properly scoped to owner_id (multi-tenant access control)
- Dockerfile: FFmpeg installed in Eclipse Temurin JRE image

### Fixed
- WebP images now properly generate JPEG thumbnails (Java ImageIO limitation)
- Video upload handling with proper async frame extraction
- Arrow key navigation now works regardless of UI state
- Lightbox click behavior no longer causes jarring panel collapse

### Database Migrations
- **V8__add_video_duration.sql** — New column for video length in seconds
- Migration compatible with both SQLite and PostgreSQL

## [Previous Versions]

See git history for earlier changes prior to this session.

---

## Installation & Setup

### Quick Start
```bash
docker compose up --build
```

### First-Time Authentication
1. Register a new account at http://localhost:3000/register
2. Or login if you already have an account
3. Your gallery is private and isolated from other users

### Uploading Media
- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, MOV, WebM, AVI, MKV, WMV
- All formats auto-generate thumbnails
- Videos show duration badge on thumbnail

## Known Limitations

- Video frame extraction requires FFmpeg (included in Docker image)
- WebP images generate JPEG thumbnails (Java ImageIO limitation; source WebP still available)
- Single database instance (no distributed processing)

## Future Roadmap

- OAuth authentication (Google, GitHub)
- AWS S3 backend for feature profile
- Full-text search with Elasticsearch
- Image classification tags via Claude Vision
- Collections/albums organization
- User sharing and collaboration features
