import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { nicknameStatusQueryOptions } from "@/lib/platform.queries";

// Lightweight, anonymous "profile" stored only in this browser.
// Keeps the existing nickname + nickname-password flow, but remembers the
// last used values so authors don't have to retype them on every post/comment.
// This is a convenience (recommended, never forced) — no account/login.

const STORAGE_KEY = "sendev:identity";

export interface NicknameIdentity {
  author: string;
  nicknamePassword: string;
}

function readIdentity(): NicknameIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NicknameIdentity>;
    const author = (parsed.author ?? "").trim();
    if (!author) return null;
    return { author, nicknamePassword: parsed.nicknamePassword ?? "" };
  } catch {
    return null;
  }
}

function writeIdentity(identity: NicknameIdentity | null) {
  if (typeof window === "undefined") return;
  try {
    if (!identity || !identity.author.trim()) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    }
    // Notify same-tab listeners (storage event only fires across tabs).
    window.dispatchEvent(new Event("sendev:identity-changed"));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// Reads/saves the stored identity. Used by the menu setup dialog.
export function useStoredIdentity() {
  const [identity, setIdentity] = useState<NicknameIdentity | null>(null);

  useEffect(() => {
    setIdentity(readIdentity());
    const sync = () => setIdentity(readIdentity());
    window.addEventListener("sendev:identity-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sendev:identity-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((author: string, nicknamePassword: string) => {
    const next = { author: author.trim(), nicknamePassword };
    writeIdentity(next);
    setIdentity(next.author ? next : null);
  }, []);

  const clear = useCallback(() => {
    writeIdentity(null);
    setIdentity(null);
  }, []);

  return { identity, save, clear };
}

// Manages the author + nickname-password fields for a post/comment form,
// auto-filling from the stored identity and persisting on successful submit.
export function useNicknameIdentity() {
  const [author, setAuthor] = useState("");
  const [nicknamePassword, setNicknamePassword] = useState("");
  const [hasStored, setHasStored] = useState(false);

  // Prefill once on mount (client-only) if the user hasn't typed yet.
  useEffect(() => {
    const stored = readIdentity();
    if (stored) {
      setHasStored(true);
      setAuthor((prev) => (prev ? prev : stored.author));
      setNicknamePassword((prev) => (prev ? prev : stored.nicknamePassword));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the current values as this browser's identity. Skips anonymous
  // (empty) names so "익명" posting never overwrites a saved nickname.
  const persistIdentity = useCallback(() => {
    const a = author.trim();
    if (!a) return;
    writeIdentity({ author: a, nicknamePassword });
  }, [author, nicknamePassword]);

  return {
    author,
    setAuthor,
    nicknamePassword,
    setNicknamePassword,
    hasStored,
    persistIdentity,
  };
}
