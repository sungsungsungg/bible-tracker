# 말씀길 · Bible Tracker

A personal Bible reading tracker with a Korean interface, built with React, Vite, and Express.

## Features

- Track completed chapters and your current reading position.
- View reading progress, streaks, and a monthly reading calendar.
- Write rich text notes with Bible verse references.
- Export and restore reading progress as JSON.
- Save notes and reading history locally through the Express server.

## Getting started

Use Node.js 24 and npm. A `.nvmrc` is included for nvm users.

```sh
nvm use
npm ci
npm run dev
```

Open http://localhost:5173. No environment variables or database setup are required.
New installations begin at Genesis 1 with empty notes and reading history.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Vite development middleware |
| `npm test` | Run the test suite |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Serve the built frontend and API through Express |
| `npm run preview` | Preview the frontend build only; does not provide the API |

To run a production build locally:

```sh
npm run build
npm start
```

The server listens on `127.0.0.1` and uses port `5173` by default. Override the
port with `PORT=3000 npm start`. Environment variables must be supplied by your
shell or runtime; the server does not automatically load `.env` files.

## Data and backups

- `data/books.json` contains the Bible book reference data and is versioned.
- `data/progress.json` and `data/notes.json` are created when data is saved.
  They are excluded from Git to keep personal records out of the repository.
- The in-app backup exports reading progress only. To back up notes as well,
  stop the server and copy both personal JSON files somewhere safe.

The app uses one shared set of local files and has no user authentication.
It is intended for personal use on your machine. GitHub Pages alone cannot run
the Express API; hosting requires a Node.js server with persistent writable storage.

## Project structure

```text
data/books.json   Bible book metadata
src/components/  Reading, calendar, notes, and backup UI
src/hooks/       Routing, persistence, and backup logic
src/utils/       Reading calculations and verse references
src/__tests__/   Automated tests
server.js        API, JSON persistence, and frontend serving
```

## Development checks

Run `npm test` and `npm run build` before submitting changes. GitHub Actions
runs both checks for pushes and pull requests.
