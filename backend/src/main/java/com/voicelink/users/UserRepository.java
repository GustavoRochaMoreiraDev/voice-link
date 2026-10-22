package com.voicelink.users;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByNormalizedUsername(String normalizedUsername);

    Optional<User> findByEmail(String email);

    boolean existsByNormalizedUsername(String normalizedUsername);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.active = true AND u.normalizedUsername LIKE LOWER(CONCAT(:query, '%')) AND u.id != :excludeUserId")
    List<User> searchByUsernamePrefix(@Param("query") String query, @Param("excludeUserId") UUID excludeUserId, Pageable pageable);
}
