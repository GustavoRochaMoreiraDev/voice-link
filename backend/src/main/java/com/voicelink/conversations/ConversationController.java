package com.voicelink.conversations;

import com.voicelink.messages.MessageDto;
import com.voicelink.messages.SendMessageRequest;
import com.voicelink.security.UserPrincipal;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import com.voicelink.common.ResourceNotFoundException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    public ConversationController(ChatService chatService, UserRepository userRepository) {
        this.chatService = chatService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getConversations(@AuthenticationPrincipal UserPrincipal principal) {
        List<ConversationDto> list = chatService.getUserConversations(principal.getId());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/direct/{username}")
    public ResponseEntity<ConversationDto> getOrCreateDirect(
            @PathVariable("username") String username,
            @AuthenticationPrincipal UserPrincipal principal) {
        User target = userRepository.findByNormalizedUsername(username.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User @" + username + " not found"));

        Conversation conv = chatService.getOrCreateDirectConversation(principal.getId(), target.getId());
        List<ConversationDto> list = chatService.getUserConversations(principal.getId());
        ConversationDto result = list.stream()
                .filter(c -> c.id().equals(conv.getId()))
                .findFirst()
                .orElse(new ConversationDto(conv.getId(), "DIRECT", null, null, conv.getUpdatedAt()));

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<Page<MessageDto>> getMessages(
            @PathVariable("id") UUID conversationId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        Page<MessageDto> messages = chatService.getMessages(
                conversationId, principal.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageDto> sendMessage(
            @PathVariable("id") UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        SendMessageRequest requestWithId = new SendMessageRequest(
                conversationId,
                null,
                request.content(),
                request.clientMessageId()
        );
        MessageDto messageDto = chatService.sendMessage(principal.getId(), requestWithId);
        return ResponseEntity.status(HttpStatus.CREATED).body(messageDto);
    }
}
