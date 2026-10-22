package com.voicelink.conversations;

import com.voicelink.common.ForbiddenException;
import com.voicelink.messages.Message;
import com.voicelink.messages.MessageDto;
import com.voicelink.messages.MessageRepository;
import com.voicelink.messages.SendMessageRequest;
import com.voicelink.presence.PresenceService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PresenceService presenceService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private ChatService chatService;

    private User alice;
    private User bob;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
                conversationRepository, messageRepository, userRepository, presenceService, messagingTemplate);

        alice = new User(UUID.randomUUID(), "alice", "alice", "alice@example.com", "hash", "Alice");
        bob = new User(UUID.randomUUID(), "bob", "bob", "bob@example.com", "hash", "Bob");
        conversation = new Conversation(UUID.randomUUID(), alice, bob);
    }

    @Test
    void sendMessage_success() {
        SendMessageRequest request = new SendMessageRequest(
                conversation.getId(), null, "Hello Bob!", "client-msg-123");

        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(conversationRepository.findById(conversation.getId())).thenReturn(Optional.of(conversation));
        when(messageRepository.findByConversationIdAndClientMessageId(conversation.getId(), "client-msg-123"))
                .thenReturn(Optional.empty());

        Message savedMsg = new Message(UUID.randomUUID(), conversation, alice, "Hello Bob!", "client-msg-123");
        when(messageRepository.save(any(Message.class))).thenReturn(savedMsg);

        MessageDto result = chatService.sendMessage(alice.getId(), request);

        assertThat(result).isNotNull();
        assertThat(result.content()).isEqualTo("Hello Bob!");
        verify(messageRepository).save(any(Message.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any(Object.class));
    }

    @Test
    void sendMessage_idempotency_returnsExistingMessage() {
        SendMessageRequest request = new SendMessageRequest(
                conversation.getId(), null, "Hello Bob!", "client-msg-123");

        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(conversationRepository.findById(conversation.getId())).thenReturn(Optional.of(conversation));

        Message existingMsg = new Message(UUID.randomUUID(), conversation, alice, "Hello Bob!", "client-msg-123");
        when(messageRepository.findByConversationIdAndClientMessageId(conversation.getId(), "client-msg-123"))
                .thenReturn(Optional.of(existingMsg));

        MessageDto result = chatService.sendMessage(alice.getId(), request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(existingMsg.getId());
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    void sendMessage_unauthorizedSender_throwsForbiddenException() {
        User eve = new User(UUID.randomUUID(), "eve", "eve", "eve@example.com", "hash", "Eve");
        SendMessageRequest request = new SendMessageRequest(
                conversation.getId(), null, "Spam", "client-msg-spam");

        when(userRepository.findById(eve.getId())).thenReturn(Optional.of(eve));
        when(conversationRepository.findById(conversation.getId())).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> chatService.sendMessage(eve.getId(), request))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Not authorized");
    }
}
