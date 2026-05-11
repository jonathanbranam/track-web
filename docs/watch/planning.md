## Watch App — Planned Future Work

- **Individual vote visibility on event page.** Provide a way to see each attendee's vote per candidate. The current design shows aggregate scores only. Any solution must scale to larger groups (5–10+ attendees) — a per-column badge layout breaks down at that size.

- **Watch lists.** Allow users to create named lists for tracking movies and shows they want to watch in the future. Distinct from personal ratings, which reflect preference; lists are organizational.

- **People on watch lists.** Allow adding people to a watch list as a signal that its content should be prioritized for those specific people at an event.

- **Revise event selection and completion flow.** The current flow for selecting a watch item and marking an event complete is too prominent in the UI and feels awkward. Needs a redesign.

- **Unified media search and add component.** Merge the concepts of adding a new movie/series and searching TMDB into a single shared component. The TMDB integration should be an implementation detail — users experience it as "find or add a title." Must include a fallback path to manually create a title for gaps in the TMDB catalog. This component should be reusable across: adding a suggestion to a watch event, adding a title to personal ratings, and building watch lists.

- **Revise People tab UI.** The People tab is out of sync with the visual design of the rest of the app and is not mobile-friendly. Needs a full UI pass.

- **Improve add-people-to-event UI.** The current interface for adding attendees to a watch event uses checkboxes, which are poorly suited to mobile. Replace with larger rows and an explicit Add button.

- **TV show watch tracking.** Support more accurate tracking of where a user is in a TV series — season, episode, and watch status per season.
