# Octavia Piano

An interactive web application featuring a piano rhythm game and sheet music viewer with automatic fingering calculation based on ergonomic modeling (Parncutt et al.).

> **Note:** This project was built using AI, so please pardon any bugs or imperfections!

---

## 🚀 Getting Started Locally

### Prerequisites

Make sure you have installed:

* **Node.js** (v18 or higher recommended) & **npm**

---

### Step 1: Install Dependencies

Open your terminal in the project root directory, then run:

```bash
npm install

```

---

### Step 2: Run the Application

Start the development server:

```bash
npm run dev

```

Once running, open your browser and navigate to:
👉 **[http://localhost:727](http://localhost:727)** or **[http://127.0.0.1:727](http://127.0.0.1:727)**

---

## 🛠️ Available Scripts

* `npm run dev` : Runs the Vite frontend development server.
* `npm run build` : Creates the production build bundle in the `dist` directory.
* `npm run preview` : Runs a local preview of the production build.
* `npm run lint` : Performs TypeScript type checks (`tsc --noEmit`).

---

## 📂 Project Structure Overview

* `App.tsx` : Main application component for Octavia Piano.
* `fingering.ts` / `fingeringEngine.ts` : Automatic piano fingering. One dynamic-programming pass per hand over chords and melody together, with ergonomic span costs (after Parncutt et al.). Pure TypeScript, no ML model.
* `pianoNoteDetector.ts` : Fast polyphonic microphone note detection (FFT + harmonic matching, score-informed, with removal of the app's own sound). Pure TypeScript.
* `AcousticPianoService.ts` : Microphone wrapper. Notes the song asks for pass immediately; other notes wait (max 500 ms) for a second opinion from the AI verifier. If the AI is unavailable, everything passes immediately.
* `basicPitchModel.ts` / `basicPitchVerifier.ts` : Optional on-device note verifier using Spotify's Basic Pitch model (`public/models/basic-pitch/`, Apache-2.0, ~0.9 MB). Loaded lazily with TensorFlow.js (WebGL only), saved to the browser's IndexedDB after the first download, and skipped automatically on devices where it is too slow. It can only confirm notes, never create them.
* `components/` : UI components (Piano keyboard, Sheet Music Viewer, Settings, etc.).
* `vite.config.ts` : Vite configuration.
