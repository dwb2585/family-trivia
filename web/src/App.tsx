import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Game, type Player, type Question, type Answer } from "@/lib/supabase";
import { uuid, randomCode } from "@/lib/utils";
import { DEFAULT_FACTS } from "@/lib/facts";
import { generateQuestions, scoreAnswer } from "@/lib/gameLogic";

import { Home } from "@/components/screens/Home";
import { CreateGame } from "@/components/screens/CreateGame";
import { JoinGame } from "@/components/screens/JoinGame";
import { Lobby } from "@/components/screens/Lobby";
import { GamePlay } from "@/components/screens/GamePlay";
import { Final } from "@/components/screens/Final";

type Phase = "home" | "create" | "join" | "lobby" | "playing" | "finished";

interface Session {
  clientId: string;
  gameId: string;
  playerId: string;
  hostToken: string | null;
}

const SESSION_KEY = "ft_session_v1";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientIdRef = useRef(session?.clientId || uuid());
  useEffect(() => {
    if (!session) {
      const s: Session = { clientId: clientIdRef.current, gameId: "", playerId: "", hostToken: null };
      // Don't save yet — we only save once the user actually joins/creates.
    }
  }, [session]);

  // ---- Realtime subscriptions (per-game) ----
  useEffect(() => {
    if (!session?.gameId) return;
    const gameId = session.gameId;

    const gamesChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const next = payload.new as Game;
          setGame(next);
          // Auto-advance phase based on game status
          if (next.status === "playing") setPhase((p) => (p === "lobby" || p === "playing" ? "playing" : p));
          if (next.status === "finished") setPhase("finished");
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as Player;
          if (payload.eventType === "DELETE") return;
          setPlayers((prev) => {
            const idx = prev.findIndex((p) => p.id === row.id);
            if (idx === -1) return [...prev, row];
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          });
          if (row.client_id === clientIdRef.current) setMe(row);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as Question;
          if (payload.eventType === "DELETE") return;
          setQuestions((prev) => {
            const idx = prev.findIndex((q) => q.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.question_index - b.question_index);
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const row = payload.new as Answer;
          if (payload.eventType === "DELETE") return;
          setAnswers((prev) => {
            const idx = prev.findIndex((a) => a.id === row.id);
            if (idx === -1) return [...prev, row];
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [session?.gameId]);

  // ---- Initial data fetch for the session ----
  useEffect(() => {
    if (!session?.gameId) return;
    let cancelled = false;

    (async () => {
      const [{ data: g }, { data: ps }, { data: qs }] = await Promise.all([
        supabase.from("games").select("*").eq("id", session.gameId).maybeSingle(),
        supabase.from("players").select("*").eq("game_id", session.gameId),
        supabase.from("questions").select("*").eq("game_id", session.gameId),
      ]);

      if (cancelled) return;

      if (!g) {
        // Game was deleted — clear session.
        saveSession(null);
        setSession(null);
        setPhase("home");
        return;
      }

      setGame(g);
      setPlayers((ps ?? []) as Player[]);
      setQuestions((qs ?? []) as Question[]);
      const meRow = (ps ?? []).find((p: Player) => p.client_id === clientIdRef.current);
      if (meRow) setMe(meRow as Player);

      // Restore fact values for me
      if (meRow) {
        const { data: fs } = await supabase
          .from("player_facts")
          .select("*")
          .eq("player_id", (meRow as Player).id);
        if (!cancelled && fs) {
          const map: Record<string, string> = {};
          for (const f of fs as { fact_key: string; fact_value: string }[]) {
            map[f.fact_key] = f.fact_value;
          }
          setFacts(map);
        }
        const { data: ans } = await supabase
          .from("answers")
          .select("*")
          .eq("game_id", session.gameId);
        if (!cancelled && ans) setAnswers(ans as Answer[]);
      }

      // Phase from status
      if (g.status === "lobby") setPhase("lobby");
      else if (g.status === "playing") setPhase("playing");
      else if (g.status === "finished") setPhase("finished");
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.gameId]);

  // ---- Actions ----

  const handleHost = useCallback(async (hostName: string) => {
    setError(null);
    const code = randomCode();
    const hostToken = uuid();

    const { data: g, error: gErr } = await supabase
      .from("games")
      .insert({ code, host_token: hostToken, status: "lobby" })
      .select()
      .single();
    if (gErr || !g) throw new Error(gErr?.message || "Could not create game");

    const { data: p, error: pErr } = await supabase
      .from("players")
      .insert({
        game_id: g.id,
        client_id: clientIdRef.current,
        name: hostName,
        is_host: true,
      })
      .select()
      .single();
    if (pErr || !p) throw new Error(pErr?.message || "Could not create host player");

    const newSession: Session = {
      clientId: clientIdRef.current,
      gameId: g.id,
      playerId: p.id,
      hostToken,
    };
    saveSession(newSession);
    setSession(newSession);
    setGame(g);
    setMe(p);
    setPlayers([p]);
    setPhase("lobby");
  }, []);

  const handleJoin = useCallback(async (code: string, name: string) => {
    setError(null);
    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (gErr || !g) throw new Error("Game not found");
    if (g.status !== "lobby") throw new Error("Game already started");

    // Check we're not already in this game (by client_id)
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", g.id)
      .eq("client_id", clientIdRef.current)
      .maybeSingle();

    let playerRow: Player;
    if (existing) {
      playerRow = existing as Player;
      // Update name in case they changed it
      const { data: updated } = await supabase
        .from("players")
        .update({ name })
        .eq("id", existing.id)
        .select()
        .single();
      playerRow = (updated as Player) ?? playerRow;
    } else {
      const { data: p, error: pErr } = await supabase
        .from("players")
        .insert({
          game_id: g.id,
          client_id: clientIdRef.current,
          name,
          is_host: false,
        })
        .select()
        .single();
      if (pErr || !p) throw new Error(pErr?.message || "Could not join game");
      playerRow = p as Player;
    }

    const newSession: Session = {
      clientId: clientIdRef.current,
      gameId: g.id,
      playerId: playerRow.id,
      hostToken: null,
    };
    saveSession(newSession);
    setSession(newSession);
    setGame(g);
    setMe(playerRow);
    setPhase("lobby");
  }, []);

  const handleFactChange = useCallback((key: string, value: string) => {
    setFacts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const persistFacts = useCallback(async (playerId: string, next: Record<string, string>) => {
    // Upsert each non-empty fact
    const rows = Object.entries(next)
      .filter(([, v]) => v.trim().length > 0)
      .map(([fact_key, fact_value]) => ({
        player_id: playerId,
        fact_key,
        fact_value: fact_value.trim(),
      }));

    if (rows.length === 0) return;

    const { error } = await supabase
      .from("player_facts")
      .upsert(rows, { onConflict: "player_id,fact_key" });
    if (error) throw new Error(error.message);
  }, []);

  const handleReady = useCallback(async () => {
    if (!me) return;
    await persistFacts(me.id, facts);
    const { error } = await supabase
      .from("players")
      .update({ ready: true })
      .eq("id", me.id);
    if (error) throw new Error(error.message);
  }, [me, facts, persistFacts]);

  const handleStart = useCallback(async () => {
    if (!game || !session?.hostToken) throw new Error("Only the host can start");

    // Persist host's facts too, in case they hit Start without clicking Ready.
    if (me) await persistFacts(me.id, facts);

    // Fetch all players + their facts for question generation.
    const [{ data: playersAll }, { data: playerIds }] = await Promise.all([
      supabase.from("players").select("*").eq("game_id", game.id),
      supabase.from("players").select("id").eq("game_id", game.id),
    ]);

    const ids = (playerIds ?? []).map((p: { id: string }) => p.id);
    const { data: factsAll } = await supabase
      .from("player_facts")
      .select("*")
      .in("player_id", ids);

    const generated = generateQuestions({
      gameId: game.id,
      players: (playersAll ?? []) as Player[],
      facts: (factsAll ?? []) as { id: string; player_id: string; fact_key: string; fact_value: string }[],
    });

    if (generated.length === 0) {
      throw new Error(
        "Not enough facts to generate questions. Make sure everyone entered at least one fact.",
      );
    }

    const { error: insErr } = await supabase.from("questions").insert(generated);
    if (insErr) throw new Error(insErr.message);

    const { error: gErr } = await supabase
      .from("games")
      .update({
        status: "playing",
        current_question: 0,
        show_results: false,
        total_questions: generated.length,
      })
      .eq("id", game.id)
      .eq("host_token", session.hostToken);
    if (gErr) throw new Error(gErr.message);
  }, [game, session?.hostToken, me, facts, persistFacts]);

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (!game || !me) return;
      const currentQ = questions.find((q) => q.question_index === game.current_question);
      if (!currentQ) return;

      // Compute score: 100 if correct, 50 bonus if first correct, speed bonus.
      const isCorrect = optionIndex === currentQ.correct_option_index;
      const alreadyAnswered = answers.find(
        (a) => a.question_id === currentQ.id && a.player_id === me.id,
      );
      if (alreadyAnswered) return;

      // msTaken: since we don't track started_at precisely, use 0 for now.
      // (Could add a "question_started_at" to games later for accuracy.)
      const msTaken = 0;

      // First-correct detection requires existing answers
      const existingCorrect = answers.some(
        (a) => a.question_id === currentQ.id && a.is_correct,
      );
      const points = scoreAnswer(isCorrect, msTaken, isCorrect && !existingCorrect);

      const { error } = await supabase.from("answers").insert({
        game_id: game.id,
        question_id: currentQ.id,
        player_id: me.id,
        selected_option_index: optionIndex,
        is_correct: isCorrect,
        points_awarded: points,
        ms_taken: msTaken,
      });
      if (error) throw new Error(error.message);

      // Update player score (best-effort)
      if (points > 0) {
        await supabase
          .from("players")
          .update({ score: me.score + points })
          .eq("id", me.id);
      }
    },
    [game, me, questions, answers],
  );

  const handleReveal = useCallback(async () => {
    if (!game || !session?.hostToken) return;
    const { error } = await supabase
      .from("games")
      .update({ show_results: true })
      .eq("id", game.id)
      .eq("host_token", session.hostToken);
    if (error) throw new Error(error.message);
  }, [game, session?.hostToken]);

  const handleNext = useCallback(async () => {
    if (!game || !session?.hostToken) return;
    const next = game.current_question + 1;
    if (next >= game.total_questions) {
      const { error } = await supabase
        .from("games")
        .update({ status: "finished", show_results: false })
        .eq("id", game.id)
        .eq("host_token", session.hostToken);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("games")
        .update({ current_question: next, show_results: false })
        .eq("id", game.id)
        .eq("host_token", session.hostToken);
      if (error) throw new Error(error.message);
    }
  }, [game, session?.hostToken]);

  const handleCopyCode = useCallback(() => {
    if (!game) return;
    navigator.clipboard.writeText(game.code).catch(() => {});
  }, [game]);

  const handleResume = useCallback(() => {
    // Phase will be set by initial fetch effect
    setPhase("lobby");
  }, []);

  const handleLeave = useCallback(() => {
    saveSession(null);
    setSession(null);
    setGame(null);
    setMe(null);
    setPlayers([]);
    setFacts({});
    setQuestions([]);
    setAnswers([]);
    setPhase("home");
  }, []);

  const handlePlayAgain = useCallback(() => {
    // Reset to lobby with fresh facts/players (game stays, just reset state)
    setFacts({});
    setQuestions([]);
    setAnswers([]);
    setPhase("lobby");
    // Host can edit questions/state. For v1, simplest: leave.
    handleLeave();
  }, [handleLeave]);

  // ---- URL deep link: ?join=ABCD ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode && !session && phase === "home") {
      setPhase("join");
      // Pre-fill code via initialCode prop — handled by JoinGame reading location
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [phase, session]);

  // ---- Derived ----
  const currentQuestion = useMemo(
    () => questions.find((q) => q.question_index === game?.current_question) ?? null,
    [questions, game?.current_question],
  );

  const myAnswer = useMemo(
    () =>
      currentQuestion && me
        ? answers.find((a) => a.question_id === currentQuestion.id && a.player_id === me.id) ?? null
        : null,
    [currentQuestion, me, answers],
  );

  const answersForCurrent = useMemo(
    () => (currentQuestion ? answers.filter((a) => a.question_id === currentQuestion.id) : []),
    [currentQuestion, answers],
  );

  // Check env
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stage">
        <div className="max-w-md bg-card border border-border rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl text-gold mb-4">⚙️ Setup needed</h1>
          <p className="text-cream/80 mb-4">
            Copy <code className="bg-stage px-2 py-1 rounded">web/.env.example</code> to{" "}
            <code className="bg-stage px-2 py-1 rounded">web/.env.local</code> and fill in your Supabase URL and anon key.
          </p>
          <pre className="text-left text-xs bg-stage p-3 rounded-lg overflow-x-auto text-cream/60">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
          </pre>
        </div>
      </div>
    );
  }

  // ---- Render ----
  if (phase === "home") {
    return (
      <Home
        onHost={() => setPhase("create")}
        onJoin={() => setPhase("join")}
        hasStoredGame={!!session?.gameId}
        onResume={handleResume}
      />
    );
  }

  if (phase === "create") {
    return <CreateGame onSubmit={handleHost} onBack={() => setPhase("home")} />;
  }

  if (phase === "join") {
    return <JoinGame onSubmit={handleJoin} onBack={() => setPhase("home")} />;
  }

  if (phase === "lobby" && game && me) {
    return (
      <Lobby
        code={game.code}
        me={me}
        players={players}
        facts={facts}
        onFactChange={handleFactChange}
        onReady={handleReady}
        onStart={handleStart}
        onCopyCode={handleCopyCode}
      />
    );
  }

  if (phase === "playing" && game && me && currentQuestion) {
    return (
      <GamePlay
        me={me}
        players={players}
        question={currentQuestion}
        questionIndex={game.current_question}
        totalQuestions={game.total_questions}
        showResults={game.show_results}
        myAnswer={myAnswer}
        answersForQuestion={answersForCurrent}
        isHost={!!session?.hostToken}
        onAnswer={handleAnswer}
        onReveal={handleReveal}
        onNext={handleNext}
      />
    );
  }

  if (phase === "finished") {
    return <Final players={players} onPlayAgain={handlePlayAgain} onLeave={handleLeave} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stage text-cream/60">
      <p>Loading…</p>
    </div>
  );
}