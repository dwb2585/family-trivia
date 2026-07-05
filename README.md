# Family Trivia Night

A multiplayer trivia game for the dinner table. Everyone enters facts about themselves, the app generates "How well do you know your family?" questions, and the whole family plays together on their own phones in real time.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (Postgres + Realtime subscriptions)
- **Hosting**: Vercel (planned)

## Quick start

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL editor, run the migration in `supabase/migrations/0001_initial_schema.sql`
3. Copy your project URL and `anon` key from Project Settings → API

### 2. Configure env

```bash
cd web
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

### 3. Run locally

```bash
cd web
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173 — host a game from one device, share the 4-letter code, and have everyone join from their phones.

## How to play

1. **Host creates a game** → gets a 4-letter room code
2. **Everyone joins** at the app URL, enters the code + their name
3. **Each player fills in their facts** — favorite movie, dream vacation, hidden talent, etc.
4. **Host hits Start** — questions are auto-generated from everyone's facts
5. **Real-time play** — each question appears on everyone's phone simultaneously
6. **Host reveals** the correct answer after everyone has picked
7. **Next question** → repeat until done
8. **Final standings** — winner gets the trophy 🏆

## Deploying

```bash
cd web
vercel              # first deploy
vercel --prod       # promote to production
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard.

## Project layout

```
family-trivia/
├── web/                       # Vite + React frontend
│   ├── src/
│   │   ├── App.tsx            # State machine + realtime orchestration
│   │   ├── components/
│   │   │   ├── ui/            # Buttons, Cards, Inputs
│   │   │   └── screens/       # Home, Lobby, GamePlay, Final
│   │   └── lib/
│   │       ├── supabase.ts    # Client + types
│   │       ├── gameLogic.ts   # Question generation + scoring
│   │       └── facts.ts       # Default fact prompts
│   └── .env.example
└── supabase/
    └── migrations/
        └── 0001_initial_schema.sql
```