**App**: client-watch

## REMOVED Requirements

### Requirement: Event vote seeds watchlist rating
**Reason**: Real-time vote-to-rating seeding conflates "what I voted in tonight's specific context" with "my general preference." This behavior is replaced by personal-rating-to-vote seeding at candidate-add time and event-vote-to-personal-rating backfill at event completion.
**Migration**: Ratings already set by the old seeding path are preserved in the database. Future voting will no longer create or update personal ratings in real time. Previously unrated items may receive a personal rating after event completion via the new backfill behavior.

## ADDED Requirements

### Requirement: Personal rating seeds invitee vote at candidate-add time
When a candidate is added to a watch event the system SHALL read each invitee's personal rating for that item and upsert a vote for any invitee who has a non-null rating. This seeding is a one-time copy — later changes to an invitee's personal rating SHALL NOT propagate to their existing event vote.

#### Scenario: Invitee with personal rating receives seeded vote
- **WHEN** a candidate is added to a watch event and an invitee has a non-null personal rating for that item
- **THEN** a `watch_event_votes` row is created or updated for that invitee with the personal rating value as the vote

#### Scenario: Invitee with no personal rating receives no seeded vote
- **WHEN** a candidate is added to a watch event and an invitee has a NULL personal rating for that item
- **THEN** no `watch_event_votes` row is created for that invitee from the seeding step

#### Scenario: Subsequent personal rating change does not update event vote
- **WHEN** an invitee updates their personal rating for an item after it was added to an event
- **THEN** the existing `watch_event_votes` row for that candidate is unchanged

### Requirement: Event completion backfills personal ratings for unrated items
When an event is marked complete the system SHALL copy each invitee's event vote to their personal rating for the selected item, but only for invitees whose personal rating for that item is currently NULL.

#### Scenario: Completion writes vote to personal rating when rating is null
- **WHEN** an event is marked complete and an invitee has a non-null vote for the selected candidate and a NULL personal rating for that item
- **THEN** the invitee's personal rating is set to their vote value

#### Scenario: Completion does not overwrite existing personal rating
- **WHEN** an event is marked complete and an invitee already has a non-null personal rating for the selected item
- **THEN** the invitee's personal rating is unchanged

#### Scenario: Invitee with no vote gets no backfill
- **WHEN** an event is marked complete and an invitee has not voted on the selected candidate
- **THEN** no personal rating change is made for that invitee

### Requirement: Admin CLI for vote seeding and rating backfill
The system SHALL expose admin CLI commands for manual invocation of seeding and backfill operations:
- `watch seed-votes <eventId> <candidateId>` — manually triggers personal-rating-to-vote seeding for all invitees of a candidate; supports `--json`
- `watch backfill-ratings <eventId>` — manually triggers post-completion rating backfill for an event; supports `--json`

#### Scenario: CLI seeds votes for a candidate
- **WHEN** `watch seed-votes <eventId> <candidateId>` is run
- **THEN** votes are upserted for all invitees who have a personal rating for the candidate, following the same rules as the automated add-time seeding

#### Scenario: CLI backfills ratings for an event
- **WHEN** `watch backfill-ratings <eventId>` is run
- **THEN** personal ratings are set for all invitees with a vote but no existing rating for the selected candidate, following the same rules as the automated post-completion backfill
