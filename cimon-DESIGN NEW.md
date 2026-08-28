## Overview

Industrial precision meets digital sophistication. The design exudes technical authority through its monochromatic palette and generous whitespace, creating a sense of reliability and professional competence. The overall tone is serious yet approachable, with a density that feels spacious and uncluttered.

The layout follows a max-width container system (1296px) with consistent 40px universal padding and 24px gutters. Grid systems use 24px gaps throughout. The design emphasizes horizontal navigation patterns and full-width hero sections with centered content alignment.

Uses a 4px base grid with scale: 1, 2, 3, 4, 6, 8, 10, 12.

## Colors

### Light Theme
- **Pure White** (#ffffff): Main background color, card backgrounds
- **Industrial Onyx** (#191919): Primary text color, navigation text
- **Pewter** (#999999): Secondary text, muted content
- **Light Gray** (#f2f2f2): Secondary background areas
- **Gunmetal Gray** (#333333): Gunmetal brand color, medium emphasis text
- **Accent Blue** (#0d3a5e): Links, interactive elements

### Dark Theme
- **Industrial Onyx** (#191919): Primary dark background
- **Gunmetal Gray** (#333333): Secondary dark background
- **Pure White** (#ffffff): Primary text on dark backgrounds
- **Aluminum** (#cccccc): Secondary text on dark backgrounds

### Brand Logo Usage
- **Primary Logo**: White wordmark designed for dark/onyx backgrounds (`Logo_CIMON_White.png`)
- The logo is treated as a dark-background-first asset, reinforcing the industrial aesthetic. Use on `#191919` or photographic hero backgrounds with sufficient contrast.

## Typography
- **Headline Font**: Exo 2 (Google Fonts, SIL OFL — 무료/상업이용 가능)
- **Body Font**: Helvetica Neue
- **Label Font**: Helvetica Neue

The typography system establishes clear hierarchy through weight and size relationships. Helvetica Neue serves as the primary workhorse font across weights from 400 to 700, while Exo 2 provides brand distinction for hero headlines with its contemporary geometric sans-serif character. Letter-spacing becomes increasingly negative as font sizes increase, creating optical balance. The system uses generous line-heights (1.2-1.5x) for readability, with button text featuring extreme letter-spacing (3.5px) for emphasis.

### Font Loading
```css
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
```

Preload recommended for hero headline weight to avoid FOUT:
```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="https://fonts.gstatic.com/s/exo2/[hash]/exo2-700.woff2">
```

### Font Stack (Fallback Chain)
```css
/* Headlines */
font-family: 'Exo 2', 'Helvetica Neue', Arial, sans-serif;

/* Body */
font-family: 'Helvetica Neue', Arial, sans-serif;
```

### Korean Pairing (cimon.co.kr)
When mixing Korean with the headline font, pair Exo 2 with **Pretendard** (geometric, OFL) for tonal consistency:
```css
font-family: 'Exo 2', 'Pretendard', 'Helvetica Neue', sans-serif;
```

### Self-hosting (권장 — 사내망/CDN 차단 대비)
Google Fonts CDN 의존을 피하려면 woff2 파일을 다운로드하여 로컬 서빙. 산업 환경/사내망 배포 시 필수.

### Eyebrow / Section Label Pattern
Section headers consistently use a small-caps eyebrow label above the main heading to establish category context.
- **Style**: Uppercase, tracked-out (letter-spacing approximately 2–3px), small size (12–14px), Pewter or Gunmetal Gray color
- **Examples observed**: `PRODUCT HIGHLIGHTS`, `CUSTOMERS`, `MARKETING EMAILS`, `Custom Solution`
- **Pairing**: Always followed by a larger H2 in Industrial Onyx (e.g., "Smart, reliable industrial automation solutions.")

## Elevation

Depth is conveyed primarily through subtle white shadows (rgba(255, 255, 255, 0.1) 0px 2px 15px 1px) rather than traditional dark shadows, creating a soft, elevated feel. The design maintains a relatively flat aesthetic with minimal layering, relying on contrast and spacing for hierarchy.

## Responsive Behavior

### Breakpoints (Inferred)
- **Desktop**: ≥ 1024px — Full horizontal navigation with inline category links
- **Tablet / Mobile**: < 1024px — Collapsed to hamburger menu (`menu-medium-dark.svg`)

### Mobile Patterns
- Hamburger icon replaces full navigation
- Utility icons (search, language, profile) remain accessible
- Hero section retains centered alignment, scales down typography
- Multi-column footer collapses to stacked single-column layout

## Components

### Navigation Bar
Horizontal navigation with three distinct zones:
- **Left**: CIMON logo (white wordmark)
- **Center**: Primary categories with mega-menu dropdowns
- **Right**: Utility cluster — search, language switcher (EN/KO), user profile, Log In / Sign Up

### Mega Menu (Dropdown Navigation)
Category hover/click reveals a multi-section dropdown panel containing grouped product links.
- **Categories**: HMI, IPC, Monitor, PLC, SCADA, Software, Resources, Articles, Support, About
- **Structure**: Each category dropdown contains 1–5 product/page links
- **Example (HMI)**: eXT2 Series, nXT Series
- **Example (Software)**: Canvas, CICON, UltimateAccess, UltimateAccess Web, XpanelDesigner

### Service Notice Banner
Top-of-page informational banner for service announcements.
- **Layout**: Info icon (ℹ) + bold label + descriptive text + inline action link
- **Example**: "Service update: Existing account holders need to reset their password before signing in for the first time. [Reset password]"
- **Tone**: Neutral, non-intrusive — uses monochromatic styling rather than alert colors

### Hero Section
Full-width hero with background image overlay, large headline, and descriptive text.
- **Heading hierarchy**: Brand name (CIMON) + tagline H1 ("Automate Smarter.")
- **Supporting copy**: Single-sentence positioning statement below the tagline
- **Background**: Dark photographic imagery with overlay to ensure text contrast

### Product Highlight Cards
Repeated card pattern used in the "PRODUCT HIGHLIGHTS" section for featuring product lines.
- **Structure** (top to bottom):
  1. Short tagline (lead-in copy, e.g., "Introducing our HMIs.")
  2. Product name as H3 (e.g., "eXT2 Series")
  3. Descriptive paragraph (1–3 sentences highlighting certifications and key specs)
  4. "Learn More" CTA link
- **Observed instances**: eXT2 Series (HMI), NB Series (IPC), UltimateAccess Web (SCADA), PLC-S Plus (PLC)
- **Spacing**: Generous vertical whitespace between cards, consistent with the 4px grid scale

### Customer Logo Section
Logo wall pattern under the "CUSTOMERS" eyebrow with H2 "Trusted by leading companies across the globe."
- Uses async loading (displays "Loading..." placeholder), implying a horizontal scrolling or grid-based logo carousel.

### Newsletter Signup
Marketing email opt-in placed near the footer.
- **Eyebrow**: "MARKETING EMAILS"
- **Headline**: "Sign up to enjoy early access to new releases and special offers."
- **CTA**: "Sign me up" button

### Footer
Multi-column footer with structured link groups.
- **Columns**: HMI / IPC / Monitor / PLC / SCADA / Software / Resources / Support / About CIMON
- **Top section**: CIMON logo (white) + "Follow Us" social icon cluster (LinkedIn, YouTube)
- **Bottom row**: Copyright (`CIMON © 2026`), Terms of Service, Privacy Policy, Cookie Preferences
- **Background**: Dark (Industrial Onyx) — inverts the page's light theme

### Social Icons
- **Platforms**: LinkedIn, YouTube
- **Style**: Monochromatic, inline within "Follow Us" cluster
- **Placement**: Footer only — no floating/sticky social rails

### Language Switcher
- **Trigger**: Globe icon (`language-medium-dark.svg`)
- **Options**: English (`cimon.com`) / 한국어 (`cimon.co.kr`) — domain-based routing rather than path-based

### Cookie Preferences Panel
Granular consent panel rather than a simple accept/reject banner.
- **Categories**:
  - **Essential Cookies** — Always On (non-toggleable, required for auth/navigation/security)
  - **Analytics Cookies** — Off by default (Google Analytics, HubSpot)
- **Actions**: "Essentials Only" and "Accept All" buttons
- **Position**: Bottom-left, rounded corners, preserves the monochromatic aesthetic
- **Tone**: Transparent — explicitly states "no data is sold to third parties"

### Empty / Loading States
- **Empty state**: Plain text fallback (e.g., "No events found!" with an "All Events" link to redirect users)
- **Loading state**: Simple "Loading..." text placeholder for async-rendered sections (customer logos, etc.)
- Avoids skeleton screens or spinners, consistent with the minimal aesthetic

### Iconography
- **Format**: SVG, served from `/svgs/` path
- **Style**: Monochromatic, medium-dark stroke (e.g., `search-medium-dark.svg`, `language-medium-dark.svg`, `user-profile-medium-dark.svg`, `menu-medium-dark.svg`)
- **Naming convention**: `{purpose}-{weight}-{tone}.svg`

## Page Structure (Homepage Reference)
Standard vertical flow observed on the homepage:
1. Service Notice Banner (conditional)
2. Top Navigation Bar
3. Hero Section
4. Product Highlights (4-card sequence)
5. Custom Solution callout
6. Customer logo wall
7. Newsletter signup
8. Social follow block
9. Multi-column Footer
10. Cookie Preferences (overlay, bottom-left)

## Do's and Don'ts
- Do maintain the monochromatic palette as the foundation of the design system
- Don't introduce bright colors that compete with the industrial aesthetic
- Do use generous whitespace to create breathing room and hierarchy
- Don't overcrowd layouts - embrace the spacious, technical feel
- Do apply consistent letter-spacing patterns across typography scales
- Don't mix serif fonts with the clean, technical Helvetica Neue / Exo 2 system
- Do reserve Exo 2 for hero headlines and brand-defining display moments only; use Helvetica Neue for all body, UI, and label text
- Don't apply Exo 2 to body paragraphs or small UI text — its geometric character reduces readability at small sizes
- Do use subtle shadows sparingly to create gentle elevation
- Don't rely on heavy drop shadows that conflict with the minimal aesthetic
- Do use uppercase tracked-out eyebrow labels to introduce section context
- Don't skip the eyebrow → H2 pairing in major content sections
- Do place the CIMON logo on dark backgrounds (the white wordmark is the canonical asset)
- Don't place the white logo on light backgrounds without a dark container
- Do use plain text empty/loading states ("No events found!", "Loading...") to match the minimal aesthetic
- Don't introduce skeleton loaders or animated spinners that conflict with the static, industrial feel
- Do offer granular cookie consent (Essential / Analytics toggles) with transparent labeling
- Don't use dark-pattern consent UI or pre-checked optional cookies
