package com.voicelink.auth;

import com.voicelink.common.ConflictException;
import com.voicelink.security.JwtService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void register_success() {
        RegisterRequest request = new RegisterRequest("alice", "alice@example.com", "Password123!", "Alice In Chains");
        when(userRepository.existsByNormalizedUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("hashed-pwd");

        UUID generatedId = UUID.randomUUID();
        User mockUser = new User(generatedId, "alice", "alice", "alice@example.com", "hashed-pwd", "Alice In Chains");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        when(jwtService.generateToken(mockUser.getId(), "alice")).thenReturn("jwt-alice-token");

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("jwt-alice-token");
        assertThat(response.user().username()).isEqualTo("alice");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_duplicateUsername_throwsConflictException() {
        RegisterRequest request = new RegisterRequest("alice", "alice@example.com", "Password123!", "Alice");
        when(userRepository.existsByNormalizedUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username is already taken");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_validCredentials_returnsToken() {
        LoginRequest request = new LoginRequest("alice", "Password123!");
        User mockUser = new User(UUID.randomUUID(), "alice", "alice", "alice@example.com", "hashed-pwd", "Alice");

        when(userRepository.findByNormalizedUsername("alice")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("Password123!", "hashed-pwd")).thenReturn(true);
        when(jwtService.generateToken(mockUser.getId(), "alice")).thenReturn("jwt-alice-token");

        AuthResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt-alice-token");
        assertThat(response.user().username()).isEqualTo("alice");
    }

    @Test
    void login_invalidPassword_throwsBadCredentialsException() {
        LoginRequest request = new LoginRequest("alice", "WrongPassword");
        User mockUser = new User(UUID.randomUUID(), "alice", "alice", "alice@example.com", "hashed-pwd", "Alice");

        when(userRepository.findByNormalizedUsername("alice")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("WrongPassword", "hashed-pwd")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid username or password");
    }
}
