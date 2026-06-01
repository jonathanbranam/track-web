## Why

Trip members can check off shared packing items but have no way to add or remove their own personal (FYP) items through the app — they must rely on the trip owner to manage those via the API. The backend already supports member add/delete for personal items; this change surfaces that capability in the UI.

## What Changes

- Members see a text input at the bottom of their FYP section to add a new personal item
- Personal items show a trash icon; tapping it reveals an inline confirmation row (Cancel / Delete)
- The trip owner gets the same add/delete controls scoped to their own FYP group only — other members' FYP groups remain read-only in the UI
- No section field is exposed; personal items are added without a section (flat FYP list)
- No edit/rename: members can add and delete, not update item text
- No backend changes required

## Capabilities

### New Capabilities

None — no new capabilities are introduced.

### Modified Capabilities

- `packing-items`: Members can now add and delete their own personal packing items through the UI. The owner's UI-based management of personal items is restricted to their own FYP group; editing other members' items requires the API.

## Impact

- `client-trips/src/api.ts` — add `createPackingItem(tripId, text)` and `deletePackingItem(tripId, itemId)` methods
- `client-trips/src/pages/PackingPage.tsx` — add inline add-item input to the FYP section; add trash icon + inline confirmation to personal `ItemRow` entries; scope controls to `item.userId === userId`
