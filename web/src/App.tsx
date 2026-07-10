import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Game, type Player, type Question, type Answer } from "@/lib/supabase";
import { uuid, randomCode } from "@/lib/utils";
import { generateQuestions, scoreAnswer } from "@/lib/gameLogic";
import { getProfile, upsertProfile, getProfilesForNames } from "@/lib/profiles";
import { getDefaultFacts } from "@/lib/defaultFacts";

import { Home } from "@/components/screens/Home";
import { CreateGame } from "@/components/screens/CreateGame";
import { JoinGame } from "@/components/screens/JoinGame";
import { Lobby } from "@/components/screens/Lobby";
import { GamePlay } from "@/components/screens/GamePlay";
import { Final } from "@/components/screens/Final";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { NarratorOverlay } from "@/components/ui/NarratorOverlay";

type Phase = "home" | "create" | "join" | "profile" | "lobby" | "playing" | "finished";

interface Session {
  clientId: string;
  gameId: string;
  hostToken: string | null;
  activePlayerId: string | null;   // which player is "playing as" right now
}

const SESSION_KEY = "***";

/** Per-player minimum answers required before the game can start. */
const MIN_FACTS_REQUIRED = 10;

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
  // Narrator overlay line queue — populated on phase transitions.
  // Consumed by <NarratorOverlay> mounted once near the root.
  const [narratorLines, setNarratorLines] = useState<{
    kind: "intro" | "outro" | "reaction" | "score_summary" | "tiebreak_tease" | "commentary" | "read_question" | "subject_intro";
    context: Record<string, unknown>;
    fallback: string;
    autoDismissMs?: number;
  }[]>([]);
  // Voice preference — users must opt in via a tap (browsers block autoplay).
  // Persisted in localStorage so they don't have to re-enable each visit.
  const VOICE_KEY = "ft:narratorVoice";
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(VOICE_KEY) === "1";
  });
  // facts[playerId][factKey] = factValue
  const [factsByPlayer, setFactsByPlayer] = useState<Record<string, Record<string, string>>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Player IDs whose facts were prefilled from a saved profile on lobby entry.
  const [prefilledFromProfile, setPrefilledFromProfile] = useState<Set<string>>(() => new Set());
  // The collaborative default-question pool. Loaded once at app startup and
  // refreshed when the user comes back from the profile screen (where they
  // can add / edit / delete rows).
  const [defaultFacts, setDefaultFacts] = useState<import("@/lib/supabase").DefaultFact[]>([]);
  const [avatarOverrides, setAvatarOverrides] = useState<Record<string, string>>({});
  // Live fact-count per player. Refreshed when the player list changes.
  // Lobby uses this to disable Start until everyone has 10+ answers.
  const [playerFactCounts, setPlayerFactCounts] = useState<Record<string, number>>({});

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

  /** Re-fetch the default-fact pool. Used after profile edits and at startup. */
  const refreshDefaultFacts = useCallback(async () => {
    const list = await getDefaultFacts();
    setDefaultFacts(list);
  }, []);

  // Refresh fact counts for every player in the current game. Called when
  // the player list changes (someone joins/leaves) and on demand.
  const refreshPlayerFactCounts = useCallback(async () => {
    if (!game?.id) {
      setPlayerFactCounts({});
      return;
    }
    if (players.length === 0) {
      setPlayerFactCounts({});
      return;
    }
    const ids = players.map((p) => p.id);
    const { data, error } = await supabase
      .from("player_facts")
      .select("player_id")
      .in("player_id", ids);
    if (error) {
      console.warn("Failed to fetch player_facts counts", error);
      return;
    }
    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const row of data ?? []) {
      counts[(row as { player_id: string }).player_id] =
        (counts[(row as { player_id: string }).player_id] || 0) + 1;
    }
    setPlayerFactCounts(counts);
  }, [game?.id, players]);

  // Load default facts once on app startup so lobby + profile have them ready.
  useEffect(() => {
    refreshDefaultFacts();
  }, [refreshDefaultFacts]);

  // Keep per-player fact counts in sync with the current player roster.
  // Refreshes on join/leave and after handleReady writes new facts.
  useEffect(() => {
    refreshPlayerFactCounts();
  }, [refreshPlayerFactCounts]);

  // ---- Narrator: fire lines on phase transitions ----
  const firedIntroFor = useRef<string | null>(null);
  const firedOutroFor = useRef<string | null>(null);
  useEffect(() => {
    if (!game) return;
    if (phase === "playing") {
      // Fire the intro once per game.
      if (firedIntroFor.current === game.id) return;
      firedIntroFor.current = game.id;
      const total = game.total_questions || 5;
      setNarratorLines((prev) => [
        ...prev,
        {
          kind: "intro",
          context: { round: 1, totalRounds: total, players: players.map((p) => ({ name: p.name, score: p.score })) },
          fallback: "Welcome to Family Trivia — let's see who really knows this family!",
          autoDismissMs: 4500,
        },
      ]);
    }
    if (phase === "finished") {
      // Fire the outro + score summary once per game.
      if (firedOutroFor.current === game.id) return;
      firedOutroFor.current = game.id;
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const leader = sorted[0];
      const runnerUp = sorted[1];
      const gap = leader && runnerUp ? leader.score - runnerUp.score : leader?.score ?? 0;
      setNarratorLines((prev) => [
        ...prev,
        {
          kind: "score_summary",
          context: {
            players: players.map((p) => ({ name: p.name, score: p.score })),
            leaderName: leader?.name,
            runnerUpName: runnerUp?.name,
            scoreGap: gap,
          },
          fallback: `That's the game! ${leader?.name ?? "Someone"} takes the crown.`,
          autoDismissMs: 4500,
        },
        {
          kind: "outro",
          context: {
            players: players.map((p) => ({ name: p.name, score: p.score })),
            leaderName: leader?.name,
            runnerUpName: runnerUp?.name,
            scoreGap: gap,
          },
          fallback: `And that's a wrap. Congratulations, ${leader?.name ?? "winner"} — you earned this one.`,
          autoDismissMs: 6000,
        },
      ]);
    }
  }, [phase, game, players]);

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

      // Late joiners: fetch existing questions + answers. Realtime only
      // delivers new events, so without this, anyone who joins after Start
      // gets stuck on "Loading..." forever.
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

      // Restore facts for all my players (so the lobby form prefills even
      // if we're resuming mid-game).
      //
      // IMPORTANT: merge with existing state, don't replace. On a new game's
      // first mount, `createOrJoinPlayer` has already pre-filled
      // factsByPlayer[p.id] from the player's saved profile. Reading empty
      // `player_facts` rows here (because nobody has clicked Ready yet) used
      // to wipe that prefill and leave the lobby blank — the "answers save
      // in profile but don't carry over to the game" bug.
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
          setFactsByPlayer((prev) => {
            const next = { ...prev };
            for (const [pid, pfacts] of Object.entries(map)) {
              next[pid] = { ...next[pid], ...pfacts };
            }
            return next;
          });
        }
      }

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

      // Prefill facts from the player's saved profile (8 default keys only),
      // so returning players don't have to re-type.
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

        // Commit the prefilled profile facts to player_facts too, so the
        // X/10 counter in the lobby is honest the moment the player joins.
        // Without this, the lobby shows 0/10 for every fresh player — the
        // form has the answers (local React state) but the DB has nothing
        // until Save/Ready/Start, so the live count and the form disagree.
        const rows = Object.entries(profile.facts || {})
          .filter(([, v]) => (v || "").trim().length > 0)
          .map(([fact_key, fact_value]) => ({
            player_id: p.id,
            fact_key,
            fact_value: fact_value.trim(),
          }));
        if (rows.length > 0) {
          const { error: pfErr } = await supabase
            .from("player_facts")
            .upsert(rows, { onConflict: "player_id,fact_key" });
          if (pfErr) {
            console.warn("Failed to commit prefill to player_facts", pfErr);
          }
        }
      } else {
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

  const validKeysSet = useMemo(
    () => new Set(defaultFacts.map((f) => f.key)),
    [defaultFacts],
  );

  /**
   * Save the active player's current fact-form values to BOTH the profile
   * (`profiles` table) and the game (`player_facts` table), then refresh
   * the live per-player fact-count pill in the lobby.
   *
   * Used by the lobby's "Save answers" button so players can persist
   * partial edits without having to hit Ready (which also gates on 10+
   * answers and writes player.ready=true).
   *
   * Writing to player_facts is what bumps the X/10 counter in the lobby —
   * `upsertProfile` alone doesn't touch that table, so the count pill
   * would stay at 0/10 even after Save.
   *
   * Empty values are dropped; keys no longer in the pool are filtered out.
   */
  const handleSaveAnswers = useCallback(async () => {
    if (!me) throw new Error("Pick a player first");
    const pf = factsByPlayer[me.id] || {};
    await persistFacts(me.id, pf);
    await upsertProfile(me.name, pf, validKeysSet);
    await refreshPlayerFactCounts();
  }, [me, factsByPlayer, persistFacts, validKeysSet, refreshPlayerFactCounts]);

  const handleReady = useCallback(async () => {
    for (const p of myPlayers) {
      const pf = factsByPlayer[p.id] || {};
      const filled = Object.values(pf).filter((v) => v.trim()).length;
      if (filled < MIN_FACTS_REQUIRED) {
        throw new Error(
          `${p.name} only has ${filled} of ${MIN_FACTS_REQUIRED} answers. Fill in at least ${MIN_FACTS_REQUIRED} before marking Ready.`,
        );
      }
      await persistFacts(p.id, pf);
      await upsertProfile(p.name, pf, validKeysSet);
      const { error } = await supabase
        .from("players")
        .update({ ready: true })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
    }
    // Refresh counts so the host sees the new totals immediately.
    refreshPlayerFactCounts();
  }, [myPlayers, factsByPlayer, persistFacts, validKeysSet, refreshPlayerFactCounts]);

  const handleStart = useCallback(async () => {
    if (!game || !session?.hostToken) throw new Error("Only the host can start");

    if (me) {
      const pf = factsByPlayer[me.id] || {};
      await persistFacts(me.id, pf);
      await upsertProfile(me.name, pf, validKeysSet);
    }

    // For multi-player-on-one-phone, also flush any local-state edits for
    // the host's other players before the DB-side count check below. The
    // previous version only persisted `me`, so a two-player lobby where
    // the host filled in player B's form but never clicked Ready would
    // fail validation here even though the form had 10/10 answers.
    for (const p of myPlayers) {
      if (p.id === me?.id) continue;
      const pf = factsByPlayer[p.id] || {};
      await persistFacts(p.id, pf);
      await upsertProfile(p.name, pf, validKeysSet);
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

    // Authoritative validation: every player needs MIN_FACTS_REQUIRED+ facts
    // before the game can start. The Lobby button is also gated, but the DB
    // is the source of truth so two players can race and the loser sees the
    // same error.
    if (playersAll && playersAll.length > 0) {
      const counts: Record<string, number> = {};
      for (const id of ids) counts[id] = 0;
      for (const f of factsAll ?? []) {
        counts[(f as { player_id: string }).player_id] =
          (counts[(f as { player_id: string }).player_id] || 0) + 1;
      }
      const incomplete = (playersAll as Player[]).filter(
        (p) => (counts[p.id] || 0) < MIN_FACTS_REQUIRED,
      );
      if (incomplete.length > 0) {
        const detail = incomplete
          .map((p) => `${p.name} (${counts[p.id] || 0}/${MIN_FACTS_REQUIRED})`)
          .join(", ");
        throw new Error(
          `Each player needs at least ${MIN_FACTS_REQUIRED} answers before starting. Missing: ${detail}`,
        );
      }
    }

    // Fetch player bios for tailored-question injection. Best-effort — a
    // missing or unreadable profile map just means no tailored questions.
    let playerBios: Record<string, { birth_year?: number | null; occupation?: string | null; interests?: string[] }> = {};
    try {
      const playerNameList = (playersAll ?? []).map((p) => p.name);
      if (playerNameList.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("full_name, birth_year, occupation, interests")
          .in("full_name", playerNameList);
        if (profileRows) {
          const nameToBio: Record<string, { birth_year: number | null; occupation: string | null; interests: string[] }> = {};
          for (const row of profileRows as Array<{ full_name: string; birth_year: number | null; occupation: string | null; interests: string[] | null }>) {
            nameToBio[row.full_name] = {
              birth_year: row.birth_year,
              occupation: row.occupation,
              interests: row.interests ?? [],
            };
          }
          for (const p of playersAll ?? []) {
            const bio = nameToBio[p.name];
            if (bio) {
              playerBios[p.id] = {
                birth_year: bio.birth_year,
                occupation: bio.occupation,
                interests: bio.interests,
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load player bios, no tailored questions:", e);
    }

    const generated = await generateQuestions({
      gameId: game.id,
      players: (playersAll ?? []) as Player[],
      facts: (factsAll ?? []) as { id: string; player_id: string; fact_key: string; fact_value: string }[],
      defaultFacts,
      playerBios,
    });

    if (generated.length === 0) {
      throw new Error("Not enough facts to generate questions. Make sure everyone entered at least one fact.");
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
  }, [game, session?.hostToken, me, factsByPlayer, persistFacts, defaultFacts, validKeysSet]);

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

      const msTaken = 0;
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

  /**
   * Reload the default-fact pool after the user comes back from the
   * profile screen where they may have added/edited/deleted rows.
   */
  const handleProfileClose = useCallback(async () => {
    await refreshDefaultFacts();
    refreshAvatars();
    setPhase("home");
  }, [refreshDefaultFacts, refreshAvatars]);

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

  // Pop the head off the narrator line queue. Stable so the NarratorOverlay
  // effect doesn't re-run on every realtime update.
  const handleNarratorConsumed = useCallback(() => {
    setNarratorLines((prev) => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  // Mid-game summon: push a `commentary` line about the current question
  // onto the narrator queue. The model gives a cheeky hint that doesn't
  // spoil the answer. We never send `correct_option_index` or the answer
  // text — the host prompt is designed to nudge without revealing.
  const handleSummonHost = useCallback(() => {
    const cq = questions.find((q) => q.question_index === game?.current_question);
    if (!cq) return;
    const subject = players.find((p) => p.id === cq.subject_player_id);
    setNarratorLines((prev) => [
      ...prev,
      {
        kind: "commentary",
        context: {
          questionText: cq.question_text,
          subjectName: subject?.name,
          round: (game?.current_question ?? 0) + 1,
          totalRounds: game?.total_questions ?? 5,
          players: players.map((p) => ({ name: p.name, score: p.score })),
        },
        fallback: "You rang? Let's see… this one's a doozy.",
        autoDismissMs: 5500,
      },
    ]);
  }, [questions, game, players]);

  // User opted into voice — persist so we don't have to ask again.
  const handleEnableVoice = useCallback(() => {
    setVoiceEnabled(true);
    try {
      localStorage.setItem(VOICE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // ---- URL deep link: ?join=ABCD ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode && !session && phase === "home") {
      window.dispatchEvent(new CustomEvent("deeplink-join", { detail: joinCode }));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [phase, session]);

  // ---- Derived ----
  const currentQuestion = useMemo(
    () => questions.find((q) => q.question_index === game?.current_question) ?? null,
    [questions, game?.current_question],
  );

  // ---- Narrator: auto-fire lines on game state transitions ----
  // Auto-narration when a new question appears. If the LOCAL player is the
  // subject of the question, fire `subject_intro` (spotlight on them) — they
  // already know the answer and don't need it read aloud. Otherwise fire
  // `read_question` so the host announces the question to the guesser.
  // For tailored questions (fact_key starts with "tailored:"), queue an
  // extra `commentary` shout-out before reading — "Coming up — a question
  // tailored for [name]!" so players register the customized moment.
  // Use a ref keyed on question id so we never re-fire for the same question.
  const readQuestionFor = useRef<string | null>(null);
  useEffect(() => {
    if (!currentQuestion || phase !== "playing") return;
    if (readQuestionFor.current === currentQuestion.id) return;
    readQuestionFor.current = currentQuestion.id;
    const subject = players.find((p) => p.id === currentQuestion.subject_player_id);
    const isLocalSubject = !!me && currentQuestion.subject_player_id === me.id;
    const isTailored = currentQuestion.fact_key.startsWith("tailored:");
    const tag = isTailored ? currentQuestion.fact_key.split(":")[1] : null;

    const lines: typeof narratorLines = [];

    // Tailored shout-out: fire only for guessers (subjects already know
    // the answer and will get a spotlight line shortly).
    if (isTailored && !isLocalSubject && subject) {
      lines.push({
        kind: "commentary",
        context: {
          questionText: currentQuestion.question_text,
          subjectName: subject.name,
          round: (game?.current_question ?? 0) + 1,
          totalRounds: game?.total_questions ?? 5,
          players: players.map((p) => ({ name: p.name, score: p.score })),
        },
        fallback: `Coming up — a question tailored for ${subject.name}.`,
        // Short — just enough for the host to set the scene.
        autoDismissMs: 3200,
      });
    }

    lines.push({
      kind: isLocalSubject ? "subject_intro" : "read_question",
      context: {
        questionText: currentQuestion.question_text,
        subjectName: subject?.name,
        round: (game?.current_question ?? 0) + 1,
        totalRounds: game?.total_questions ?? 5,
        players: players.map((p) => ({ name: p.name, score: p.score })),
      },
      fallback: isLocalSubject
        ? `Spotlight's on you, ${subject?.name ?? "friend"} — let's see if they know you!`
        : `Here's the next one: ${currentQuestion.question_text}`,
      // Don't autoDismiss — let gameplay take the floor after audio ends.
      autoDismissMs: 0,
    });

    setNarratorLines((prev) => [...prev, ...lines]);
    void tag; // currently unused; kept for future per-tag narration tweaks
  }, [currentQuestion, phase, game, players, me]);

  // Tiny ack when a player submits an answer. Detection watches answer
  // count rising between renders. In big games (4+ players) we throttle
  // to every other submission so the host doesn't chatter non-stop.
  const ackedAnswerCount = useRef(0);
  useEffect(() => {
    if (phase !== "playing" || !game) return;
    const c = answers.length;
    if (c <= ackedAnswerCount.current) {
      ackedAnswerCount.current = c; // reset on new game (count drops)
      return;
    }
    ackedAnswerCount.current = c;

    // Throttle: in 4+ player games only fire acks every other answer
    // (and always on the last one to give a "all locked in" beat).
    const isBigGame = players.length >= 4;
    const isFinal = c >= players.length; // everyone has answered
    const shouldAck = !isBigGame || isFinal || c % 2 === 0;
    if (!shouldAck) return;

    const recent = answers[answers.length - 1];
    const submitter = players.find((p) => p.id === recent.player_id);
    if (!submitter) return;
    setNarratorLines((prev) => [
      ...prev,
      {
        kind: "reaction",
        context: {
          playerName: submitter.name,
          isCorrect: undefined,
          round: (game.current_question ?? 0) + 1,
          totalRounds: game.total_questions ?? 5,
          players: players.map((p) => ({ name: p.name, score: p.score })),
        },
        fallback: isFinal
          ? `That's everyone — let's see what you've got!`
          : `Locked in from ${submitter.name}!`,
        autoDismissMs: isFinal ? 4500 : 0,
      },
    ]);
  }, [answers.length, phase, game, players, answers]);

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

  const myFactsByPlayer = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const p of myPlayers) {
      map[p.id] = factsByPlayer[p.id] || {};
    }
    return map;
  }, [myPlayers, factsByPlayer]);

  // ---- Render ----
  const narratorOverlay = (
    <NarratorOverlay
      lines={narratorLines}
      voiceEnabled={voiceEnabled}
      onConsumed={handleNarratorConsumed}
      onEnableVoice={handleEnableVoice}
    />
  );

  if (phase === "home") {
    return (
      <>
        {narratorOverlay}
        <Home
          onHost={() => setPhase("create")}
          onJoin={() => setPhase("join")}
          onProfile={() => setPhase("profile")}
          hasStoredGame={!!session?.gameId}
          onResume={handleResume}
        />
      </>
    );
  }

  if (phase === "create") {
    return <>{narratorOverlay}<CreateGame onSubmit={handleHost} onBack={() => setPhase("home")} /></>;
  }

  if (phase === "join") {
    return <>{narratorOverlay}<JoinGame onSubmit={handleJoin} onBack={() => setPhase("home")} /></>;
  }

  if (phase === "profile") {
    return (
      <>
        {narratorOverlay}
        <ProfileScreen
          onBack={handleProfileClose}
          defaultFacts={defaultFacts}
          onDefaultFactsChanged={refreshDefaultFacts}
        />
      </>
    );
  }

  if (phase === "lobby" && game && me) {
    return (
      <>
        {narratorOverlay}
        <Lobby
        code={game.code}
        myPlayers={myPlayers}
        activePlayerId={me.id}
        players={players}
        facts={myFacts}
        myFactsByPlayer={myFactsByPlayer}
        defaultFacts={defaultFacts}
        avatarOverrides={avatarOverrides}
        prefilledFromProfile={prefilledFromProfile.has(me.id)}
        playerFactCounts={playerFactCounts}
        minFactsRequired={MIN_FACTS_REQUIRED}
        onFactChange={handleFactChange}
        onSetActive={handleSetActivePlayer}
        onAddPlayer={handleAddPlayer}
        onReady={handleReady}
        onStart={handleStart}
        onSaveAnswers={handleSaveAnswers}
        onCopyCode={handleCopyCode}
        onLeave={handleLeave}
        onOpenProfile={() => setPhase("profile")}
        isHost={!!session?.hostToken}
      />
      </>
    );
  }

  if (phase === "playing" && game && me && currentQuestion) {
    return (
      <>
        {narratorOverlay}
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
        onSummonHost={handleSummonHost}
      />
      </>
    );
  }

  if (phase === "finished") {
    return <>{narratorOverlay}<Final players={players} avatarOverrides={avatarOverrides} onPlayAgain={handlePlayAgain} onLeave={handleLeave} /></>;
  }

  return (
    <>
      {narratorOverlay}
      <div className="min-h-screen flex items-center justify-center bg-stage text-cream/60">
        <p>Loading…</p>
      </div>
    </>
  );
}