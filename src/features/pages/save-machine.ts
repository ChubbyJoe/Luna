import type { StoredBlock } from "./schemas";

// Spec 0004 "State transitions": one save session per page with unsaved edits.
// Everything here is pure; timers and network calls live in pending-saves.tsx.

export const SAVE_IDLE_MS = 1000;
export const SAVE_MAX_WAIT_MS = 5000;

export type SaveState =
  "saved" | "dirty" | "saving" | "retrying" | "failed" | "conflict" | "gone";

export type FailureKind = "passing" | "permanent" | "too_large";

export type StatusText = "" | "Saving…" | "Saved" | "Not saved";

export type Snapshot = { title: string; content: StoredBlock[] };

// The server's copy, read after a save matched no row.
export type ServerPage = Snapshot & { updatedAt: string };

// The fields one save sends; a field left out was not dirty.
export type Payload = { title?: string; content?: StoredBlock[] };

export type Session = {
  state: SaveState;
  failureKind: FailureKind | null;
  // The tab's latest title and body; the source of truth while a session exists.
  snapshot: Snapshot;
  // What the server holds as of `base`.
  saved: Snapshot;
  // The exact `updated_at` string last seen from the server.
  base: string;
  titleDirty: boolean;
  contentDirty: boolean;
  inFlight: Payload | null;
  // Consecutive failures in the current streak.
  failures: number;
  // Set once per streak when a failure came from a signed out session.
  signedOutNotified: boolean;
  // The newer version another tab saved (conflict only).
  server: ServerPage | null;
  status: StatusText;
};

export type SaveEvent =
  | { type: "edit"; title?: string; content?: StoredBlock[] }
  | { type: "send"; force?: boolean }
  | { type: "succeeded"; updatedAt: string }
  | { type: "failed"; kind: FailureKind; signedOut?: boolean }
  | { type: "checked"; row: ServerPage | null }
  | { type: "loadNewer" }
  | { type: "keepMine" };

export function createSession(origin: ServerPage): Session {
  const snapshot = { title: origin.title, content: origin.content };
  return {
    state: "saved",
    failureKind: null,
    snapshot,
    saved: snapshot,
    base: origin.updatedAt,
    titleDirty: false,
    contentDirty: false,
    inFlight: null,
    failures: 0,
    signedOutNotified: false,
    server: null,
    status: "",
  };
}

function statusFor(state: SaveState, previous: StatusText): StatusText {
  switch (state) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "dirty":
      // Keep what was shown, so the status does not flicker per keystroke.
      return previous;
    default:
      return "Not saved";
  }
}

function withState(session: Session, state: SaveState): Session {
  return { ...session, state, status: statusFor(state, session.status) };
}

export function isDirty(session: Session): boolean {
  return session.titleDirty || session.contentDirty;
}

// Order independent structural equality for JSON values.
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => jsonEqual(item, b[i]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = Object.keys(aRecord).filter((key) => aRecord[key] !== undefined);
  const bKeys = Object.keys(bRecord).filter(
    (key) => bRecord[key] !== undefined,
  );
  return (
    keys.length === bKeys.length &&
    keys.every((key) => jsonEqual(aRecord[key], bRecord[key]))
  );
}

function applyEdit(
  session: Session,
  event: Extract<SaveEvent, { type: "edit" }>,
): Session {
  const snapshot = {
    title: event.title ?? session.snapshot.title,
    content: event.content ?? session.snapshot.content,
  };
  return {
    ...session,
    snapshot,
    titleDirty: snapshot.title !== session.saved.title,
    // Each editor change hands over a new document, so any content edit since
    // the last save counts; an identical resend is harmless.
    contentDirty:
      event.content !== undefined
        ? true
        : snapshot.content !== session.saved.content,
  };
}

function settle(session: Session, saved: Snapshot, updatedAt: string): Session {
  const next: Session = {
    ...session,
    saved,
    base: updatedAt,
    inFlight: null,
    failures: 0,
    failureKind: null,
    signedOutNotified: false,
    server: null,
    // A field stays dirty only if it changed again while the save was out.
    titleDirty: session.snapshot.title !== saved.title,
    contentDirty: session.snapshot.content !== saved.content,
  };
  return withState(next, isDirty(next) ? "dirty" : "saved");
}

