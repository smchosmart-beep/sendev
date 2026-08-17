import { useEffect, useId, useRef, useState } from "react";

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let renderCounter = 0;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: isDark ? "dark" : "default",
        fontFamily: "inherit",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

interface MermaidBlockProps {
  code: string;
}

/**
 * Client-only mermaid renderer. The library is loaded lazily inside an effect
 * so it never runs during SSR and never lands in other pages' bundles.
 */
export function MermaidBlock({ code }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const token = ++latest.current;
    const timer = setTimeout(() => {
      loadMermaid()
        .then((mermaid) =>
          mermaid.render(`mmd-${baseId}-${renderCounter++}`, code),
        )
        .then(({ svg: rendered }) => {
          if (cancelled || token !== latest.current) return;
          setSvg(rendered);
          setFailed(false);
        })
        .catch(() => {
          if (cancelled || token !== latest.current) return;
          setFailed(true);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, baseId]);

  if (failed || (!svg && typeof window === "undefined")) {
    return (
      <pre className="overflow-auto rounded-xl bg-muted p-4 text-xs">
        <code>{code}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        흐름도를 그리는 중…
      </div>
    );
  }

  return (
    <div
      className="not-prose flex justify-center overflow-auto rounded-xl border border-border bg-background p-4"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
