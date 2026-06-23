**App**: all

## REMOVED Requirements

### Requirement: People tab in watch and food apps
Both the watch and food frontend apps SHALL include a **People** navigation tab that renders `PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, and `RedeemInviteCode` from `@repo/ui` in a single tabbed layout. The time app SHALL NOT include this tab.

#### Scenario: People tab accessible in watch and food apps
- **WHEN** the user navigates to `/people` in either the watch or food app
- **THEN** the People tab renders with connection management and group management sections

#### Scenario: Time app has no People tab
- **WHEN** the user uses the time app
- **THEN** no social navigation tab or social UI component is rendered

**Reason**: Social management is now consolidated at `me.branam.us`. Hosting `PeopleTab` in every content app was duplication with no UX benefit; the social graph is cross-app and belongs in a dedicated home.
**Migration**: Remove the People nav tab and `/people` route from `client-watch`. When `client-food` is built, omit the People tab from the start. Users who need social management navigate to `me.branam.us/people`.
