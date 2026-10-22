package com.voicelink.auth;

import com.voicelink.common.ConflictException;
import com.voicelink.security.JwtService;
import com.voicelink.users.User;
import com.voicelink.users.UserDto;
import com.voicelink.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedUsername = request.username().trim().toLowerCase();
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByNormalizedUsername(normalizedUsername)) {
            throw new ConflictException("Username is already taken");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email is already registered");
        }

        User user = new User(
                UUID.randomUUID(),
                request.username().trim(),
                normalizedUsername,
                email,
                passwordEncoder.encode(request.password()),
                request.displayName().trim()
        );

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: id={}, username={}", savedUser.getId(), savedUser.getUsername());

        String token = jwtService.generateToken(savedUser.getId(), savedUser.getUsername());
        return new AuthResponse(token, UserDto.fromEntity(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedUsername = request.username().trim().toLowerCase();

        User user = userRepository.findByNormalizedUsername(normalizedUsername)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!user.isActive()) {
            throw new BadCredentialsException("Account is deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Failed login attempt for user: {}", normalizedUsername);
            throw new BadCredentialsException("Invalid username or password");
        }

        log.info("User logged in successfully: id={}, username={}", user.getId(), user.getUsername());
        String token = jwtService.generateToken(user.getId(), user.getUsername());
        return new AuthResponse(token, UserDto.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public UserDto getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("User not found"));
        return UserDto.fromEntity(user);
    }
}
