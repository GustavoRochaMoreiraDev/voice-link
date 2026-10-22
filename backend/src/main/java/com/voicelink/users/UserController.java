package com.voicelink.users;

import com.voicelink.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSummaryDto>> searchUsers(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<UserSummaryDto> results = userService.searchUsers(query, principal.getId());
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserSummaryDto> getUserProfile(@PathVariable("id") UUID id) {
        UserSummaryDto userSummary = userService.getUserSummary(id);
        return ResponseEntity.ok(userSummary);
    }
}
