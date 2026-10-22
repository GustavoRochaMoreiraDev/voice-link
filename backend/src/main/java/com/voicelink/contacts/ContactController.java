package com.voicelink.contacts;

import com.voicelink.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public ResponseEntity<List<ContactDto>> listContacts(@AuthenticationPrincipal UserPrincipal principal) {
        List<ContactDto> contacts = contactService.listContacts(principal.getId());
        return ResponseEntity.ok(contacts);
    }

    @GetMapping("/requests")
    public ResponseEntity<List<ContactDto>> listRequests(@AuthenticationPrincipal UserPrincipal principal) {
        List<ContactDto> requests = contactService.listPendingRequests(principal.getId());
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/requests")
    public ResponseEntity<ContactDto> sendRequest(
            @Valid @RequestBody SendContactRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContactDto contactDto = contactService.sendRequest(principal.getId(), request.username());
        return ResponseEntity.status(HttpStatus.CREATED).body(contactDto);
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<ContactDto> acceptRequest(
            @PathVariable("id") UUID contactId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ContactDto contactDto = contactService.acceptRequest(contactId, principal.getId());
        return ResponseEntity.ok(contactDto);
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable("id") UUID contactId,
            @AuthenticationPrincipal UserPrincipal principal) {
        contactService.rejectRequest(contactId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeContact(
            @PathVariable("id") UUID contactId,
            @AuthenticationPrincipal UserPrincipal principal) {
        contactService.removeContact(contactId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
