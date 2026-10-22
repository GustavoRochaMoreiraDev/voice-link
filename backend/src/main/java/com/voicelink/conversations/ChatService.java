package com.voicelink.conversations;

import com.voicelink.common.ForbiddenException;
import com.voicelink.common.ResourceNotFoundException;
import com.voicelink.messages.Message;
import com.voicelink.messages.MessageDto;
import com.voicelink.messages.MessageRepository;
import com.voicelink.messages.SendMessageRequest;
import com.voicelink.presence.PresenceService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import com.voicelink.users.UserSummaryDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            PresenceService presenceService,
            SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Conversation getOrCreateDirectConversation(UUID userAId, UUID userBId) {
        if (userAId.equals(userBId)) {
            throw new IllegalArgumentException("Cannot create conversation with yourself");
        }

        Optional<Conversation> existing = conversationRepository.findDirectConversation(userAId, userBId);
        if (existing.isPresent()) {
            return existing.get();
        }

        User userA = userRepository.findById(userAId)
                .orElseThrow(() -> new ResourceNotFoundException("User A not found"));
        User userB = userRepository.findById(userBId)
                .orElseThrow(() -> new ResourceNotFoundException("User B not found"));

        Conversation conversation = new Conversation(UUID.randomUUID(), userA, userB);
        return conversationRepository.save(conversation);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(UUID userId) {
        List<Conversation> conversations = conversationRepository.findUserConversations(userId);

        return conversations.stream().map(conv -> {
            User other = conv.getOtherParticipant(userId);
            boolean online = presenceService.isUserOnline(other.getId());
            UserSummaryDto otherDto = UserSummaryDto.of(other, online);

            MessageDto lastMsgDto = messageRepository.findLatestMessage(conv.getId())
                    .map(m -> MessageDto.of(m, presenceService.isUserOnline(m.getSender().getId())))
                    .orElse(null);

            return new ConversationDto(conv.getId(), conv.getType(), otherDto, lastMsgDto, conv.getUpdatedAt());
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getMessages(UUID conversationId, UUID userId, Pageable pageable) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new ForbiddenException("You are not a participant in this conversation");
        }

        return messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable)
                .map(m -> MessageDto.of(m, presenceService.isUserOnline(m.getSender().getId())));
    }

    @Transactional
    public MessageDto sendMessage(UUID senderId, SendMessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));

        Conversation conversation;
        if (request.conversationId() != null) {
            conversation = conversationRepository.findById(request.conversationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
            if (!conversation.hasParticipant(senderId)) {
                throw new ForbiddenException("Not authorized to post to this conversation");
            }
        } else if (request.recipientUsername() != null) {
            User recipient = userRepository.findByNormalizedUsername(request.recipientUsername().trim().toLowerCase())
                    .orElseThrow(() -> new ResourceNotFoundException("Recipient @" + request.recipientUsername() + " not found"));
            conversation = getOrCreateDirectConversation(senderId, recipient.getId());
        } else {
            throw new IllegalArgumentException("Either conversationId or recipientUsername must be provided");
        }

        // Idempotency check
        if (request.clientMessageId() != null && !request.clientMessageId().isBlank()) {
            Optional<Message> duplicate = messageRepository.findByConversationIdAndClientMessageId(
                    conversation.getId(), request.clientMessageId());
            if (duplicate.isPresent()) {
                log.info("Duplicate message detected with clientMessageId: {}", request.clientMessageId());
                return MessageDto.of(duplicate.get(), true);
            }
        }

        Message message = new Message(
                UUID.randomUUID(),
                conversation,
                sender,
                request.content().trim(),
                request.clientMessageId()
        );

        Message savedMessage = messageRepository.save(message);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        MessageDto messageDto = MessageDto.of(savedMessage, true);

        // Notify recipient
        User recipient = conversation.getOtherParticipant(senderId);
        notifyUser(recipient.getUsername(), "/queue/messages", Map.of(
                "type", "CHAT_MESSAGE",
                "message", messageDto
        ));

        // Notify sender confirmation
        notifyUser(sender.getUsername(), "/queue/messages", Map.of(
                "type", "CHAT_MESSAGE_SENT",
                "message", messageDto
        ));

        return messageDto;
    }

    private void notifyUser(String username, String destination, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(username, destination, payload);
        } catch (Exception e) {
            log.warn("Failed to deliver chat event to {}: {}", username, e.getMessage());
        }
    }
}
