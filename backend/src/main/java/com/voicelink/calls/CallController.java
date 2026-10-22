package com.voicelink.calls;

import com.voicelink.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    @GetMapping("/active")
    public ResponseEntity<CallDto> getActiveCall(@AuthenticationPrincipal UserPrincipal principal) {
        Optional<CallDto> active = callService.getActiveCall(principal.getId());
        return active.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public ResponseEntity<Page<CallDto>> getHistory(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        Page<CallDto> history = callService.getCallHistory(
                principal.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return ResponseEntity.ok(history);
    }

    @PostMapping("/initiate")
    public ResponseEntity<CallDto> initiateCall(
            @Valid @RequestBody InitiateCallRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CallDto callDto = callService.initiateCall(principal.getId(), request.targetUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(callDto);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<CallDto> acceptCall(
            @PathVariable("id") UUID callId,
            @AuthenticationPrincipal UserPrincipal principal) {
        CallDto callDto = callService.acceptCall(callId, principal.getId());
        return ResponseEntity.ok(callDto);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<CallDto> rejectCall(
            @PathVariable("id") UUID callId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = body != null ? body.get("reason") : null;
        CallDto callDto = callService.rejectCall(callId, principal.getId(), reason);
        return ResponseEntity.ok(callDto);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CallDto> cancelCall(
            @PathVariable("id") UUID callId,
            @AuthenticationPrincipal UserPrincipal principal) {
        CallDto callDto = callService.cancelCall(callId, principal.getId());
        return ResponseEntity.ok(callDto);
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<CallDto> endCall(
            @PathVariable("id") UUID callId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String reason = body != null ? body.get("reason") : null;
        CallDto callDto = callService.endCall(callId, principal.getId(), reason);
        return ResponseEntity.ok(callDto);
    }
}
