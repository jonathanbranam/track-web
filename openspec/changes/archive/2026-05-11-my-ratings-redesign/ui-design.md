## UI Design Decisions

### Events Page — Suggestions List

Candidates are sorted by the sum of personal ratings across all Yes and Maybe attendees (No RSVPs excluded). Candidates with no ratings from any attendee sort to the bottom. This ordering is computed server-side and requires no user action — the list reflects group preference automatically as personal ratings are added or updated.

---

### Events Page — "Add From My Ratings" Panel

The event detail page gains an expandable panel at the bottom of the Suggestions section, toggled by a text link ("▼ Add From My Ratings" / "▲ Hide"). The panel renders a vertically compressed list — each row is a single line showing a type badge (M / TV), title, personal rating badge, and an Add button. The compact format is intentional: this is a quick picker, not a browsing surface, so visual density is preferred over the card layout used for candidates. Rows that have already been added to the event are omitted from the list (the panel only shows items not currently in the event). The Add button shows a transient checkmark for ~2 seconds after tapping to confirm the action without dismissing the panel.

Personal ratings are shown in this panel to inform the decision to add — a title with no rating or a negative rating is still addable, but the rating badge surfaces the preference at a glance.

---

### Ratings Page

#### Filter Bar — Movie/TV Toggle Pills

Two pill-style toggle buttons (Movies, TV) control content type visibility. Both are active by default. They are not mutually exclusive — either, both, or neither can be active. The pills use a filled violet style when active and a muted border style when inactive. This pattern was chosen over a segmented control because the segmented control implies mutually exclusive selection, while the goal here is independent filtering.

#### Filter Bar — Seen Toggle Pill

A separate "Seen" pill on the right side of the filter row controls whether items the user has marked as seen (and not flagged for again or currently watching) are included. It is off by default to keep the default view focused on unwatched content. The pill label includes a count of hidden seen items in parentheses when it is off, so the user knows something is being filtered.

Seen-but-again and currently-watching items are always included regardless of this toggle, since those represent active interest.

#### Rating Button on Each Card

Each card shows a compact rating button (fixed width, ~40×28px) in the top-right corner displaying the current rating label (--  −  0  +  ++) using a color-coded highlight: red tones for negative, gray for neutral, green/lime for positive. Items with no rating show a "?" in muted gray. The color coding is consistent with the rating scale used in the event voting UI.

This means a single tap is the entry point to rating, keeping the card compact in the default state.

#### Inline Rating Expansion

Tapping the rating button expands that card in-place to show a full horizontal
row of five rating buttons (−− − 0 + ++), the same layout used for voting in
event detail. The selected value is highlighted with its corresponding color. An
✕ button dismisses the expanded state without making a change. Only one card can
be in expanded state at a time. Tapping a different card's rating button would
close the open one.

This design avoids a modal or bottom sheet for rating. The inline expansion keeps the user in context on the list and makes it easy to rate multiple items in sequence by scrolling.

#### Add-to Dropdown Row

Above the card list, a row reads: "Add to [Event|List dropdown] [specific event or list dropdown]". The first dropdown selects the target type (Event or List). The second dropdown is contextual — when Event is selected it shows upcoming events with a count of current shows; when List is selected it shows the user's named lists with a count of current shows.

The count label in the second dropdown uses "shows" to be consistent with the entertainment domain.

This row is the primary affordance for organizing content. It persists at the top of the filter bar rather than appearing per-card, so the user sets the target once and then acts on multiple items without re-selecting.

When Event is selected and there are no upcoming events, the second dropdown is replaced with italic placeholder text ("No upcoming events") rather than an empty dropdown.

#### Per-Card Toggle Pill for the Selected Target

Each card shows a small pill button below the title row indicating whether that item is currently in the selected event or list. The pill uses a filled dot (●) and violet text when the item is included, and an open dot (○) with gray text when it is not. Tapping toggles membership.

The pill label is the name of the selected event or list (not "Add" / "Remove") so the user can see at a glance what they are toggling into. This pattern was chosen over a standalone "Add" button because the toggle state is always visible — you never have to tap to find out if something is already included.

The toggle pill only appears when a valid target is selected (i.e., Event mode with at least one upcoming event, or List mode). It is hidden when no target applies.
