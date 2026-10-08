"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { notify } from "@/lib/notify";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

import { blocksToPlainText } from "./blocks-to-plain-text";
import { PAGE_DETAIL_COLUMNS, pageKeys, withListTitle } from "./queries";
import {
  classifySaveError,
  createSession,
  hasUnsaved,
  isAuthFailure,
  retryDelayMs,
  SAVE_IDLE_MS,
  SAVE_MAX_WAIT_MS,
  saveReducer,
  type SaveError,
  type SaveEvent,
  type ServerPage,
  type Session,
  type Snapshot,
} from "./save-machine";
import {
  pageDetailSchema,
  type PageDetail,
  type PageListItem,
  type StoredBlock,
} from "./schemas";

const STREAK_TOAST =
  "Can't save right now. Your text is kept and Luna keeps trying.";
const PERMANENT_TOAST = "Could not save this page.";
const TOO_LARGE_TOAST =
  "This page is too large to save. Remove some text to keep saving.";
const SIGNED_OUT_TOAST =
  "You were signed out. Sign in again in another tab, then keep writing here.";

// Which states a flush sends from: an edit flush (blur, idle, leaving the
// page) only sends pending edits; `now` also retries at once (tab hidden,
// back online); `all` also retries a permanent failure (sign out).
type FlushMode = "edit" | "now" | "all";

type Timer = ReturnType<typeof setTimeout>;

export type PendingSaves = ReturnType<typeof createPendingSaves>;

// Spec 0004: one save session per page with unsaved edits, held above the
// page view so a save outlives navigation. Created once per provider.
function createPendingSaves(queryClient: QueryClient) {
  const supabase = getSupabaseBrowserClient();
  let sessions: ReadonlyMap<string, Session> = new Map();
  const listeners = new Set<() => void>();
  const attached = new Map<string, number>();
  const idleTimers = new Map<string, Timer>();
  const maxWaitTimers = new Map<string, Timer>();
  const retryTimers = new Map<string, Timer>();
  const settling = new Map<string, Promise<void>>();

  function emit() {
    for (const listener of listeners) listener();
  }

  function setSession(id: string, session: Session | undefined) {
    const next = new Map(sessions);
    if (session) next.set(id, session);
    else next.delete(id);
    sessions = next;
    emit();
  }

  function clearTimer(timers: Map<string, Timer>, id: string) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }

  function startTimer(
    timers: Map<string, Timer>,
    id: string,
    ms: number,
    run: () => void,
  ) {
    clearTimer(timers, id);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        run();
      }, ms),
    );
  }

  function writeCaches(id: string, saved: Snapshot, updatedAt: string) {
    queryClient.setQueryData<PageDetail | null>(pageKeys.detail(id), (old) =>
      old ? { ...old, ...saved, updated_at: updatedAt } : old,
    );
    queryClient.setQueryData<PageListItem[]>(pageKeys.list(), (list) =>
      withListTitle(list, id, saved.title),
    );
  }

  function dispatch(id: string, event: SaveEvent) {
    const prev = sessions.get(id);
    if (!prev) return;
    const next = saveReducer(prev, event);
    if (next === prev) return;
    setSession(id, next);
    afterTransition(id, prev, next, event);
  }

  // Side effects of a transition: timers, the network call, caches, toasts.
  function afterTransition(
    id: string,
    prev: Session,
    next: Session,
    event: SaveEvent,
  ) {
    if (next.state === "dirty") {
      const settled = prev.state === "saving";
      if (event.type === "edit" || settled) {
        startTimer(idleTimers, id, SAVE_IDLE_MS, () => flush(id, "edit"));
      }
      // Max wait counts from the first unsaved edit since the last settled save.
      if (prev.state !== "dirty" || settled) {
        startTimer(maxWaitTimers, id, SAVE_MAX_WAIT_MS, () =>
          flush(id, "edit"),
        );
      }
    } else {
      clearTimer(idleTimers, id);
      clearTimer(maxWaitTimers, id);
    }

    if (next.state === "retrying" && prev.state !== "retrying") {
      startTimer(retryTimers, id, retryDelayMs(next.failures), () =>
        flush(id, "now"),
      );
    } else if (next.state !== "retrying") {
      clearTimer(retryTimers, id);
    }

    if (next.base !== prev.base) writeCaches(id, next.saved, next.base);

    if (next.state === "retrying" && next.failures === 3) {
      notify.error(STREAK_TOAST);
    }
    if (next.signedOutNotified && !prev.signedOutNotified) {
      notify.error(SIGNED_OUT_TOAST);
    }
    if (next.state === "failed" && prev.state === "saving") {
      notify.error(
        next.failureKind === "too_large" ? TOO_LARGE_TOAST : PERMANENT_TOAST,
      );
    }

    if (next.state === "saving" && prev.state !== "saving") {
      const done = send(id).finally(() => settling.delete(id));
      settling.set(id, done);
    }

    if (next.state === "saved" && !attached.has(id)) setSession(id, undefined);
  }

  async function fail(id: string, error: SaveError) {
    let signedOut = false;
    if (isAuthFailure(error)) {
      const { data } = await supabase.auth.getSession();
      signedOut = !data.session;
    }
    dispatch(id, { type: "failed", kind: classifySaveError(error), signedOut });
  }

  // One save in flight per page: the reducer only enters `saving` from a
  // state with nothing in flight.
  async function send(id: string) {
    const session = sessions.get(id);
    const payload = session?.inFlight;
    if (!session || !payload) return;
    const fields: { title?: string; content?: Json; content_text?: string } =
      {};
    if (payload.title !== undefined) fields.title = payload.title;
    if (payload.content !== undefined) {
      fields.content = payload.content as unknown as Json;
      fields.content_text = blocksToPlainText(payload.content);
    }

    try {
      const { data, error, status } = await supabase
        .from("pages")
        .update(fields)
        .eq("id", id)
        .eq("updated_at", session.base)
        .select("updated_at");
      if (error) return await fail(id, { code: error.code, status });
      if (data.length > 0) {
        return dispatch(id, {
          type: "succeeded",
          updatedAt: data[0].updated_at,
        });
      }
      await check(id);
    } catch {
      await fail(id, {});
    }
  }

  // 0 rows updated: the page is gone, another tab saved first, or this
  // tab's earlier save landed but its response was lost.
  async function check(id: string) {
    const { data, error, status } = await supabase
      .from("pages")
      .select(PAGE_DETAIL_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(id, { code: error.code, status });
    if (data === null) return dispatch(id, { type: "checked", row: null });
    const parsed = pageDetailSchema.safeParse(data);
    if (!parsed.success) {
      return dispatch(id, { type: "failed", kind: "permanent" });
    }
    const { title, content, updated_at } = parsed.data;
    dispatch(id, {
      type: "checked",
      row: { title, content, updatedAt: updated_at },
    });
  }

  function flush(id: string, mode: FlushMode) {
    const state = sessions.get(id)?.state;
    const sends =
      state === "dirty" ||
      (state === "retrying" && mode !== "edit") ||
      (state === "failed" && mode === "all");
    if (sends) dispatch(id, { type: "send", force: mode === "all" });
  }

  function flushEach(mode: FlushMode) {
    for (const id of sessions.keys()) flush(id, mode);
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSessions: () => sessions,

    // A page view reports each edit; the first one opens the session from
    // the version the view loaded.
    edit(
      id: string,
      origin: ServerPage,
      change: { title?: string; content?: StoredBlock[] },
    ) {
      if (!sessions.has(id)) setSession(id, createSession(origin));
      dispatch(id, { type: "edit", ...change });
    },

    flush,
    flushEach,

    // While a page view is mounted its session stays, even once saved. On
    // leaving, pending edits are sent and keep saving in the background.
    attach(id: string) {
      attached.set(id, (attached.get(id) ?? 0) + 1);
      return () => {
        const count = (attached.get(id) ?? 1) - 1;
        if (count > 0) attached.set(id, count);
        else attached.delete(id);
        if (count > 0) return;
        flush(id, "edit");
        if (sessions.get(id)?.state === "saved") setSession(id, undefined);
      };
    },

    loadNewer: (id: string) => dispatch(id, { type: "loadNewer" }),
    keepMine: (id: string) => dispatch(id, { type: "keepMine" }),

    hasUnsaved: () => [...sessions.values()].some(hasUnsaved),

    // Sign out: one save attempt now for every unsaved page; true only if
    // every page ends saved. Conflict and gone count as unsaved, unsent.
    async flushAll(): Promise<boolean> {
      flushEach("all");
      await Promise.all(settling.values());
      return ![...sessions.values()].some(hasUnsaved);
    },

    dispose() {
      for (const timers of [idleTimers, maxWaitTimers, retryTimers]) {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
      }
    },
  };
}

