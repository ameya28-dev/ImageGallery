package com.imagegallery.service;

import com.imagegallery.config.GalleryProperties;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;

@Service
@RequiredArgsConstructor
public class ThumbnailService {

    private final GalleryProperties properties;

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
        g.fillPolygon(
                new int[]{cx - r / 2, cx - r / 2, cx + r},
                new int[]{cy - r, cy + r, cy},
                3);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "jpeg", out);
        return new ByteArrayInputStream(out.toByteArray());
    }
}
