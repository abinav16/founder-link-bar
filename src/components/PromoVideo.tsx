import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import promo from "@/assets/startupbar-promo.mp4.asset.json";
import webPromo from "@/assets/startupbar-promo.webm.asset.json";
import poster from "@/assets/startupbar-promo-poster.jpg.asset.json";

function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function PromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(49.16);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); return; }
    if (video.ended) video.currentTime = 0;
    try { await video.play(); setStarted(true); setError(false); }
    catch { setError(true); }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
    } catch { /* Playback remains available when fullscreen is unsupported. */ }
  }

  return (
    <section aria-label="StartupBar promo" className="bg-card px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <span className="promo-brand-mark" aria-hidden="true" /> StartupBar, in motion.
          </div>
          <span className="font-mono text-xs text-muted-foreground">00:49</span>
        </div>
        <div ref={frameRef} className="promo-player">
          <div className="promo-screen">
            <video
              ref={videoRef} poster={poster.url} preload="none" playsInline muted={muted}
              aria-label="StartupBar promotional video"
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onError={() => setError(true)}
              onClick={() => void togglePlayback()}
            >
              <source src={webPromo.url} type="video/webm" />
              <source src={promo.url} type="video/mp4" />
            </video>
            {!playing && (
              <Button variant="ghost" className="promo-play" aria-label={started ? "Resume promo video" : "Play promo video"} onClick={() => void togglePlayback()}>
                <Play fill="currentColor" /><span>{started ? "Continue watching" : "Watch the film"}</span>
              </Button>
            )}
          </div>
          <div className="promo-controls">
            <Button variant="ghost" size="icon" className="promo-control" title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause promo video" : "Play promo video"} onClick={() => void togglePlayback()}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <span className="promo-time">{timestamp(time)}</span>
            <input aria-label="Video progress" className="promo-seek" type="range" min={0} max={duration} step={0.1} value={time}
              onChange={(event) => { const next = Number(event.target.value); if (videoRef.current) videoRef.current.currentTime = next; setTime(next); }} />
            <span className="promo-time">{timestamp(duration)}</span>
            <Button variant="ghost" size="icon" className="promo-control hidden sm:inline-flex" title="Restart" aria-label="Restart promo video" onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; setTime(0); }}><RotateCcw /></Button>
            <Button variant="ghost" size="icon" className="promo-control" title={muted ? "Unmute" : "Mute"} aria-label={muted ? "Unmute promo video" : "Mute promo video"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
            <Button variant="ghost" size="icon" className="promo-control" title={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
          </div>
          {error && <p role="status" className="px-4 pb-3 text-sm text-muted-foreground">Video couldn’t load. Please try playing it again.</p>}
        </div>
      </div>
    </section>
  );
}