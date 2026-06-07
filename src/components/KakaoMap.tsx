import { useEffect, useRef, useState } from "react";

const KAKAO_JS_KEY = "7a8e2e91477f8b284dfd90224fd2740d";

let kakaoLoader: Promise<any> | null = null;

function loadKakao(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.kakao && w.kakao.maps) return Promise.resolve(w.kakao);
  if (kakaoLoader) return kakaoLoader;

  kakaoLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    const onReady = () => {
      const kw = (window as any).kakao;
      kw.maps.load(() => resolve(kw));
    };
    if (existing) {
      if ((window as any).kakao?.maps) onReady();
      else existing.addEventListener("load", onReady);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-maps-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    script.addEventListener("load", onReady);
    script.addEventListener("error", reject);
    document.head.appendChild(script);
  });
  return kakaoLoader;
}

interface KakaoMapProps {
  lat: number;
  lng: number;
  /** Marker/info label */
  name?: string;
  className?: string;
  /** Map zoom level (kakao scale: smaller = closer). Default 3 */
  level?: number;
  /** Wrap the map in a link to Kakao Map. Disable when nested inside another link. */
  asLink?: boolean;
}

export function KakaoMap({ lat, lng, name, className, level = 3, asLink = true }: KakaoMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !ref.current) return;
        const center = new kakao.maps.LatLng(lat, lng);
        const map = new kakao.maps.Map(ref.current, { center, level });
        const marker = new kakao.maps.Marker({ position: center });
        marker.setMap(map);
        if (name) {
          const info = new kakao.maps.InfoWindow({
            content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${name}</div>`,
          });
          info.open(map, marker);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, name, level]);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg bg-muted text-muted-foreground ${className ?? ""}`}
      >
        <MapPin className="h-6 w-6 opacity-50" />
        <span className="text-xs">지도를 불러올 수 없어요</span>
      </div>
    );
  }

  if (!asLink) {
    return <div ref={ref} className={className} />;
  }

  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(
    name || "장소",
  )},${lat},${lng}`;

  return (
    <a href={kakaoUrl} target="_blank" rel="noreferrer" className="block">
      <div ref={ref} className={className} />
    </a>
  );
}
