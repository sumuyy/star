/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Compass, Mountain, ShieldAlert, ShieldCheck, Waves } from "lucide-react";
import { LAYER0_NODES, WORLDBOOK_NAME, getLayer0Node, getStarSystem } from "../starMap";
import type { DangerLevel, SpaceTime, StarMapNode, StarSystem, SystemBody, SystemStatusEntry, WorldbookRef } from "../types";

interface TopologyMapProps {
  spaceTime: SpaceTime;
  systemStatuses: SystemStatusEntry[];
}

interface Point {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  startAngle: number;
  startRotation: number;
  startPoint: Point;
  hasMoved: boolean;
}

interface WorldbookEntryLike {
  name: string;
  content?: string;
}

declare function getWorldbook(worldbookName: string): Promise<WorldbookEntryLike[]>;

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 520;
const MAP_CENTER = { x: 260, y: 260 };
const ORBIT_RADIUS = 160;
const INITIAL_ROTATION_DEG = 0;
const RESET_ROTATION_DEG = 0;
const DRAG_THRESHOLD = 4;

const SYSTEM_CODE_TO_KEY: Record<string, string> = {
  T: "T星系",
  F: "F星系",
  N: "N星系",
  R: "R星系",
  S: "S星系",
  G: "G星系",
};

const TAG_COLORS: Record<string, string> = {
  "[NORMAL]": "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  "[ALERT]": "text-amber-400 border-amber-500/30 bg-amber-500/10",
  "[ANOMALY]": "text-rose-400 border-rose-500/30 bg-rose-500/10",
  "[OFFLINE]": "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

const DANGER_COLORS: Record<DangerLevel, string> = {
  LOW: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  MED: "text-sky-400 border-sky-500/30 bg-sky-500/5",
  HIGH: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  CRITICAL: "text-rose-400 border-rose-500/30 bg-rose-500/5",
};

const ORBIT_RADII: Record<SystemBody["orbit"], number> = {
  core: 0,
  inner: 82,
  mid: 118,
  outer: 148,
  edge: 178,
};

const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

const getDangerStroke = (danger: DangerLevel) => {
  if (danger === "LOW") return "#10b981";
  if (danger === "MED") return "#38bdf8";
  if (danger === "HIGH") return "#f59e0b";
  return "#f43f5e";
};

const getDangerFill = (danger: DangerLevel) => {
  if (danger === "LOW") return "#064e3b";
  if (danger === "MED") return "#0369a1";
  if (danger === "HIGH") return "#78350f";
  return "#9f1239";
};

const getBodyRadius = (body: SystemBody) => {
  if (body.kind === "star") return 12;
  if (body.kind === "blackmarket") return 7;
  if (body.kind === "asteroid") return 6;
  if (body.kind === "debris") return 5;
  return body.orbit === "inner" ? 8 : 7;
};

const formatLayer0Coord = (node: StarMapNode) => {
  if (node.isOrigin) return "HOTUS-ORIGIN @ 0,0";
  if (node.kind === "rogue") return "ROGUE / 边缘星球";
  return "SYSTEM / 联邦星图投影节点";
};

const getWorldbookText = (entries: WorldbookEntryLike[] | undefined, ref: WorldbookRef | undefined) => {
  if (!entries || !ref) return undefined;
  return entries.find(entry => entry.name === ref.entry)?.content?.trim();
};

export default function TopologyMap({ spaceTime, systemStatuses }: TopologyMapProps) {
  const [selectedNodeId, setSelectedNodeId] = useState("T");
  const [activeSystemId, setActiveSystemId] = useState<StarSystem["id"] | null>(null);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(INITIAL_ROTATION_DEG);
  const [systemRotationDeg, setSystemRotationDeg] = useState(0);
  const [worldbookEntries, setWorldbookEntries] = useState<Record<string, WorldbookEntryLike[]>>({});
  const [loadingWorldbook, setLoadingWorldbook] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const activeSystem = activeSystemId ? getStarSystem(activeSystemId) : undefined;
  const selectedNode = getLayer0Node(selectedNodeId) ?? LAYER0_NODES[0];
  const systemBodies = activeSystem ? [activeSystem.star, ...activeSystem.bodies] : [];
  const selectedBody = activeSystem
    ? systemBodies.find(body => body.id === selectedBodyId) ?? activeSystem.star
    : undefined;

  const currentRotation = activeSystem ? systemRotationDeg : rotationDeg;
  const selectedWorldbook = selectedBody?.worldbook ?? selectedNode.worldbook;
  const selectedBookName = selectedWorldbook?.book ?? WORLDBOOK_NAME;
  const selectedWorldbookContent = getWorldbookText(worldbookEntries[selectedBookName], selectedWorldbook);

  const statusByCode = useMemo(() => {
    const statusMap: Record<string, SystemStatusEntry | undefined> = {};
    for (const code of Object.keys(SYSTEM_CODE_TO_KEY)) {
      statusMap[code] = systemStatuses.find(s => s.id === SYSTEM_CODE_TO_KEY[code]);
    }
    return statusMap;
  }, [systemStatuses]);

  const selectedStatus = activeSystem ? statusByCode[activeSystem.id] : selectedNode.systemId ? statusByCode[selectedNode.systemId] : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!selectedWorldbook || worldbookEntries[selectedBookName]) {
      return;
    }
    if (typeof getWorldbook !== "function") {
      return;
    }

    setLoadingWorldbook(true);
    getWorldbook(selectedBookName)
      .then(entries => {
        if (!cancelled) {
          setWorldbookEntries(prev => ({ ...prev, [selectedBookName]: entries }));
        }
      })
      .catch(error => {
        console.warn("⚠️ [star TopologyMap] 读取世界书失败，使用静态摘要:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingWorldbook(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBookName, selectedWorldbook, worldbookEntries]);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
    }, 1200);
  };

  const getLayer0Position = (node: StarMapNode): Point => {
    if (node.isOrigin || node.angleDeg === undefined) {
      return MAP_CENTER;
    }

    const theta = ((node.angleDeg + rotationDeg) * Math.PI) / 180;
    const radius = node.radius ?? ORBIT_RADIUS;
    return {
      x: MAP_CENTER.x + radius * Math.cos(theta),
      y: MAP_CENTER.y - radius * Math.sin(theta),
    };
  };

  const getBodyPosition = (body: SystemBody, index: number): Point => {
    if (body.kind === "star" || body.orbit === "core") {
      return MAP_CENTER;
    }

    const bodyIndex = Math.max(index - 1, 0);
    const angle = body.angleDeg ?? 25 + bodyIndex * (360 / Math.max(activeSystem?.bodies.length ?? 1, 1));
    const theta = ((angle + systemRotationDeg) * Math.PI) / 180;
    const radius = ORBIT_RADII[body.orbit];
    return {
      x: MAP_CENTER.x + radius * Math.cos(theta),
      y: MAP_CENTER.y - radius * Math.sin(theta),
    };
  };

  const getPointerPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
  };

  const getPointAngle = (point: Point) => Math.atan2(MAP_CENTER.y - point.y, point.x - MAP_CENTER.x) * (180 / Math.PI);

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = getPointerPoint(event);
    dragRef.current = {
      pointerId: event.pointerId,
      startAngle: getPointAngle(point),
      startRotation: currentRotation,
      startPoint: point,
      hasMoved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const point = getPointerPoint(event);
    const distance = Math.hypot(point.x - drag.startPoint.x, point.y - drag.startPoint.y);
    if (distance > DRAG_THRESHOLD) {
      drag.hasMoved = true;
      suppressClickRef.current = true;
    }

    if (drag.hasMoved) {
      const nextRotation = normalizeDeg(drag.startRotation + getPointAngle(point) - drag.startAngle);
      if (activeSystem) {
        setSystemRotationDeg(nextRotation);
      } else {
        setRotationDeg(nextRotation);
      }
    }
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current = null;
    }
  };

  const handleNodeClick = (node: StarMapNode) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    setSelectedNodeId(node.id);
    if (node.systemId) {
      const nextSystem = getStarSystem(node.systemId);
      if (nextSystem) {
        setActiveSystemId(nextSystem.id);
        setSelectedBodyId(nextSystem.star.id);
      }
    } else {
      setActiveSystemId(null);
      setSelectedBodyId(null);
    }
  };

  const handleBodyClick = (body: SystemBody) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedBodyId(body.id);
  };

  const handleBackToLayer0 = () => {
    setActiveSystemId(null);
    setSelectedBodyId(null);
  };

  const handleResetBearing = () => {
    if (activeSystem) {
      setSystemRotationDeg(0);
    } else {
      setRotationDeg(RESET_ROTATION_DEG);
    }
  };

  const renderLayer0 = () => {
    const visibleNodes = LAYER0_NODES.filter(node => node.kind !== "rogue");

    return (
      <>
        <g opacity="0.16" stroke="#475569" strokeWidth="0.5" fill="none">
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r="60" />
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r={ORBIT_RADIUS} />
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r="190" strokeDasharray="4,8" />
          <line x1="0" y1={MAP_CENTER.y} x2={VIEW_WIDTH} y2={MAP_CENTER.y} />
          <line x1={MAP_CENTER.x} y1="0" x2={MAP_CENTER.x} y2={VIEW_HEIGHT} />
        </g>

        <g>
          {visibleNodes.filter(node => node.danger === "CRITICAL" || node.danger === "HIGH" || node.isOrigin).map(node => {
          const pos = getLayer0Position(node);
          return (
            <circle
              key={`${node.id}-pulse`}
              cx={pos.x}
              cy={pos.y}
              r={node.isOrigin ? 26 : node.kind === "rogue" ? 17 : 20}
              fill="none"
              stroke={node.danger === "CRITICAL" ? "#B71C1C" : node.isOrigin ? "#818cf8" : "#f59e0b"}
              strokeWidth="0.5"
              className={node.danger === "CRITICAL" ? "animate-ping" : "animate-pulse"}
              opacity={node.isOrigin ? "0.22" : "0.28"}
            />
          );
        })}
      </g>

        {visibleNodes.map(node => {
          const isSelected = selectedNode.id === node.id && !activeSystem;
        const pos = getLayer0Position(node);
        const isOrigin = Boolean(node.isOrigin);
        const isRogue = node.kind === "rogue";
        const sysStatus = node.systemId ? statusByCode[node.systemId] : undefined;
        const ringColor = isOrigin ? "#818cf8" : getDangerStroke(node.danger);
        const dotColor = isOrigin ? "#312e81" : getDangerFill(node.danger);
        let statusTagFill: string | null = null;
        if (sysStatus?.tag === "[ANOMALY]") statusTagFill = "#f43f5e";
        else if (sysStatus?.tag === "[ALERT]") statusTagFill = "#f59e0b";
        else if (sysStatus?.tag === "[OFFLINE]") statusTagFill = "#64748b";
        else if (sysStatus?.tag === "[NORMAL]") statusTagFill = "#10b981";

        const orbitR = isOrigin ? 22 : isRogue ? 16 : 18;
        return (
          <g key={node.id} onClick={() => handleNodeClick(node)} className="cursor-pointer group">
            {isSelected && (
              <g>
                {/* 静态轨道虚线 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={orbitR}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="0.6"
                  strokeDasharray="2,4"
                  opacity="0.35"
                />
                {/* 卫星(小亮点)绕节点转 */}
                <circle cx={pos.x + orbitR} cy={pos.y} r="2.6" fill="#a5b4fc">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${pos.x} ${pos.y}`}
                    to={`360 ${pos.x} ${pos.y}`}
                    dur="3.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}
            {isRogue ? (
              <rect
                x={pos.x - 8}
                y={pos.y - 8}
                width="16"
                height="16"
                rx="3"
                fill={dotColor}
                stroke={ringColor}
                strokeWidth="1.2"
                opacity="0.78"
                className="transition-all group-hover:opacity-100"
                transform={`rotate(45 ${pos.x} ${pos.y})`}
              />
            ) : (
              <circle cx={pos.x} cy={pos.y} r={isOrigin ? "13" : "10"} fill={dotColor} opacity="0.68" className="transition-all group-hover:opacity-100" />
            )}
            <circle cx={pos.x} cy={pos.y} r={isOrigin ? "7" : isRogue ? "4" : "5"} fill={isSelected ? "#ffffff" : ringColor} className="transition-all group-hover:scale-125" />
            <text
              x={pos.x}
              y={pos.y - (isOrigin ? 22 : 16)}
              textAnchor="middle"
              fill={isSelected ? "#ffffff" : isRogue ? "#c4b5fd" : "#94a3b8"}
              fontSize={isOrigin ? "12" : isRogue ? "10" : "11"}
              fontFamily="monospace"
              className="select-none font-semibold transition-all group-hover:fill-white drop-shadow-md"
            >
              {node.label}
            </text>
            <text
              x={pos.x}
              y={pos.y + (isOrigin ? 28 : 24)}
              textAnchor="middle"
              fill={statusTagFill || (isRogue ? "#8b5cf6" : "#64748b")}
              fontSize="9"
              fontFamily="monospace"
              className="select-none drop-shadow-md"
            >
              {sysStatus ? `${sysStatus.tag} ${sysStatus.syncRate}%` : isOrigin ? "ORIGIN" : node.systemId ? "SYSTEM" : "HIDDEN"}
            </text>
            {node.danger === "CRITICAL" && (
              <path d={`M ${pos.x + 8} ${pos.y + 2} L ${pos.x + 14} ${pos.y - 4} L ${pos.x + 20} ${pos.y + 2} Z`} fill="#ef4444" />
            )}
          </g>
        );
        })}
      </>
    );
  };

  const renderLayer1 = (system: StarSystem) => {
    const bodies = [system.star, ...system.bodies];
    const positions = new Map<string, Point>();
    bodies.forEach((body, index) => positions.set(body.id, getBodyPosition(body, index)));

    return (
      <>
        <g opacity="0.18" stroke="#475569" strokeWidth="0.5" fill="none">
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r={ORBIT_RADII.inner} />
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r={ORBIT_RADII.mid} strokeDasharray="4,7" />
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r={ORBIT_RADII.outer} />
          <circle cx={MAP_CENTER.x} cy={MAP_CENTER.y} r={ORBIT_RADII.edge} strokeDasharray="3,8" />
          <line x1="0" y1={MAP_CENTER.y} x2={VIEW_WIDTH} y2={MAP_CENTER.y} />
          <line x1={MAP_CENTER.x} y1="0" x2={MAP_CENTER.x} y2={VIEW_HEIGHT} />
        </g>

        <g opacity={scanning ? "0.8" : "0.45"}>
          {system.bodies.map(body => {
            const pos = positions.get(body.id);
            if (!pos) return null;
            return (
              <line
                key={`${system.star.id}-${body.id}`}
                x1={MAP_CENTER.x}
                y1={MAP_CENTER.y}
                x2={pos.x}
                y2={pos.y}
                stroke={body.kind === "blackmarket" ? "#7c3aed" : "#334155"}
                strokeDasharray={body.kind === "blackmarket" || body.orbit === "edge" ? "3,7" : "4,5"}
                strokeWidth="0.8"
                className={scanning ? "animate-pulse" : undefined}
              />
            );
          })}
          {system.bodies.map(body => {
            if (!body.twinOf) return null;
            const from = positions.get(body.id);
            const to = positions.get(body.twinOf);
            if (!from || !to || body.id > body.twinOf) return null;
            return (
              <line
                key={`${body.id}-${body.twinOf}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#a78bfa"
                strokeDasharray="2,4"
                strokeWidth="1.2"
              />
            );
          })}
        </g>

        <g>
          {bodies.filter(body => body.danger === "CRITICAL" || body.danger === "HIGH" || body.kind === "star").map(body => {
            const pos = positions.get(body.id);
            if (!pos) return null;
            return (
              <circle
                key={`${body.id}-pulse`}
                cx={pos.x}
                cy={pos.y}
                r={body.kind === "star" ? 30 : 20}
                fill="none"
                stroke={body.kind === "star" ? "#facc15" : body.danger === "CRITICAL" ? "#B71C1C" : "#f59e0b"}
                strokeWidth="0.5"
                className={body.danger === "CRITICAL" ? "animate-ping" : "animate-pulse"}
                opacity={body.kind === "star" ? "0.22" : "0.28"}
              />
            );
          })}
        </g>

        {bodies.map((body, index) => {
          const pos = positions.get(body.id) ?? MAP_CENTER;
          const isSelected = selectedBody?.id === body.id;
          const ringColor = body.kind === "star" ? "#facc15" : getDangerStroke(body.danger);
          const dotColor = body.kind === "star" ? "#713f12" : getDangerFill(body.danger);
          const radius = getBodyRadius(body);
          const label = body.redacted ? "????" : body.label;

          const orbitR = radius + 9;
          return (
            <g key={body.id} onClick={() => handleBodyClick(body)} className="cursor-pointer group">
              {isSelected && (
                <g>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={orbitR}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="0.6"
                    strokeDasharray="2,4"
                    opacity="0.35"
                  />
                  <circle cx={pos.x + orbitR} cy={pos.y} r="2.4" fill="#a5b4fc">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${pos.x} ${pos.y}`}
                      to={`360 ${pos.x} ${pos.y}`}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
              {body.kind === "debris" ? (
                <g stroke={ringColor} strokeWidth="1.2" fill="none" opacity="0.9">
                  <path d={`M ${pos.x - 12} ${pos.y + 4} C ${pos.x - 5} ${pos.y - 8}, ${pos.x + 5} ${pos.y + 10}, ${pos.x + 13} ${pos.y - 5}`} strokeDasharray="2,3" />
                  <circle cx={pos.x - 6} cy={pos.y + 2} r="2" fill={ringColor} />
                  <circle cx={pos.x + 5} cy={pos.y - 3} r="1.8" fill={ringColor} />
                  <circle cx={pos.x + 9} cy={pos.y + 5} r="1.5" fill={ringColor} />
                </g>
              ) : body.kind === "blackmarket" ? (
                <rect
                  x={pos.x - radius}
                  y={pos.y - radius}
                  width={radius * 2}
                  height={radius * 2}
                  rx="2"
                  fill="#2e1065"
                  stroke="#a78bfa"
                  strokeWidth="1.2"
                  transform={`rotate(45 ${pos.x} ${pos.y})`}
                  className="transition-all group-hover:opacity-100"
                />
              ) : (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={dotColor}
                  stroke={ringColor}
                  strokeWidth={body.redacted ? "1" : "1.2"}
                  strokeDasharray={body.redacted ? "3,3" : undefined}
                  opacity={body.nameStatus === "placeholder" ? "0.58" : "0.78"}
                  className="transition-all group-hover:opacity-100"
                />
              )}
              <circle cx={pos.x} cy={pos.y} r={body.kind === "star" ? "4" : "3"} fill={isSelected ? "#ffffff" : ringColor} />
              <text
                x={pos.x}
                y={pos.y - radius - 8}
                textAnchor="middle"
                fill={isSelected ? "#ffffff" : body.redacted ? "#64748b" : body.kind === "blackmarket" ? "#c4b5fd" : "#94a3b8"}
                fontSize={body.kind === "star" ? "12" : "10"}
                fontFamily="monospace"
                className="select-none font-semibold transition-all group-hover:fill-white drop-shadow-md"
              >
                {label}
              </text>
              <text
                x={pos.x}
                y={pos.y + radius + 13}
                textAnchor="middle"
                fill={body.nameStatus === "placeholder" ? "#64748b" : body.kind === "blackmarket" ? "#8b5cf6" : "#64748b"}
                fontSize="8"
                fontFamily="monospace"
                className="select-none drop-shadow-md"
              >
                {body.kind === "star" ? "STAR" : body.kind === "blackmarket" ? "BLACK" : body.orbit.toUpperCase()}
              </text>
              {index === 0 && (
                <circle cx={pos.x} cy={pos.y} r="18" fill="none" stroke="#facc15" strokeWidth="0.6" strokeDasharray="2,5" opacity="0.5" />
              )}
            </g>
          );
        })}
      </>
    );
  };

  const detailTitle = selectedBody ? `${activeSystem?.id} 星系 · ${selectedBody.redacted ? "????" : selectedBody.label}` : selectedNode.label;
  const detailSubtitle = selectedBody
    ? `${activeSystem?.nickname ?? "星系内部"} / ${selectedBody.kind.toUpperCase()} / ${selectedBody.orbit.toUpperCase()}`
    : selectedNode.kind === "rogue"
      ? "边缘星球 / 完全脱离恒星引力"
      : formatLayer0Coord(selectedNode);
  const detailDanger = selectedBody?.danger ?? selectedNode.danger;
  const detailSummary = selectedBody?.summary ?? selectedNode.summary;
  const detailText = selectedWorldbookContent || detailSummary;

  return (
    <div id="stellar-topology-card" className="flex flex-col h-full rounded-lg p-4 font-mono select-none relative overflow-hidden star-card">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/50 pointer-events-none" />

      <div className="border-b border-slate-800 pb-3 mb-4 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            <div>
              <h2 className="text-base font-semibold tracking-wider text-slate-100">
                {activeSystem ? `${activeSystem.id} 星系内部拓扑` : "联邦赫特斯原点星图"}
              </h2>
              <p className="text-[12px] text-slate-400">
                {activeSystem ? `${activeSystem.nickname.toUpperCase()} // LOCAL ORBIT MAP` : "FEDERATION HOTUS-ORIGIN GALAXY MAP"}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            {activeSystem && (
              <button
                id="map-back-layer0-button"
                onClick={handleBackToLayer0}
                className="text-[12px] px-2 py-0.5 rounded border border-slate-700/60 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                返回 L0
              </button>
            )}
            <span className="text-[12px] px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              {activeSystem ? `L1 // ROT ${Math.round(systemRotationDeg)}°` : `L0 // ${rotationDeg === RESET_ROTATION_DEG ? "F-T 0°" : "BEARING SHIFT"}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[12px]">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-rose-500/20 bg-rose-500/5 text-rose-300">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span className="text-slate-400 shrink-0">安保级别</span>
            <span className="font-bold truncate ml-auto" title={spaceTime.tactical.securityLevel}>{spaceTime.tactical.securityLevel}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-sky-500/20 bg-sky-500/5 text-sky-300">
            <Waves className="w-3 h-3 shrink-0" />
            <span className="text-slate-400 shrink-0">环境干扰</span>
            <span className="font-bold truncate ml-auto" title={spaceTime.tactical.interference}>{spaceTime.tactical.interference}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-amber-500/20 bg-amber-500/5 text-amber-300">
            <Mountain className="w-3 h-3 shrink-0" />
            <span className="text-slate-400 shrink-0">地形侦测</span>
            <span className="font-bold truncate ml-auto" title={spaceTime.tactical.terrain}>{spaceTime.tactical.terrain}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow z-10">
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-950 border border-slate-900 rounded-lg p-2 aspect-square relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-[260px] h-[260px] rounded-full border border-sky-500/10 absolute ${scanning ? "animate-ping" : ""}`} />
            <div className="w-[180px] h-[180px] rounded-full border border-sky-500/5 absolute" />
            <div className="w-[80px] h-[80px] rounded-full border border-indigo-500/5 absolute" />
            <div className="w-full h-[1px] bg-slate-900 absolute" />
            <div className="h-full w-[1px] bg-slate-900 absolute" />
          </div>

          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className={`w-full h-full z-10 ${dragRef.current ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {activeSystem ? renderLayer1(activeSystem) : renderLayer0()}
          </svg>

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-slate-950/90 border border-slate-900 rounded p-1.5 px-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] text-slate-400">
                {activeSystem ? `${activeSystem.id} 星系局部轨道接收中 · 拖拽旋转内部图` : "Hotus 原点拓扑接收中 · 点击星系进入 L1 / 拖拽旋转 L0"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="map-reset-bearing-button"
                onClick={handleResetBearing}
                className="text-[12px] px-3 py-1 rounded font-bold tracking-wider transition-all border bg-slate-900/70 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white"
              >
                重置方位
              </button>
              <button
                id="map-scan-button"
                onClick={handleScan}
                disabled={scanning}
                className={`text-[12px] px-3 py-1 rounded font-bold tracking-wider transition-all border ${
                  scanning
                    ? "bg-slate-900 text-slate-500 border-transparent cursor-not-allowed"
                    : "bg-indigo-950/50 text-indigo-400 border-indigo-500/30 hover:bg-indigo-900/50 hover:text-white"
                }`}
              >
                {scanning ? "雷达多频扫射中..." : "进行全波段战术扫描"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/40 border border-slate-900 rounded-lg p-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2 gap-2">
              <div>
                <span className="text-[11px] text-indigo-400 uppercase tracking-widest font-bold">
                  {activeSystem ? "已选定天体详情" : "已选定星图节点"}
                </span>
                <h3 className="text-sm font-bold text-slate-200 mt-0.5">{detailTitle}</h3>
              </div>
              <span className={`text-[11px] px-1.5 py-0.5 font-bold rounded border ${DANGER_COLORS[detailDanger]}`}>
                DANGER: {detailDanger}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">层级标定:</span>
                <span className="text-slate-200 text-right">{activeSystem ? `L1 / ${activeSystem.id} 星系` : "L0 / 联邦星图"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">坐标标定:</span>
                <span className="text-slate-200 text-right">{detailSubtitle}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 shrink-0">环境状态:</span>
                <span className="text-slate-300 text-right">{detailSummary}</span>
              </div>

              {selectedStatus ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">实时状态:</span>
                    <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded border ${TAG_COLORS[selectedStatus.tag] || "text-slate-300 border-slate-500/30 bg-slate-500/10"}`}>
                      {selectedStatus.tag}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">同步率:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-slate-800 rounded overflow-hidden flex">
                        <div className="bg-indigo-500 h-full rounded" style={{ width: `${selectedStatus.syncRate}%` }} />
                      </div>
                      <span className="text-indigo-400 text-[12px]">{selectedStatus.syncRate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-400 shrink-0">监控简述:</span>
                    <span className="text-slate-300 text-right leading-relaxed">{selectedStatus.summary}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">导航状态:</span>
                  <span className="text-[12px] text-slate-500">{selectedNode.kind === "rogue" && !activeSystem ? "边缘目标 / 无星系同步率" : "等待星系监控数据"}</span>
                </div>
              )}
            </div>

            <div className="p-2 border border-slate-800/60 bg-slate-950/40 rounded text-[13px] text-slate-400 leading-relaxed text-justify max-h-36 overflow-y-auto whitespace-pre-wrap">
              {loadingWorldbook && !selectedWorldbookContent ? "正在读取世界书条目..." : detailText}
            </div>

            {selectedWorldbook && (
              <div className="text-[11px] text-slate-600 break-all">
                WB: {selectedBookName} / {selectedWorldbook.entry}
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[12px] text-slate-500">
            {detailDanger === "CRITICAL" ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-rose-500/80 font-semibold">警告：目标处于极高危标记，建议先读取世界书情报再跃迁。</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>安全建议：以 Hotus 为原点复核方位，L1 仅显示已写入的主要天体。</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
