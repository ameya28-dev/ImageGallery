package com.imagegallery.service;

import com.imagegallery.config.GalleryProperties;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ThumbnailService {

  private final GalleryProperties properties;
  private final VideoService videoService;

  public InputStream generateThumbnail(InputStream source, String formatName) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Thumbnails.of(source)
        .size(properties.getThumbnail().getWidth(), properties.getThumbnail().getHeight())
        .keepAspectRatio(true)
        .outputQuality(0.82)
        .outputFormat(formatName)
        .toOutputStream(out);
    return new ByteArrayInputStream(out.toByteArray());
  }

  public InputStream generateVideoPlaceholder() throws IOException {
    int w = properties.getThumbnail().getWidth();
    int h = properties.getThumbnail().getHeight();
    BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = img.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    g.setColor(new Color(20, 20, 20));
    g.fillRect(0, 0, w, h);
    // Play triangle centred in the image
    int cx = w / 2, cy = h / 2, r = Math.min(w, h) / 5;
    g.setColor(new Color(200, 200, 200));
    g.fillPolygon(new int[] {cx - r / 2, cx - r / 2, cx + r}, new int[] {cy - r, cy + r, cy}, 3);
    g.dispose();
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    ImageIO.write(img, "jpeg", out);
    return new ByteArrayInputStream(out.toByteArray());
  }

  /**
   * Generate a video thumbnail: first frame with play button (bottom-right) and duration text. If
   * frame extraction fails, falls back to placeholder.
   */
  public InputStream generateVideoThumbnail(File videoFile, double videoDuration)
      throws IOException {
    try {
      // Extract first frame
      byte[] frameBytes = videoService.extractFirstFrame(videoFile);
      BufferedImage frame = ImageIO.read(new ByteArrayInputStream(frameBytes));

      if (frame == null) {
        return generateVideoPlaceholder();
      }

      // Resize to thumbnail size while maintaining aspect ratio
      int thumbW = properties.getThumbnail().getWidth();
      int thumbH = properties.getThumbnail().getHeight();
      BufferedImage thumbnail =
          Thumbnails.of(frame).size(thumbW, thumbH).keepAspectRatio(true).asBufferedImage();

      // Create output image with thumbnail dimensions
      BufferedImage result = new BufferedImage(thumbW, thumbH, BufferedImage.TYPE_INT_RGB);
      Graphics2D g = result.createGraphics();
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g.setColor(new Color(20, 20, 20));
      g.fillRect(0, 0, thumbW, thumbH);

      // Draw the frame centered
      int x = (thumbW - thumbnail.getWidth()) / 2;
      int y = (thumbH - thumbnail.getHeight()) / 2;
      g.drawImage(thumbnail, x, y, null);

      // Draw play button and duration in bottom-right corner
      int padding = 12;

      // Draw duration text if available (larger, more prominent)
      String durationText = videoDuration > 0 ? VideoService.formatDuration(videoDuration) : "";
      int durationFontSize = Math.max(18, thumbW / 16); // Much larger font
      g.setFont(new Font("Arial", Font.BOLD, durationFontSize));
      FontMetrics fm = g.getFontMetrics();
      int textWidth = fm.stringWidth(durationText);
      int textHeight = fm.getHeight();

      // Play triangle size proportional to text height
      int playSize = (int) (textHeight * 0.8);
      int totalWidth = playSize + textWidth + 16; // play button + duration + spacing
      int totalHeight = textHeight + 8;

      // Position in bottom-right corner
      int bgX = thumbW - totalWidth - padding;
      int bgY = thumbH - totalHeight - padding;

      // Semi-transparent dark background for the entire badge
      g.setColor(new Color(0, 0, 0, 200));
      g.fillRoundRect(bgX, bgY, totalWidth, totalHeight, 6, 6);

      // Draw play triangle on the left
      int playPadding = 6;
      int playX = bgX + playPadding;
      int playY = bgY + totalHeight / 2;
      int offset = playSize / 3;
      g.setColor(Color.WHITE);
      g.fillPolygon(
          new int[] {playX, playX, playX + offset + offset},
          new int[] {playY - offset, playY + offset, playY},
          3);

      // Draw duration text on the right
      int textX = playX + playSize + 10;
      int textY = bgY + fm.getAscent() + 3;
      g.setColor(Color.WHITE);
      if (durationText.length() > 0) {
        g.drawString(durationText, textX, textY);
      }

      g.dispose();

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      ImageIO.write(result, "jpeg", out);
      return new ByteArrayInputStream(out.toByteArray());
    } catch (Exception e) {
      // Fallback to placeholder if anything fails
      return generateVideoPlaceholder();
    }
  }
}
