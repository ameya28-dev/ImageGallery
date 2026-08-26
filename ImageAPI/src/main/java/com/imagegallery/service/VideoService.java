package com.imagegallery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.Scanner;
import java.util.concurrent.TimeUnit;

/**
 * Service for video processing using FFmpeg.
 * Handles frame extraction and metadata reading.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VideoService {

    /**
     * Extract the first frame from a video file as a JPEG.
     * Returns the JPEG image bytes.
     */
    public byte[] extractFirstFrame(File videoFile) throws IOException {
        File tempFrame = File.createTempFile("frame-", ".jpg");
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg",
                    "-i", videoFile.getAbsolutePath(),
                    "-vframes", "1",
                    "-vf", "scale=320:240:force_original_aspect_ratio=decrease",
                    "-q:v", "5",
                    "-y",
                    tempFrame.getAbsolutePath()
            );
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();

            try {
                if (!process.waitFor(30, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    throw new IOException("FFmpeg frame extraction timed out");
                }
            } catch (InterruptedException e) {
                process.destroyForcibly();
                Thread.currentThread().interrupt();
                throw new IOException("Frame extraction interrupted", e);
            }

            if (process.exitValue() != 0) {
                throw new IOException("FFmpeg frame extraction failed with exit code: " + process.exitValue());
            }

            // Read the extracted frame into memory
            try (FileInputStream fis = new FileInputStream(tempFrame)) {
                return fis.readAllBytes();
            }
        } finally {
            if (!tempFrame.delete()) {
                log.warn("Failed to delete temporary frame file: {}", tempFrame);
            }
        }
    }

    /**
     * Get the duration of a video file in seconds.
     * Returns -1.0 if duration cannot be determined.
     */
    public double getVideoDuration(File videoFile) throws IOException {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1:nokey=1",
                    videoFile.getAbsolutePath()
            );
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();

            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return -1.0;
            }

            if (process.exitValue() != 0) {
                return -1.0;
            }

            try (Scanner scanner = new Scanner(process.getInputStream())) {
                if (scanner.hasNextDouble()) {
                    return scanner.nextDouble();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Video duration extraction interrupted", e);
        }
        return -1.0;
    }

    /**
     * Format duration in seconds to HH:MM:SS or MM:SS format.
     * Uses HH:MM:SS if duration >= 1 hour, otherwise MM:SS.
     */
    public static String formatDuration(double seconds) {
        if (seconds < 0) return "";

        long totalSeconds = (long) seconds;
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long secs = totalSeconds % 60;

        if (hours > 0) {
            return String.format("%d:%02d:%02d", hours, minutes, secs);
        } else {
            return String.format("%d:%02d", minutes, secs);
        }
    }
}
