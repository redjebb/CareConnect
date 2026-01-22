# CareConnect

Monorepo containing the CareConnect web (Vite + React + Tailwind CSS) and mobile (Expo + React Native) apps, both using TypeScript. Dependencies are managed with npm workspaces; install once at the repo root to link both packages.

## Structure

- web — Vite + React + Tailwind CSS app
- mobile — Expo + React Native app

## Getting started

1. Install dependencies once from the repo root:
   `ash
   npm install
   `
2. Run the web app:
   `ash
   npm run dev:web
   `
3. Run the mobile app:
   `ash
   npm run dev:mobile
   `

## Next steps

- Add any shared packages under new workspace folders.
- Configure CI/CD and linting as needed.
