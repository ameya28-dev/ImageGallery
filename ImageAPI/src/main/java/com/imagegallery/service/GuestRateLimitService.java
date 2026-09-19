package com.imagegallery.service;

import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

/**
 * In-memory daily upload counter keyed by client IP. Resets automatically when the date changes.
 * State is lost on server restart (acceptable for a personal gallery).
 */
@Service
public class GuestRateLimitService {

  public static final int DAILY_LIMIT = 5;

  private record DailyCount(LocalDate date, AtomicInteger count) {}

  private final ConcurrentHashMap<String, DailyCount> store = new ConcurrentHashMap<>();

  /**
   * Increments the counter for {@code ip} and returns {@code true} if the request is within the
   * daily limit.
   */
  public boolean tryConsume(String ip) {
    DailyCount entry =
        store.compute(
            ip,
            (k, v) -> {
              if (v == null || !v.date().equals(LocalDate.now())) {
                return new DailyCount(LocalDate.now(), new AtomicInteger(0));
              }
              return v;
            });
    return entry.count().incrementAndGet() <= DAILY_LIMIT;
  }

  /** How many uploads remain for {@code ip} today. */
  public int remaining(String ip) {
    DailyCount entry = store.get(ip);
    if (entry == null || !entry.date().equals(LocalDate.now())) return DAILY_LIMIT;
    return Math.max(0, DAILY_LIMIT - entry.count().get());
  }
}