const PendingSavesContext = createContext<PendingSaves | null>(null);

export function PendingSavesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [registry] = useState(() => createPendingSaves(queryClient));

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!registry.hasUnsaved()) return;
      event.preventDefault();
      // Older browsers need returnValue set to show the leave warning.
      event.returnValue = "";
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") registry.flushEach("now");
    }
    function onOnline() {
      registry.flushEach("now");
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [registry]);

  useEffect(() => () => registry.dispose(), [registry]);

  return (
    <PendingSavesContext.Provider value={registry}>
      {children}
    </PendingSavesContext.Provider>
  );
}

export function usePendingSaves(): PendingSaves {
  const registry = useContext(PendingSavesContext);
  if (!registry) {
    throw new Error("usePendingSaves must be used inside PendingSavesProvider");
  }
  return registry;
}

// Outside the app shell (the style guide) there is no registry.
export function usePendingSavesOptional(): PendingSaves | null {
  return useContext(PendingSavesContext);
}

// The save session for a page, if one exists; rerenders when it changes.
export function useSession(id: string): Session | undefined {
  const registry = usePendingSaves();
  const getSnapshot = useCallback(
    () => registry.getSessions().get(id),
    [registry, id],
  );
  return useSyncExternalStore(registry.subscribe, getSnapshot, () => undefined);
}

// Every open session, for live titles in the sidebar list.
export function useSessions(): ReadonlyMap<string, Session> {
  const registry = usePendingSaves();
  return useSyncExternalStore(
    registry.subscribe,
    registry.getSessions,
    registry.getSessions,
  );
}