function sentVersion(session: Session): Snapshot {
  return {
    title: session.inFlight?.title ?? session.saved.title,
    content: session.inFlight?.content ?? session.saved.content,
  };
}

export function saveReducer(session: Session, event: SaveEvent): Session {
  switch (event.type) {
    case "edit": {
      const edited = applyEdit(session, event);
      if (session.state === "saved" || session.state === "failed") {
        if (!isDirty(edited)) return edited;
        return withState(
          { ...edited, failures: 0, failureKind: null },
          "dirty",
        );
      }
      // dirty, saving, retrying, conflict, gone: only the snapshot changes.
      return edited;
    }

    case "send": {
      const canSend =
        session.state === "dirty" ||
        session.state === "retrying" ||
        (event.force === true && session.state === "failed");
      if (!canSend) return session;
      if (!isDirty(session)) return withState(session, "saved");
      return withState(
        {
          ...session,
          inFlight: {
            title: session.titleDirty ? session.snapshot.title : undefined,
            content: session.contentDirty
              ? session.snapshot.content
              : undefined,
          },
        },
        "saving",
      );
    }

    case "succeeded": {
      if (session.state !== "saving") return session;
      return settle(session, sentVersion(session), event.updatedAt);
    }

    case "failed": {
      if (session.state !== "saving") return session;
      const next: Session = {
        ...session,
        inFlight: null,
        failures: session.failures + 1,
        failureKind: event.kind,
        signedOutNotified: session.signedOutNotified || !!event.signedOut,
      };
      return withState(next, event.kind === "passing" ? "retrying" : "failed");
    }

    case "checked": {
      if (session.state !== "saving") return session;
      if (event.row === null) {
        return withState({ ...session, inFlight: null }, "gone");
      }
      const sent = sentVersion(session);
      const landed =
        event.row.title === sent.title &&
        jsonEqual(event.row.content, sent.content);
      if (landed) return settle(session, sent, event.row.updatedAt);
      return withState(
        { ...session, inFlight: null, server: event.row },
        "conflict",
      );
    }

    case "loadNewer": {
      if (session.state !== "conflict" || !session.server) return session;
      const { updatedAt, ...version } = session.server;
      return withState(
        {
          ...session,
          snapshot: version,
          saved: version,
          base: updatedAt,
          titleDirty: false,
          contentDirty: false,
          failures: 0,
          failureKind: null,
          server: null,
        },
        "saved",
      );
    }

    case "keepMine": {
      if (session.state !== "conflict" || !session.server) return session;
      return withState(
        {
          ...session,
          base: session.server.updatedAt,
          // Saving over the newer version: send the whole page.
          saved: {
            title: session.server.title,
            content: session.server.content,
          },
          titleDirty: true,
          contentDirty: true,
          inFlight: { ...session.snapshot },
          server: null,
        },
        "saving",
      );
    }
  }
}

// Backoff after a passing failure: 2, 4, 8, 16, then every 30 seconds.
export function retryDelayMs(attempt: number): number {
  const delays = [2000, 4000, 8000, 16000];
  return delays[attempt - 1] ?? 30000;
}

export type SaveError = { code?: string | null; status?: number };

// Spec 0004 Value sourcing: the failure kind of a save or conflict check.
export function classifySaveError(error: SaveError): FailureKind {
  const { code, status = 0 } = error;
  if (code === "23514") return "too_large";
  if (!code) return "passing";
  if (status >= 500 || status === 408 || status === 429) return "passing";
  if (code === "PGRST301" || code === "42501") return "passing";
  return "permanent";
}

// Failures that may mean the session ended, worth checking for a sign out.
export function isAuthFailure(error: SaveError): boolean {
  return error.code === "PGRST301" || error.code === "42501";
}

// The leave warning, and sign out's "anything unsaved?" check.
export function hasUnsaved(session: Session): boolean {
  return session.state !== "saved";
}
