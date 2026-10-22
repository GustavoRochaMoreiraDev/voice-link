package com.voicelink.contacts;

import com.voicelink.common.BusinessException;
import com.voicelink.common.ConflictException;
import com.voicelink.common.ForbiddenException;
import com.voicelink.common.ResourceNotFoundException;
import com.voicelink.presence.PresenceService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public ContactService(
            ContactRepository contactRepository,
            UserRepository userRepository,
            PresenceService presenceService,
            SimpMessagingTemplate messagingTemplate) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ContactDto sendRequest(UUID requesterId, String recipientUsername) {
        String normalized = recipientUsername.trim().toLowerCase();

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Requester not found"));

        User recipient = userRepository.findByNormalizedUsername(normalized)
                .orElseThrow(() -> new ResourceNotFoundException("User @" + recipientUsername + " not found"));

        if (requester.getId().equals(recipient.getId())) {
            throw new BusinessException("You cannot send a contact request to yourself");
        }

        Optional<Contact> existingOpt = contactRepository.findRelationship(requester.getId(), recipient.getId());
        if (existingOpt.isPresent()) {
            Contact existing = existingOpt.get();
            if (existing.getStatus() == Contact.Status.ACCEPTED) {
                throw new ConflictException("You are already contacts with @" + recipient.getUsername());
            } else if (existing.getStatus() == Contact.Status.PENDING) {
                throw new ConflictException("A contact request is already pending between you");
            } else if (existing.getStatus() == Contact.Status.BLOCKED) {
                throw new ForbiddenException("Cannot send contact request to this user");
            } else {
                // If previously rejected, re-open as PENDING
                existing.setRequester(requester);
                existing.setRecipient(recipient);
                existing.setStatus(Contact.Status.PENDING);
                Contact saved = contactRepository.save(existing);
                notifyContactEvent(recipient.getUsername(), "CONTACT_REQUEST_RECEIVED", saved, recipient.getId());
                return ContactDto.of(saved, requesterId, presenceService.isUserOnline(recipient.getId()));
            }
        }

        Contact contact = new Contact(UUID.randomUUID(), requester, recipient, Contact.Status.PENDING);
        Contact saved = contactRepository.save(contact);
        log.info("Contact request sent from {} to {}", requester.getUsername(), recipient.getUsername());

        // Notify recipient via WebSocket
        notifyContactEvent(recipient.getUsername(), "CONTACT_REQUEST_RECEIVED", saved, recipient.getId());

        return ContactDto.of(saved, requesterId, presenceService.isUserOnline(recipient.getId()));
    }

    @Transactional
    public ContactDto acceptRequest(UUID contactId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact request not found"));

        if (!contact.getRecipient().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the recipient can accept a contact request");
        }

        if (contact.getStatus() != Contact.Status.PENDING) {
            throw new BusinessException("Contact request is not pending");
        }

        contact.setStatus(Contact.Status.ACCEPTED);
        Contact saved = contactRepository.save(contact);
        log.info("Contact request accepted between {} and {}", contact.getRequester().getUsername(), contact.getRecipient().getUsername());

        // Notify requester that their request was accepted
        notifyContactEvent(contact.getRequester().getUsername(), "CONTACT_ACCEPTED", saved, contact.getRequester().getId());

        return ContactDto.of(saved, currentUserId, presenceService.isUserOnline(contact.getRequester().getId()));
    }

    @Transactional
    public void rejectRequest(UUID contactId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact request not found"));

        if (!contact.getRecipient().getId().equals(currentUserId)) {
            throw new ForbiddenException("Only the recipient can reject a contact request");
        }

        contact.setStatus(Contact.Status.REJECTED);
        contactRepository.save(contact);
        log.info("Contact request rejected between {} and {}", contact.getRequester().getUsername(), contact.getRecipient().getUsername());
    }

    @Transactional
    public void removeContact(UUID contactId, UUID currentUserId) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));

        boolean isParticipant = contact.getRequester().getId().equals(currentUserId)
                || contact.getRecipient().getId().equals(currentUserId);

        if (!isParticipant) {
            throw new ForbiddenException("Not authorized to remove this contact");
        }

        contactRepository.delete(contact);
        log.info("Contact removed: id={}", contactId);
    }

    @Transactional(readOnly = true)
    public List<ContactDto> listContacts(UUID currentUserId) {
        List<Contact> contacts = contactRepository.findAcceptedContactsForUser(currentUserId);
        return contacts.stream()
                .map(c -> {
                    UUID otherId = c.getRequester().getId().equals(currentUserId)
                            ? c.getRecipient().getId() : c.getRequester().getId();
                    return ContactDto.of(c, currentUserId, presenceService.isUserOnline(otherId));
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContactDto> listPendingRequests(UUID currentUserId) {
        List<Contact> incoming = contactRepository.findPendingIncomingRequests(currentUserId);
        List<Contact> outgoing = contactRepository.findPendingOutgoingRequests(currentUserId);

        List<ContactDto> list = incoming.stream()
                .map(c -> ContactDto.of(c, currentUserId, presenceService.isUserOnline(c.getRequester().getId())))
                .collect(Collectors.toList());

        outgoing.stream()
                .map(c -> ContactDto.of(c, currentUserId, presenceService.isUserOnline(c.getRecipient().getId())))
                .forEach(list::add);

        return list;
    }

    @Transactional(readOnly = true)
    public boolean areContacts(UUID userA, UUID userB) {
        return contactRepository.findRelationship(userA, userB)
                .filter(c -> c.getStatus() == Contact.Status.ACCEPTED)
                .isPresent();
    }

    private void notifyContactEvent(String destinationUsername, String eventType, Contact contact, UUID recipientId) {
        try {
            Map<String, Object> payload = Map.of(
                    "type", eventType,
                    "contact", ContactDto.of(contact, recipientId, true)
            );
            messagingTemplate.convertAndSendToUser(destinationUsername, "/queue/contacts", payload);
        } catch (Exception e) {
            log.warn("Failed to push contact event via websocket: {}", e.getMessage());
        }
    }
}
