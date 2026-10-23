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
👉 **[http://localhost:3000](http://localhost:3000)** or **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## 🛠️ Available Scripts

* `npm run dev` : Runs the Vite frontend development server.
* `npm run build` : Creates the production build bundle in the `dist` directory.
* `npm run preview` : Runs a local preview of the production build.
* `npm run lint` : Performs TypeScript type checks (`tsc --noEmit`).

---

## 📂 Project Structure Overview

* `App.tsx` : Main application component for Octavia Piano.
* `fingering.ts` : Ergonomic piano fingering algorithm (Parncutt model) implemented in pure TypeScript.
* `components/` : UI components (Piano keyboard, Sheet Music Viewer, Settings, etc.).
* `vite.config.ts` : Vite configuration.
