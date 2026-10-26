# CareConnect  
### Social Patronage & Logistics Platform

CareConnect is a modern **Progressive Web App (PWA)** designed to digitize and optimize *Home Social Patronage* services.  
It bridges the gap between administration and field drivers, ensuring real-time coordination and secure data management.

---

## 🚀 Quick Start

Follow these steps to run the project locally.

### 1️⃣ Prerequisites

Make sure you have installed:

- **Node.js** (v18 or higher)

You can verify your version with:

```bash
node -v
```

---

### 2️⃣ Installation

Open your terminal in the project directory and run:

```bash
npm install
```

---

### 3️⃣ Running in Development Mode

Start the local development server:

```bash
npm run dev
```

The application will be available at:

```
http://localhost:5173
```

---

### 4️⃣ Building for Production

Generate a production-ready build in the `dist` folder:

```bash
npm run build
```

---

### 5️⃣ Running Tests

Unit tests (routing, analytics, validation, offline logic):

```bash
npm test
```

Firestore security-rules tests (needs Java 21, runs the Firestore emulator):

```bash
npm run test:rules
```

---

## 🛠 Tech Stack

### Frontend
- React  
- Vite  
- TypeScript  

### Styling
- Tailwind CSS  

### Backend / Database
- Firebase (Firestore, Authentication, Hosting)

### Testing
- Vitest  

### Maps / GIS
- Leaflet.js  
- ArcGIS API  

### Notifications
- EmailJS  

---

## ✨ Key Features

- **Persistent access notes** – "3rd floor, door on the right" follows every visit and is kept up to date by drivers.
- **Route optimisation** – nearest-neighbour + 2-opt ordering from the driver's live position.
- **Offline-first PWA** – installable, works without signal, shows a sync queue.
- **Digital signatures & SOS** – Canvas signatures and instant e-mail alerts to the planning dispatcher.
- **Analytics** – deliveries per day, success rate, driver performance, top issues, missed visits.
- **Least-privilege security** – role profiles, token-based invitations, 25 emulator-tested Firestore rules.

Documentation for the jury is in [`docs/`](docs/) (Bulgarian): project documentation, test evidence, defence script. Security and deployment notes: [`docs/SECURITY-AND-DEPLOY.md`](docs/SECURITY-AND-DEPLOY.md).

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**.

```
Copyright (C) 2026 Adam Bikov & Redjeb Tudjar
```

---