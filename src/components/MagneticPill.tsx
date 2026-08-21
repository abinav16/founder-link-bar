import { useEffect, useMemo, useRef, type ReactNode } from "react";

export type OrbitItem = { id: string; logoUrl: string };

export function MagneticPill({ items, overlay, className }: { items: OrbitItem[]; overlay?: ReactNode; className?: string }) {
  const startups = items;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<{ x: number; y: number; vx: number; vy: number; angle: number; av: number; homeY: number; size: number; snapped: boolean; snapCooldown: number; resting: boolean; sleepT: number; asleep: boolean }[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const startupKey = useMemo(() => startups.map(s => s.id).join(","), [startups]);

  const GRAVITY = 0.5;
  const GROUND_FRICTION = 0.84;
  const AIR_DAMPING = 0.93;
  const ATTRACT_K = 0.012;
  const ATTRACT_RADIUS = 260;
  const MAX_THREAD = 220;
  const SNAP_COOLDOWN = 80;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || startups.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width: w, height: h } = container.getBoundingClientRect();
    sizeRef.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const NODE_SIZE = w < 500 ? 26 : 38;
    const n = startups.length;

    nodeRefs.current.forEach(el => {
      if (!el) return;
      el.style.width = `${NODE_SIZE}px`;
      el.style.height = `${NODE_SIZE}px`;
      const inner = el.firstElementChild as HTMLElement;
      if (inner) { inner.style.width = `${NODE_SIZE}px`; inner.style.height = `${NODE_SIZE}px`; }
    });

    const logoR = NODE_SIZE / 2 + 3;
    const pillR = h / 2;
    const homeY = h - logoR - 2;

    const nodes = startups.map(() => {
      const x = logoR + Math.random() * (w - 2 * logoR);
      const y = logoR + Math.random() * (h * 0.35);
      const vx = (Math.random() - 0.5) * 1.5;
      return { x, y, vx, vy: 0, angle: 0, av: 0, homeY, size: NODE_SIZE, snapped: false, snapCooldown: 0, resting: false, sleepT: 0, asleep: false };
    });
    stateRef.current = nodes;

    nodes.forEach((node, i) => {
      const el = nodeRefs.current[i];
      if (el) el.style.transform = `translate(${node.x - node.size / 2}px, ${node.y - node.size / 2}px) rotate(0rad)`;
    });

    let lastT = performance.now();
    function tick(now: number) {
      // dt in units of "60fps frames"; clamp so a stalled tab doesn't teleport nodes.
      const dt = Math.min(Math.max((now - lastT) / 16.6667, 0.5), 3);
      lastT = now;
      const mouse = mouseRef.current;
      const nodes = stateRef.current;

      ctx.clearRect(0, 0, w, h);
      const mouseActive = mouse.x > 0 && mouse.x < w && mouse.y > 0 && mouse.y < h;
      const { w: sw, h: sh } = sizeRef.current;
      const pillR = sh / 2;

      // ---- 1. wake bodies the cursor comes near ----
      if (mouseActive) {
        nodes.forEach((node) => {
          const dx = mouse.x - node.x, dy = mouse.y - node.y;
          if (dx * dx + dy * dy < ATTRACT_RADIUS * ATTRACT_RADIUS) { node.asleep = false; node.sleepT = 0; }
        });
      }

      // ---- 2. integrate forces ----
      nodes.forEach((node) => {
        if (node.asleep) return;
        const r = node.size / 2;

        if (node.snapped) {
          node.snapCooldown -= dt;
          if (node.snapCooldown <= 0) node.snapped = false;
        }

        if (mouseActive && !node.snapped) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < ATTRACT_RADIUS) {
            const force = ATTRACT_K * dist * dt;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
            if (dist > MAX_THREAD) {
              node.snapped = true;
              node.snapCooldown = SNAP_COOLDOWN;
              node.vx -= (dx / dist) * 6;
              node.vy -= (dy / dist) * 6;
            }
          }
        }

        node.vy += GRAVITY * dt;
        node.vx *= Math.pow(AIR_DAMPING, dt);
        node.vy *= Math.pow(AIR_DAMPING, dt);
        node.av *= Math.pow(0.98, dt);
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        void r;
      });

      // ---- 3. boundary constraints (floor, ceiling, rounded pill ends) ----
      function solveBounds(node: typeof nodes[number]) {
        const r = node.size / 2;
        const margin = r + r;

        if (node.y > node.homeY) {
          node.y = node.homeY;
          if (node.vy > 0) node.vy = 0;
        }
        if (node.y < margin) { node.y = margin; if (node.vy < 0) node.vy = Math.abs(node.vy) * 0.5; node.av *= -0.5; }

        if (node.x < pillR) {
          const cdx = node.x - pillR, cdy = node.y - sh / 2;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > pillR - margin) {
            const nx = cdx / cd, ny = cdy / cd;
            node.x = pillR + nx * (pillR - margin);
            node.y = sh / 2 + ny * (pillR - margin);
            const dot = node.vx * nx + node.vy * ny;
            if (dot > 0) { node.vx -= dot * nx * 1.2; node.vy -= dot * ny * 1.2; }
            node.av = -node.vx / r;
          }
        } else if (node.x > sw - pillR) {
          const cdx = node.x - (sw - pillR), cdy = node.y - sh / 2;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
          if (cd > pillR - margin) {
            const nx = cdx / cd, ny = cdy / cd;
            node.x = (sw - pillR) + nx * (pillR - margin);
            node.y = sh / 2 + ny * (pillR - margin);
            const dot = node.vx * nx + node.vy * ny;
            if (dot > 0) { node.vx -= dot * nx * 1.2; node.vy -= dot * ny * 1.2; }
            node.av = -node.vx / r;
          }
        }
      }

      nodes.forEach(solveBounds);

      // ---- 4. iterative soft separation with penetration slop ----
      const SLOP = 0.5;
      const CORRECTION = 0.65;
      const ITER = 4;
      const contacts: { nx: number; ny: number; other: number }[][] = nodes.map(() => []);
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const minDist = (a.size + b.size) / 2 + 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            if (dist >= minDist) continue;

            const nx = dx / dist, ny = dy / dist;
            const penetration = minDist - dist;

            // contact bookkeeping: y grows downward, so ny > 0 means b sits below a → b may support a
            if (it === 0) {
              if (ny > 0.35) contacts[i].push({ nx, ny, other: j });
              if (ny < -0.35) contacts[j].push({ nx: -nx, ny: -ny, other: i });
            }


            if (penetration > SLOP) {
              const total = (penetration - SLOP) * CORRECTION;
              const aFree = !a.asleep, bFree = !b.asleep;
              if (aFree && bFree) {
                a.x -= nx * total * 0.5; a.y -= ny * total * 0.5;
                b.x += nx * total * 0.5; b.y += ny * total * 0.5;
              } else if (aFree) {
                a.x -= nx * total; a.y -= ny * total;
              } else if (bFree) {
                b.x += nx * total; b.y += ny * total;
              }
            }


            if (it === 0) {
              const dot = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dot > 0) {
                if (!a.asleep) { a.vx -= dot * nx * 0.45; a.vy -= dot * ny * 0.45; }
                if (!b.asleep) { b.vx += dot * nx * 0.45; b.vy += dot * ny * 0.45; }
                if (dot > 0.6) { a.asleep = false; b.asleep = false; a.sleepT = 0; b.sleepT = 0; }
              }
            }
          }
        }
        nodes.forEach(solveBounds);
      }

      // ---- 5. support chain: only bodies whose support traces down to the floor can rest ----
      const onFloorArr = nodes.map((node) => node.y >= node.homeY - 0.75);
      const grounded = onFloorArr.slice();
      for (let pass = 0; pass < 6; pass++) {
        let changed = false;
        for (let i = 0; i < nodes.length; i++) {
          if (grounded[i]) continue;
          const cs = contacts[i].filter((c) => grounded[c.other]);
          if (cs.length === 0) continue;
          // stable if propped from almost directly below, or wedged between two supports
          const steep = cs.some((c) => c.ny > 0.88);
          const wedged = cs.some((c) => c.nx > 0.15) && cs.some((c) => c.nx < -0.15);
          if (steep || wedged) { grounded[i] = true; changed = true; }
        }
        if (!changed) break;
      }

      // ---- 6. friction, rolling, sleep ----
      nodes.forEach((node, i) => {
        const r = node.size / 2;
        node.resting = grounded[i];

        if (node.resting) {
          if (node.vy > 0) node.vy = 0;
          node.av = node.vx / r;
          node.vx *= Math.pow(GROUND_FRICTION, dt);
          if (Math.abs(node.vx) < 0.03) { node.vx = 0; node.av = 0; }
        } else {
          // unsupported or perched on a slope: let gravity keep working, roll off naturally
          node.av += (node.vx / r - node.av) * 0.1 * dt;
        }

        node.angle += node.av * dt;

        const speed = Math.abs(node.vx) + Math.abs(node.vy);
        if (node.resting && speed < 0.05 && !node.snapped) {
          node.sleepT += dt;
          if (node.sleepT > 20) { node.asleep = true; node.vx = 0; node.vy = 0; node.av = 0; }
        } else {
          node.sleepT = 0;
          node.asleep = false;
        }

      });


      // ---- 6. cursor threads ----
      if (mouseActive) {
        nodes.forEach((node) => {
          if (node.snapped) return;
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > ATTRACT_RADIUS) return;

          const stretch = Math.min(dist / MAX_THREAD, 1);
          const alpha = 0.88 * (1 - stretch * 0.6);

          const sag = dist * 0.12;
          const mx = (node.x + mouse.x) / 2;
          const my = (node.y + mouse.y) / 2 + sag;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.quadraticCurveTo(mx, my, mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        });
      }

      nodes.forEach((node, i) => {
        const el = nodeRefs.current[i];
        if (el) el.style.transform = `translate(${(node.x - node.size / 2).toFixed(2)}px, ${(node.y - node.size / 2).toFixed(2)}px) rotate(${node.angle.toFixed(4)}rad)`;
      });


      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      if (!container || !canvas) return;
      const { width: nw, height: nh } = container.getBoundingClientRect();
      canvas.width = Math.round(nw * dpr);
      canvas.height = Math.round(nh * dpr);
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: nw, h: nh };
      // layout changed: refresh the floor and wake every body so the pile re-settles
      stateRef.current.forEach((node) => {
        node.homeY = nh - (node.size / 2 + 3) - 2;
        node.asleep = false;
        node.sleepT = 0;
      });

    });

    ro.observe(container);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [startupKey]);

  function onMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { mouseRef.current = { x: -9999, y: -9999 }; }}
      className={`relative overflow-hidden select-none h-[160px] sm:h-[220px] ${className ?? ""}`}
      style={{ background: "#09090b", borderRadius: 9999, transform: "translateZ(0)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />

      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        zIndex: 2,
      }} />

      <div className="absolute bottom-0 inset-x-0" style={{ height: 48, background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", zIndex: 3 }} />
      <div className="absolute bottom-[16px] inset-x-8" style={{ height: 1, background: "rgba(255,255,255,0.06)", zIndex: 3 }} />

      {overlay}

      {startups.map((s, i) => {
        const imgUrl = s.logoUrl;
        return (
          <div
            key={s.id}
            ref={el => { nodeRefs.current[i] = el; }}
            className="absolute top-0 left-0"
            style={{ width: 38, height: 38, zIndex: 5 }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                background: `white url(${imgUrl}) center/cover no-repeat`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
