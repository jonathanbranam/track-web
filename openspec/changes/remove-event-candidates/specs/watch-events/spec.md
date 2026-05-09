**App**: client-watch

## ADDED Requirements

### Requirement: Remove a candidate from a watch event
Any invitee SHALL be able to remove any candidate from a watch event that has not yet been completed. Removing a candidate SHALL atomically delete all associated votes and, if the candidate is the currently confirmed selection, clear that selection as well. Removal SHALL be blocked if the event is already completed.

#### Scenario: Invitee removes a candidate
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the `watch_event_candidates` row is deleted, all `watch_event_votes` rows for that candidate are deleted, and the server returns 204

#### Scenario: Selection cleared when selected candidate is removed
- **WHEN** an invitee removes a candidate that is the current confirmed selection
- **THEN** the `watch_event_selection` row for the event is also deleted in the same transaction

#### Scenario: Non-invitee cannot remove a candidate
- **WHEN** a user not in `watch_event_invites` calls `DELETE /api/watch/events/:id/candidates/:candidateId`
- **THEN** the server returns 403

#### Scenario: Remove on completed event rejected
- **WHEN** any user calls `DELETE /api/watch/events/:id/candidates/:candidateId` and the event has `completed_at` set
- **THEN** the server returns 409

#### Scenario: Remove non-existent candidate returns 404
- **WHEN** an invitee calls `DELETE /api/watch/events/:id/candidates/:candidateId` for a candidate ID that does not exist
- **THEN** the server returns 404

### Requirement: Two-tap inline confirmation before removing a candidate
The UI SHALL require a two-tap confirmation before removing a candidate to prevent accidental deletion. The first tap SHALL transform the remove affordance in-place into a confirmation state showing a "Confirm" action and a "Cancel" action. The second tap on "Confirm" SHALL call the remove endpoint. Tapping "Cancel" SHALL restore the original remove affordance without making any API call.

#### Scenario: First tap enters confirmation state
- **WHEN** a participant taps the remove affordance on a candidate card
- **THEN** the affordance is replaced in-place with "Confirm" and "Cancel" controls; no other candidate cards are affected

#### Scenario: Confirm tap removes the candidate
- **WHEN** the participant taps "Confirm" in the confirmation state
- **THEN** `DELETE /api/watch/events/:id/candidates/:candidateId` is called and the candidate is removed from the list

#### Scenario: Cancel tap restores remove affordance
- **WHEN** the participant taps "Cancel" in the confirmation state
- **THEN** the card reverts to its normal state and no API call is made

#### Scenario: Remove affordance only shown on active events
- **WHEN** the event detail page is loaded for a completed event
- **THEN** no remove affordance is shown on any candidate card
