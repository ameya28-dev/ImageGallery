package com.imagegallery.repository;

import com.imagegallery.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);

  Optional<User> findByGoogleId(String googleId);

  Optional<User> findByRefreshToken(String refreshToken);
}
