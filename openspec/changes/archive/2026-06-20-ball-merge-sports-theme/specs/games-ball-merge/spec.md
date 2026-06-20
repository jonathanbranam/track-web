**App**: games

## MODIFIED Requirements

### Requirement: Drop a randomly-sized ball from the top
The game SHALL present a drop position at the open top that the player can move horizontally across the container's width, and a control to release the held ball. Each held ball SHALL have a size drawn at random from the 5 smallest sizes in the range (indices 0–4 inclusive), so that the 6 larger balls are produced only through merging. After a ball is released, the next ball SHALL be readied at the drop position.

#### Scenario: Player aims and drops
- **WHEN** the player moves the drop position and releases the ball
- **THEN** the ball falls from that horizontal position under gravity into the container

#### Scenario: Next ball is readied
- **WHEN** a held ball is released
- **THEN** a new randomly-sized ball is readied at the drop position for the next drop

#### Scenario: Spawn sizes are limited to the 5 smallest balls
- **WHEN** a new ball is readied
- **THEN** its size index is between 0 and 4 inclusive (Ping Pong through Softball); sizes 5–10 are never spawned directly

## ADDED Requirements

### Requirement: Sports-themed ball identity and visual markings
The game SHALL define exactly 11 ball sizes, each representing a named sports ball ordered from smallest to largest by real-world size: Ping Pong (0), Golf Ball (1), Tennis (2), Baseball (3), Softball (4), Volleyball (5), Soccer (6), Basketball (7), Football (8), Beach Ball (9), Yoga Ball (10). Each ball SHALL be rendered with a sport-accurate visual identity using programmatically drawn markings (no external sprite assets required):

- **Ping Pong**: solid orange circle, shine highlight only
- **Golf Ball**: white circle with ~18 small filled dimple dots in two rings
- **Tennis**: yellow-green circle with one white S-curve seam line
- **Baseball**: cream circle with two red curved arc paths and perpendicular tick marks (stitching)
- **Softball**: bright yellow circle with two blue curved arc paths and tick marks (stitching)
- **Volleyball**: sky-blue circle with three curved white seam lines suggesting six-panel construction
- **Soccer**: charcoal circle with five white outlined pentagon shapes (one center, four surrounding)
- **Basketball**: deep-orange circle with three black curved seam lines (one vertical, two lateral)
- **Football**: dark-brown ellipse (landscape orientation, ~168×100 game units) with a white horizontal center seam and four white lace crossbars
- **Beach Ball**: coral base with six alternating-color arc wedges
- **Yoga Ball**: periwinkle circle, shine highlight only

The Football (size 8) SHALL use an elliptical physics body (implemented as a 16-point convex polygon via `Bodies.fromVertices`) so that collision behavior matches the oblong visual shape. All other balls SHALL use circular physics bodies.

Point values for merging SHALL follow a triangular-number progression: 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66 for sizes 0–10 respectively.

#### Scenario: Ball visual matches sport identity
- **WHEN** a ball of a given size is rendered in the container or at the drop position
- **THEN** it displays the color and programmatic markings defined for its sport type (e.g. a Baseball appears cream with red stitching, a Soccer ball appears charcoal with white pentagons)

#### Scenario: Football physics is elliptical
- **WHEN** the Football (size 8) collides with a wall or another ball
- **THEN** the collision geometry reflects the oblong shape — the ball catches on the narrow ends differently than a circle of the same nominal size would

#### Scenario: Football tumbles on rotation
- **WHEN** the Football (size 8) is in play and rolls or bounces
- **THEN** the ellipse texture rotates with the physics body, visually showing the ball tumbling end-over-end

#### Scenario: Yoga Ball is the maximum size
- **WHEN** two Yoga Balls (size 10) collide
- **THEN** they do not merge and remain as separate balls

#### Scenario: Merging produces correct points
- **WHEN** two balls of size `n` merge
- **THEN** the score increases by the triangular number for size `n` (e.g. merging two Baseballs awards 6 points; merging two Volleyballs awards 21 points)
