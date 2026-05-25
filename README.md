# BlinkAI Agent

BlinkAI is a compact AI agent chat interface built with React, TypeScript, Vite, LangChain, and Gemini 2.5 Flash. The app opens from a pixel flower launch screen, shows a short loading spinner, then presents a minimal dark chat interface backed by a local LangChain agent server.

## Features

- Pixel flower launch screen with `blinkAI` branding
- Compact dark chat UI
- Loading spinner before opening chat
- Gemini 2.5 Flash responses through LangChain
- Server-side API key usage
- Local tool-using agent backend
- Vite dev proxy from the frontend to the agent server

## Agent Tools

The LangChain agent currently includes:

- `calculator`: evaluates basic arithmetic expressions
- `current_datetime`: returns the current date and time
- `make_brief_plan`: creates short practical plans for tasks or goals
- `text_stats`: counts words, characters, and lines
- `wikipedia_lookup`: searches Wikipedia and returns a short summary with a source URL

## Tech Stack

- React 19
- TypeScript
- Vite
- LangChain JS
- Gemini 2.5 Flash
- Express
- Wikipedia API

## Setup

Install dependencies:

```powershell
npm.cmd install
```

Create a local `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
AGENT_PORT=8787
```

The `.env` file is ignored by Git. Do not commit real API keys.

## Run Locally

Start the LangChain agent server:

```powershell
npm.cmd run agent
```

In a second terminal, start the Vite app:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Scripts

```powershell
npm.cmd run dev      # Start frontend
npm.cmd run agent    # Start LangChain agent backend
npm.cmd run build    # Type-check and build production files
npm.cmd run lint     # Run ESLint
npm.cmd run preview  # Preview production build
```

## API

The frontend sends chat requests to:

```text
POST /api/chat
```

During development, Vite proxies `/api` requests to:

```text
http://127.0.0.1:8787
```

Health check:

```text
GET /api/health
```

## Notes

This app keeps Gemini calls on the local backend so the API key is not exposed through Vite client-side environment variables. For production deployment, host the Express agent server securely and set `GEMINI_API_KEY` in the server environment.
