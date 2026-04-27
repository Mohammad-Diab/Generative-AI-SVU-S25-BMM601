# SINGULARITY / التوليدي

This project is a **single-page interactive web experience** about **generative AI**. It is built as a static frontend app using plain **HTML, CSS, and JavaScript**, with no build step and no framework.

The page is designed in **Arabic** with `dir="rtl"` and presents generative AI as an immersive visual installation. Instead of being a CRUD app or dashboard, this app behaves more like a **digital exhibition / showcase page** with animated sections, audio effects, simulated generation, and storytelling.

## What This App Is

The app is an interactive presentation called **"التوليدي"** under the **SINGULARITY** theme. It explains and demonstrates generative AI through motion, sound, and user interaction.

When the page opens, the user sees:

- A cinematic intro screen
- A shader-based animated background
- A custom glowing cursor
- Scroll-driven content sections
- Interactive demos for prompt generation, microphone input, AI timeline, and model showcase

This makes it suitable for:

- University or class presentations
- Multimedia project showcases
- Interactive storytelling about AI
- Exhibition-style landing pages

## What It Includes

### 1. Intro / Cold Open

The page starts with a dramatic intro sequence that includes:

- Whispered text effect
- Fake terminal flood animation
- Title reveal
- Optional speech synthesis greeting

This gives the site a strong "AI booting up" feeling.

### 2. Animated Shader Background

The background is rendered with a WebGL shader and reacts to:

- Mouse position
- Scroll progress
- Breathing/microphone state
- Active section

If WebGL is not available, the page falls back to a CSS gradient background.

### 3. Custom Cursor Experience

The app replaces the normal cursor on larger screens with:

- A glowing cursor dot
- Particle trails
- Arabic letter glyph effects
- Click ripple animations

### 4. Seven Main Interactive Sections

The app is divided into seven sections ("islands"):

1. `السحابة` (The Cloud)
Shows the idea of latent space and updates HUD values based on mouse movement.

2. `النَفَس` (The Breath)
Uses the microphone to create a reactive breathing visualization. It also includes a mock mode if mic input is not used.

3. `المِصهَر` (The Forge)
Lets the user type a prompt, simulates an inference log, generates a deterministic abstract image on a canvas, and allows downloading the result as a PNG.

4. `النَسَب` (The Lineage)
Displays a timeline/wormhole journey through major generative AI milestones from **2014 to 2026**.

5. `المَرسَم` (The Atelier)
Shows an interactive 3D rotating carousel of AI tools/models with live mini demos.

6. `المِرآة` (The Mirror)
Presents benefits vs challenges of generative AI with draggable animated text items.

7. `الجَوقة` (The Chorus)
Displays team/member credits in a stylized animated reel.

### 5. AI Tools Referenced in the Showcase

The model carousel currently includes these showcased tools:

- DALL·E 3
- Sora
- ElevenLabs
- Midjourney
- Stable Diffusion
- GPT-4o
- Runway Gen-3
- Suno AI

These are presented as **visual demos and educational references**, not live API integrations.

### 6. Audio Features

The page includes audio-related features such as:

- Ambient synth pad toggle
- Intro sound effects
- Speech synthesis greeting in Arabic when supported
- Small audio motif playback in the carousel

### 7. Accessibility / Responsive Support

The app also includes:

- Responsive layout behavior for mobile screens
- Reduced-motion handling with `prefers-reduced-motion`
- Fallback behavior when advanced effects are unavailable
- Focus styles for keyboard users

## Project Structure

```text
website/
├── creative.html
├── css/
│   └── creative.css
├── js/
│   └── creative.js
├── images/
└── videos/
```

### Files

- `creative.html`
  The main page structure and section content.

- `css/creative.css`
  All styling, layout, animations, visual effects, responsive rules, and reduced-motion behavior.

- `js/creative.js`
  All interactivity and rendering logic, including the intro sequence, shader background, microphone handling, canvas generation, timeline animation, model carousel, mirror physics, and ambient audio.

- `images/`
  Present in the project, but currently appears unused/empty.

- `videos/`
  Present in the project, but currently appears unused/empty.

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas 2D
- WebGL
- Web Audio API
- Speech Synthesis API
- MediaDevices API (microphone access)
- Intersection Observer API

## How To Run

Because this is a static app, you can run it very simply:

1. Open `creative.html` in a browser.

Or use a local server for best browser compatibility:

1. Start any static server in the project folder.
2. Open the served page in your browser.

Examples:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/creative.html
```

## Browser Features Needed

For the full experience, the browser should support:

- WebGL
- Canvas
- AudioContext
- Speech synthesis
- `navigator.mediaDevices.getUserMedia`

If some of these are unavailable, the page still works with partial fallback behavior.

## Notes

- This is a **frontend-only experience**. There is no backend, database, authentication, or API integration in the current code.
- The "generation" section is a **simulation** based on prompt hashing and canvas drawing, not a real AI model call.
- The page content is primarily in **Arabic**, so it is intended for Arabic-speaking users or presentations.
- Credits in the last section still use placeholder names such as `الطالب ١`, `الطالب ٢`, etc., which can be replaced with real team member names.

## Good Use Cases For This Project

- Interactive course assignment
- AI awareness presentation
- Multimedia storytelling website
- Portfolio/demo piece for motion-heavy frontend work

## Possible Future Improvements

- Add real images/videos to the `images/` and `videos/` folders
- Replace placeholder student names with final credits
- Add a real AI backend or API-powered generation
- Add language switching between Arabic and English
- Split the large JavaScript file into modules for easier maintenance
- Add a small landing `index.html` that redirects to or embeds `creative.html`

## Summary

This app is a **creative Arabic interactive showcase for generative AI**, built as a visually rich single-page website. It includes animated storytelling, microphone-reactive visuals, simulated prompt generation, an AI history timeline, a rotating tool gallery, ethics/pros-cons interaction, and a credits reel.
