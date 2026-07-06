import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Game, type Player, type Question, type Answer } from "@/lib/supabase";
import { uuid, randomCode } from "@/lib/utils";
import { generateQuestions, scoreAnswer } from "@/lib/gameLogic";
import { getProfile, upsertProfile, getProfilesForNames } from "@/lib/profiles";
import { getSharedQuestionsWithAnswers } from "@/lib/sharedQuestions";

import { Home } from "@/components/screens/Home";
import { CreateGame } from "@/components/screens/CreateGame";
import { JoinGame } from "@/components/screens/JoinGame";
import { Lobby } from "@/components/screens/Lobby";
import { GamePlay } from "@/components/screens/GamePlay";
import { Final } from "@/components/screens/Final";
import { ProfileScreen } from "@/components/screens/ProfileScreen";

type Phase = "home" | "create" | "join" | "profile" | "lobby" | "playing" | "finished";

interface Session {
  clientId: string;
  gameId: string;
  hostToken: string | null;
  activePlayerId: string | null;   // which player is "playing as" right now
}

const SESSION_KEY = "***";

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
  const [players, setPlayers] = useState<Player[]>([]);
  // facts[playerId][factKey] = factValue
  const [factsByPlayer, setFactsByPlayer] = useState<Record<string, Record<string, string>>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Player IDs whose facts were prefilled from a saved profile on lobby entry.
  // Used by Lobby to show a "welcome back" indicator.
  const [prefilledFromProfile, setPrefilledFromProfile] = useState<Set<string>>(() => new Set());
  // Per-name avatar emoji overrides pulled from each player's profile.
  // Map keyed by full_name → emoji. Absent names fall back to the roster default.
  const [avatarOverrides, setAvatarOverrides] = useState<Record<string, string>>({});

  const clientIdRef = useRef(session?.clientId || uuid());

  // Players on this device (derived from players + clientId match)
  const myPlayers = useMemo(
    () => players.filter((p) => p.client_id === clientIdRef.current),
    [players],
  );
  const me = useMemo(
    () =>
      myPlayers.find((p) => p.id === session?.activePlayerId) ??
      myPlayers[0] ??
      null,
    [myPlayers, session?.activePlayerId],
  );

  // ---- Realtime subscriptions ----
  useEffect(() => {
    if (!session?.gameId) return;
    const gameId = session.gameId;

    const ch = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const next = payload.new as Game;
          setGame(next);
          if (next.status === "playing") setPhase((p) => (p === "lobby" || p === "playing" ? "playing" : p));
          if (next.status === "finished") setPhase("finished");
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as Player;
          setPlayers((prev) => {
            const idx = prev.findIndex((p) => p.id === row.id);
            if (idx === -1) return [...prev, row];
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as Question;
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
          if (payload.eventType === "DELETE") return;
          const row = payload.new as Answer;
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
      supabase.removeChannel(ch);
    };
  }, [session?.gameId]);

  // ---- Initial fetch for the session ----
  useEffect(() => {
    if (!session?.gameId) return;
    let cancelled = false;

    (async () => {
      // Always fetch game + players first.
      const [{ data: g }, { data: ps }] = await Promise.all([
        supabase.from("games").select("*").eq("id", session.gameId).maybeSingle(),
        supabase.from("players").select("*").eq("game_id", session.gameId),
      ]);

      if (cancelled) return;

      if (!g) {
        saveSession(null);
        setSession(null);
        setPhase("home");
        return;
      }

      setGame(g);
      setPlayers((ps ?? []) as Player[]);

      // Pre-resolve avatar emojis for everyone in the game. Persisted per-
      // profile so a player's chosen emoji follows them across games.
      const nameList = (ps ?? []).map((p: Player) => p.name);
      if (nameList.length > 0) {
        const profiles = await getProfilesForNames(nameList);
        if (!cancelled) {
          const next: Record<string, string> = {};
          for (const [n, prof] of Object.entries(profiles)) {
            if (prof.avatar_emoji) next[n] = prof.avatar_emoji;
          }
          setAvatarOverrides(next);
        }
      } else {
        setAvatarOverrides({});
      }

      // CRITICAL: if the game is mid-play or finished, late joiners need
      // to fetch the existing questions + answers. Realtime only delivers
      // NEW events — it doesn't replay history — so without this, anyone
      // who joins after the host hit Start gets stuck on "Loading…" forever.
      if (g.status !== "lobby") {
        const [{ data: qs }, { data: ans }] = await Promise.all([
          supabase
            .from("questions")
            .select("*")
            .eq("game_id", session.gameId)
            .order("question_index"),
          supabase
            .from("answers")
            .select("*")
            .eq("game_id", session.gameId),
        ]);
        if (!cancelled && qs) setQuestions(qs as Question[]);
        if (!cancelled && ans) setAnswers(ans as Answer[]);
      }

      // Restore facts for ALL my players (so the lobby fact form prefills
      // even if we're resuming mid-game).
      const myRows = (ps ?? []).filter((p: Player) => p.client_id === clientIdRef.current);
      if (myRows.length > 0) {
        const ids = myRows.map((p) => p.id);
        const { data: fs } = await supabase
          .from("player_facts")
          .select("*")
          .in("player_id", ids);
        if (!cancelled && fs) {
          const map: Record<string, Record<string, string>> = {};
          for (const f of fs as { player_id: string; fact_key: string; fact_value: string }[]) {
            if (!map[f.player_id]) map[f.player_id] = {};
            map[f.player_id][f.fact_key] = f.fact_value;
          }
          setFactsByPlayer(map);
        }
      }

      // Phase from status — set AFTER questions are loaded so the renderer
      // can find currentQuestion immediately.
      if (g.status === "lobby") setPhase("lobby");
      else if (g.status === "playing") setPhase("playing");
      else if (g.status === "finished") setPhase("finished");
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.gameId]);

  // ---- Actions ----

  const createOrJoinPlayer = useCallback(
    async (gameId: string, name: string, isHost: boolean, hostToken: string | null) => {
      const { data: p, error } = await supabase
        .from("players")
        .insert({
          game_id: gameId,
          client_id: clientIdRef.current,
          name,
          is_host: isHost,
        })
        .select()
        .single();
      if (error || !p) throw new Error(error?.message || "Could not add player");

      // Prefill facts from the player's saved profile, if one exists.
      // This is how returning players don't have to re-type all 8 facts.
      // (Shared Q&A is fetched separately at game-start time — see
      // sharedQuestions.ts — and doesn't need to be prefilled here.)
      // and don't need to be prefilled into the per-player facts map.)
      const profile = await getProfile(name);
      if (profile) {
        setFactsByPlayer((prev) => ({
          ...prev,
          [p.id]: { ...profile.facts },
        }));
        setPrefilledFromProfile((prev) => {
          const next = new Set(prev);
          next.add(p.id);
          return next;
        });
      } else {
        // No profile yet — ensure an entry exists so Lobby doesn't show stale data
        setFactsByPlayer((prev) =>
          prev[p.id] ? prev : { ...prev, [p.id]: {} },
        );
      }

      const newSession: Session = {
        clientId: clientIdRef.current,
        gameId,
        hostToken,
        activePlayerId: p.id,
      };
      saveSession(newSession);
      setSession(newSession);
      return p as Player;
    },
    [],
  );

  const handleHost = useCallback(async (hostName: string) => {
    const code = randomCode();
    const hostToken = uuid();

    const { data: g, error: gErr } = await supabase
      .from("games")
      .insert({ code, host_token: hostToken, status: "lobby" })
      .select()
      .single();
    if (gErr || !g) throw new Error(gErr?.message || "Could not create game");

    await createOrJoinPlayer(g.id, hostName, true, hostToken);
    setGame(g);
    setPhase("lobby");
  }, [createOrJoinPlayer]);

  const handleJoin = useCallback(async (code: string, name: string) => {
    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (gErr || !g) throw new Error("Game not found");
    if (g.status !== "lobby") throw new Error("Game already started");

    await createOrJoinPlayer(g.id, name, false, null);
    setGame(g);
    setPhase("lobby");
  }, [createOrJoinPlayer]);

  const handleAddPlayer = useCallback(
    async (name: string) => {
      if (!session?.gameId) throw new Error("Not in a game");
      await createOrJoinPlayer(session.gameId, name, false, session.hostToken);
    },
    [session?.gameId, session?.hostToken, createOrJoinPlayer],
  );

  const handleSetActivePlayer = useCallback((playerId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, activePlayerId: playerId };
      saveSession(next);
      return next;
    });
  }, []);

  const handleFactChange = useCallback((key: string, value: string) => {
    if (!me) return;
    setFactsByPlayer((prev) => ({
      ...prev,
      [me.id]: { ...(prev[me.id] || {}), [key]: value },
    }));
  }, [me]);

  const persistFacts = useCallback(async (playerId: string, next: Record<string, string>) => {
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
    // Mark all my players ready + persist their facts (this game) AND update
    // their profile (across games) so next time they don't re-enter.
    for (const p of myPlayers) {
      const pf = factsByPlayer[p.id] || {};
      await persistFacts(p.id, pf);
      await upsertProfile(p.name, pf);
      const { error } = await supabase
        .from("players")
        .update({ ready: true })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
    }
  }, [myPlayers, factsByPlayer, persistFacts]);

  const handleStart = useCallback(async () => {
    if (!game || !session?.hostToken) throw new Error("Only the host can start");

    // Persist host's facts too (in case they hit Start without clicking Ready).
    // And update their profile so the next game has them prefilled.
    if (me) {
      const pf = factsByPlayer[me.id] || {};
      await persistFacts(me.id, pf);
      await upsertProfile(me.name, pf);
    }

    const [{ data: playersAll }, { data: playerIds }] = await Promise.all([
      supabase.from("players").select("*").eq("game_id", game.id),
      supabase.from("players").select("id").eq("game_id", game.id),
    ]);

    const ids = (playerIds ?? []).map((p: { id: string }) => p.id);
    const { data: factsAll } = await supabase
      .from("player_facts")
      .select("*")
      .in("player_id", ids);

    // Pull the shared community Q&A bank. The generator filters to
    // (question, answer) pairs whose answerer is in this game.
    const shared = await getSharedQuestionsWithAnswers();
    const sharedQuestions = shared.map(({ answers: _answers, ...q }) => q);
    const sharedAnswers = shared.flatMap((q) => q.answers);

    const generated = generateQuestions({
      gameId: game.id,
      players: (playersAll ?? []) as Player[],
      facts: (factsAll ?? []) as { id: string; player_id: string; fact_key: string; fact_value: string }[],
      sharedQuestions,
      sharedAnswers,
    });

    if (generated.length === 0) {
      throw new Error("Not enough facts to generate questions. Make sure everyone entered at least one fact.");
    }
    // 2026-07-05: facts are now optional. Players can submit with as few as
    // one fact, so the host sees this error only when literally nothing was
    // entered across the whole game (which should be impossible given the
    // Lobby gate, but kept as a defensive check).

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
  }, [game, session?.hostToken, me, factsByPlayer, persistFacts]);

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (!game || !me) return;
      const currentQ = questions.find((q) => q.question_index === game.current_question);
      if (!currentQ) return;

      const isCorrect = optionIndex === currentQ.correct_option_index;
      const alreadyAnswered = answers.find(
        (a) => a.question_id === currentQ.id && a.player_id === me.id,
      );
      if (alreadyAnswered) return;

      const msTaken = 0; // no question_started_at tracked yet
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
    // Phase will be set by initial fetch effect.
  }, []);

  /**
   * Refresh avatar overrides for the current players in the game.
   * Called after the profile screen edits an avatar so changes propagate
   * immediately without needing to re-join the game.
   */
  const refreshAvatars = useCallback(async () => {
    const nameList = players.map((p) => p.name);
    if (nameList.length === 0) return;
    const profiles = await getProfilesForNames(nameList);
    const next: Record<string, string> = {};
    for (const [n, prof] of Object.entries(profiles)) {
      if (prof.avatar_emoji) next[n] = prof.avatar_emoji;
    }
    setAvatarOverrides(next);
  }, [players]);

  const handleLeave = useCallback(() => {
    saveSession(null);
    setSession(null);
    setGame(null);
    setPlayers([]);
    setFactsByPlayer({});
    setQuestions([]);
    setAnswers([]);
    setPhase("home");
  }, []);

  const handlePlayAgain = useCallback(() => {
    handleLeave();
  }, [handleLeave]);

  // ---- URL deep link: ?join=ABCD ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode && !session && phase === "home") {
      // Trigger join flow via a custom event
      window.dispatchEvent(new CustomEvent("deeplink-join", { detail: joinCode }));
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

  const myFacts = useMemo(
    () => (me ? factsByPlayer[me.id] || {} : {}),
    [me, factsByPlayer],
  );

  // Facts for ALL players on this device, keyed by player id. Used by the
  // Lobby to check whether every my-player has all 8 facts filled in.
  const myFactsByPlayer = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const p of myPlayers) {
      map[p.id] = factsByPlayer[p.id] || {};
    }
    return map;
  }, [myPlayers, factsByPlayer]);

  // ---- Render ----
  if (phase === "home") {
    return (
      <Home
        onHost={() => setPhase("create")}
        onJoin={() => setPhase("join")}
        onProfile={() => setPhase("profile")}
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

  if (phase === "profile") {
    return <ProfileScreen onBack={() => { refreshAvatars(); setPhase("home"); }} />;
  }

  if (phase === "lobby" && game && me) {
    return (
      <Lobby
        code={game.code}
        myPlayers={myPlayers}
        activePlayerId={me.id}
        players={players}
        facts={myFacts}
        myFactsByPlayer={myFactsByPlayer}
        avatarOverrides={avatarOverrides}
        prefilledFromProfile={prefilledFromProfile.has(me.id)}
        onFactChange={handleFactChange}
        onSetActive={handleSetActivePlayer}
        onAddPlayer={handleAddPlayer}
        onReady={handleReady}
        onStart={handleStart}
        onCopyCode={handleCopyCode}
        onLeave={handleLeave}
        onOpenProfile={() => setPhase("profile")}
        isHost={!!session?.hostToken}
      />
    );
  }

  if (phase === "playing" && game && me && currentQuestion) {
    return (
      <GamePlay
        me={me}
        myPlayers={myPlayers}
        players={players}
        question={currentQuestion}
        questionIndex={game.current_question}
        totalQuestions={game.total_questions}
        showResults={game.show_results}
        myAnswer={myAnswer}
        answersForQuestion={answersForCurrent}
        avatarOverrides={avatarOverrides}
        isHost={!!session?.hostToken}
        onAnswer={handleAnswer}
        onReveal={handleReveal}
        onNext={handleNext}
        onSetActive={handleSetActivePlayer}
        onLeave={handleLeave}
      />
    );
  }

  if (phase === "finished") {
    return <Final players={players} avatarOverrides={avatarOverrides} onPlayAgain={handlePlayAgain} onLeave={handleLeave} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stage text-cream/60">
      <p>Loading…</p>
    </div>
  );
}