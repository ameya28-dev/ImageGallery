package com.imagegallery.security;

import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * Extension of Spring Security's User principal to carry the numeric user ID. This allows
 * downstream code to resolve the owner scope without an extra DB lookup per request.
 */
public class AppUserPrincipal extends User {

  private final Long id;

  public AppUserPrincipal(
      Long id,
      String username,
      String password,
      Collection<? extends GrantedAuthority> authorities) {
    super(username, password, authorities);
    this.id = id;
  }

  public Long getId() {
    return id;
  }
}
