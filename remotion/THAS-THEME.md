# THAS Video Theme Reference

## Color Palette

| Name       | Hex       | Usage                                      |
|------------|-----------|--------------------------------------------|
| Background | `#050d1a` | Canvas background (very dark navy)         |
| Blue       | `#1F6FB2` | Primary brand blue (headlines, accents)    |
| Blue Light | `#4da6e8` | Secondary blue (icon fills, glow effects)  |
| Gray       | `#A6A8AB` | Brand gray (body text, subtitles)          |
| White      | `#FFFFFF` | High-contrast text, overlays               |
| Card       | `#0b1929` | Dark card / panel background               |

## Typography

| Role      | Size  | Weight | Color     |
|-----------|-------|--------|-----------|
| Headline  | 72px  | 800    | `#FFFFFF` |
| Body      | 40px  | 400    | `#A6A8AB` |
| Label     | 30px  | 600    | `#4da6e8` |
| Fine text | 28px  | 400    | `#A6A8AB` |

Font family: system-ui, sans-serif

## Canvas

- **Dimensions**: 1080 x 1920 (portrait, 9:16)
- **Frame rate**: 30 fps
- **Safe zones**: 150px top, 170px bottom, 60px left/right

## Animation Style

- Spring config: `{ damping: 200, stiffness: 100, mass: 1 }` — overdamped, no bounce
- Stagger between elements: 10-14 frames
- Fade-in / fade-out: 12 frames at scene boundaries
- Easing for wipes: `Easing.out(Easing.cubic)`

## Rules

- No em dashes anywhere in text
- All text must stay within the safe zones above
- Animations must not overlap or collide with each other
