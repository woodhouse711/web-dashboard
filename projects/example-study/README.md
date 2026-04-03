# Color Field Study

An interactive gradient field that responds to cursor movement.

## How it works

A radial gradient emanates from the cursor position, blending between two complementary hues from the active palette. The color relationship shifts as you move across the canvas.

## Controls

- **Move cursor** — shift the gradient focal point
- **Touch/drag** — works on mobile
- **Click** — cycle through color palettes (5 total)

## Technical notes

Built with a single `<canvas>` element and the 2D Canvas API. No dependencies. The smooth follow is a simple lerp applied each frame.
