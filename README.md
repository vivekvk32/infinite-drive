# Arc Drive

Arc Drive is a browser-based 3D endless driving game built with HTML, CSS, JavaScript, and Three.js.

You steer through an endless arcade-style road, avoid obstacles, collect floating coins and diamonds, pause and resume the run, and save your score to a local SQLite-backed leaderboard with your driver name.

## Features

- 3D endless road and arcade driving camera
- Obstacles including cones, barriers, and crates
- Floating collectibles for extra points
- Pause and resume support
- Driver-name score saving
- Persistent leaderboard and longest-distance tracking
- Local launcher files for easy play on Windows

## Project Files

- `index.html`: page structure and HUD layout
- `styles.css`: game UI, overlay, and leaderboard styling
- `main.js`: Three.js scene, game loop, controls, pickups, pause flow, and leaderboard client logic
- `server.js`: local HTTP server and score API with SQLite storage
- `launch-game.ps1`: starts the server if needed and opens the game in the browser
- `Play Arc Drive.cmd`: double-click launcher for Windows

## Requirements

- Node.js 22 or newer
- Windows PowerShell for the launcher script

## Run Locally

1. Open a terminal in this folder.
2. Start the local server:

```powershell
npm run dev
```

3. Open:

```text
http://127.0.0.1:4173
```

## Quick Launch

You can also launch the game directly from the project folder by double-clicking:

- `Play Arc Drive.cmd`

That script runs `launch-game.ps1`, which:

- checks whether the local server is already running
- starts it if needed
- opens the game in your default browser

## Controls

- `A` / `Left Arrow`: steer left
- `D` / `Right Arrow`: steer right
- `P` or `Esc`: pause or resume
- `Space`: start or resume a run

## Leaderboard and Database

Scores are stored by the local server in a SQLite database under:

- `data/arc-drive.db`

The backend exposes:

- `GET /api/leaderboard`: returns the top score, longest run, and top leaderboard entries
- `POST /api/runs`: saves a run with `driverName`, `score`, and `distance`

## Notes

- The SQLite integration uses Node's built-in `node:sqlite` module.
- The database file and Windows shortcut files are ignored by Git.
- This project is intended to run locally as a lightweight arcade game.
