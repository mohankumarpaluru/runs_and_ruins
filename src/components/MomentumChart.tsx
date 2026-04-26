import React, { useMemo, useRef, useState, useEffect } from 'react';
import { cn, getAvatarColor } from '../lib/utils';
import { Match, MatchBet, MiscBet, Participant, LeaderboardEntry } from '../types';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MomentumChartProps {
  matches: Match[];
  matchBets: MatchBet[];
  miscBets: MiscBet[];
  participants: Participant[];
  leaderboard: LeaderboardEntry[];
}

interface MatchPoint {
  matchNo: number;
  matchId: string;
  team1: string;
  team2: string;
  winner: string | null; // 'team1' | 'team2' | null
  winnerParticipantId: string | null;
  p1Cumulative: number;
  p2Cumulative: number;
}

const TEAL = '#00D4C8';
const AMBER = '#F5A524';
const GREEN = '#22C55E';
const RED = '#EF4444';

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d.push(`C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`);
  }
  return d.join(' ');
}

export function MomentumChart({ matches, matchBets, miscBets, participants, leaderboard }: MomentumChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(700);

  useEffect(() => {
    const update = () => {
      if (svgRef.current) setSvgWidth(svgRef.current.clientWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    if (svgRef.current) ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  // Force Sahitya to be p1 (Teal) and Durgesh/other to be p2 (Amber)
  const [p1, p2] = [...participants].sort((a, b) => {
    if (a.name.toLowerCase() === 'sahitya') return -1;
    if (b.name.toLowerCase() === 'sahitya') return 1;
    return 0;
  }).slice(0, 2);

  // Build match-by-match cumulative P/L per participant
  const matchPoints = useMemo<MatchPoint[]>(() => {
    const settled = matches
      .filter(m => m.status === 'completed' || m.status === 'settled')
      .sort((a, b) => a.match_no - b.match_no);

    let p1Cum = 0;
    let p2Cum = 0;
    const points: MatchPoint[] = [];

    settled.forEach(m => {
      const betsForMatch = matchBets.filter(b => b.match_id === m.id);
      const p1Bet = p1 ? betsForMatch.find(b => b.participant_id === p1.id) : null;
      const p2Bet = p2 ? betsForMatch.find(b => b.participant_id === p2.id) : null;

      if (p1Bet) p1Cum += p1Bet.profit_loss;
      if (p2Bet) p2Cum += p2Bet.profit_loss;

      // Also count misc bets associated with this match
      const sideBets = miscBets.filter(sb => sb.match_id === m.id && sb.status === 'settled');
      sideBets.forEach(sb => {
        if (p1 && sb.winner_participant_id === p1.id) p1Cum += sb.amount;
        if (p1 && sb.loser_participant_id === p1.id) p1Cum -= sb.amount;
        if (p2 && sb.winner_participant_id === p2.id) p2Cum += sb.amount;
        if (p2 && sb.loser_participant_id === p2.id) p2Cum -= sb.amount;
      });

      // Determine which participant won the match bet
      let winnerParticipantId: string | null = null;
      if (m.winner && p1Bet && p2Bet) {
        winnerParticipantId = p1Bet.result === 'win' ? (p1?.id ?? null) : (p2?.id ?? null);
      }

      points.push({
        matchNo: m.match_no,
        matchId: m.id,
        team1: m.team1,
        team2: m.team2,
        winner: m.winner,
        winnerParticipantId,
        p1Cumulative: p1Cum,
        p2Cumulative: p2Cum,
      });
    });

    return points;
  }, [matches, matchBets, miscBets, p1, p2]);

  const totalWins = useMemo(() => {
    const p1Wins = leaderboard.find(e => e.participant_id === p1?.id)?.wins ?? 0;
    const p2Wins = leaderboard.find(e => e.participant_id === p2?.id)?.wins ?? 0;
    return { p1Wins, p2Wins, total: p1Wins + p2Wins };
  }, [leaderboard, p1, p2]);

  // Chart dimensions
  const H = 180;
  const PAD_T = 20;
  const PAD_B = 24;
  const PAD_L = 48;
  const PAD_R = 16;
  const W = svgWidth;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxVal = Math.max(
    ...matchPoints.map(p => Math.abs(p.p1Cumulative)),
    ...matchPoints.map(p => Math.abs(p.p2Cumulative)),
    100
  );
  const axisMax = Math.ceil(maxVal / 100) * 100 || 100;

  const toX = (i: number) =>
    matchPoints.length <= 1
      ? PAD_L + chartW / 2
      : PAD_L + (i / (matchPoints.length - 1)) * chartW;

  const toY = (val: number) =>
    PAD_T + chartH / 2 - (val / axisMax) * (chartH / 2);

  const zeroY = PAD_T + chartH / 2;

  const p1Points = matchPoints.map((pt, i) => ({ x: toX(i), y: toY(pt.p1Cumulative) }));
  const p2Points = matchPoints.map((pt, i) => ({ x: toX(i), y: toY(pt.p2Cumulative) }));

  // X-axis label strategy: sparse, max 8 labels
  const xLabels = useMemo(() => {
    if (matchPoints.length === 0) return [];
    const step = Math.max(1, Math.ceil(matchPoints.length / 8));
    const labels: { i: number; label: string }[] = [];
    for (let i = 0; i < matchPoints.length; i += step) {
      labels.push({ i, label: `M${matchPoints[i].matchNo}` });
    }
    // Always include last
    const last = matchPoints.length - 1;
    if (labels.length === 0 || labels[labels.length - 1].i !== last) {
      labels.push({ i: last, label: `M${matchPoints[last].matchNo}` });
    }
    return labels;
  }, [matchPoints]);

  // Y-axis labels
  const yLabels = [axisMax, Math.round(axisMax / 2), 0, -Math.round(axisMax / 2), -axisMax];

  const hovered = hoveredIdx !== null ? matchPoints[hoveredIdx] : null;
  const p1Name = p1?.name ?? 'Player 1';
  const p2Name = p2?.name ?? 'Player 2';

  if (!p1 || !p2 || matchPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: '#2A3F55' }}>
        <TrendingUp className="w-10 h-10" />
        <p className="text-sm font-semibold" style={{ color: '#4A5F75' }}>No settled matches yet — Momentum will appear here</p>
      </div>
    );
  }

  const currentP1 = matchPoints[matchPoints.length - 1].p1Cumulative;
  const currentP2 = matchPoints[matchPoints.length - 1].p2Cumulative;
  const p1WinPct = totalWins.total > 0 ? (totalWins.p1Wins / totalWins.total) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Legend header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: TEAL, boxShadow: `0 0 6px ${TEAL}` }} />
            <span className="text-sm font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-heading)' }}>{p1Name}</span>
            <span className="text-xs font-bold font-mono ml-1" style={{ color: currentP1 > 0 ? GREEN : currentP1 < 0 ? RED : '#4A5F75' }}>
               {currentP1 > 0 ? '+' : ''}₹{currentP1.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
            <span className="text-sm font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-heading)' }}>{p2Name}</span>
            <span className="text-xs font-bold font-mono ml-1" style={{ color: currentP2 > 0 ? GREEN : currentP2 < 0 ? RED : '#4A5F75' }}>
               {currentP2 > 0 ? '+' : ''}₹{currentP2.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main rivalry gap chart */}
      <div
        className="rounded-xl overflow-hidden relative"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={H}
          style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <filter id="glowP1">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glowP2">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y-axis grid lines and labels */}
          {yLabels.map((v, gi) => {
            const y = toY(v);
            const isZero = v === 0;
            return (
              <g key={gi}>
                <line
                  x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke={isZero ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? undefined : '3 4'}
                />
                <text
                  x={PAD_L - 6} y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill={isZero ? '#4A5F75' : '#2A3F55'}
                  fontFamily="var(--font-mono)"
                >
                  {v === 0 ? '0' : (v > 0 ? '+' : '') + (Math.abs(v) >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={i}
              x={toX(i)} y={H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="#2A3F55"
              fontFamily="var(--font-mono)"
            >
              {label}
            </text>
          ))}

          {/* Baseline zero line over the grid */}
          <line
            x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
          />

          {/* Lines for both participants */}
          {matchPoints.length > 1 && (
            <>
              {/* p1 (Teal) line */}
              <path
                d={smoothPath(p1Points)}
                fill="none"
                stroke={TEAL}
                strokeWidth={2}
                strokeOpacity={0.8}
                filter="url(#glowP1)"
              />
              <path
                d={smoothPath(p1Points)}
                fill="none"
                stroke={TEAL}
                strokeWidth={2.5}
                strokeLinecap="round"
              />

              {/* p2 (Amber) line */}
              <path
                d={smoothPath(p2Points)}
                fill="none"
                stroke={AMBER}
                strokeWidth={2}
                strokeOpacity={0.8}
                filter="url(#glowP2)"
              />
              <path
                d={smoothPath(p2Points)}
                fill="none"
                stroke={AMBER}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </>
          )}

          {/* Hover hit areas (invisible rects per match) */}
          {matchPoints.map((_, i) => {
            const x = toX(i);
            const colW = matchPoints.length > 1 ? chartW / matchPoints.length : chartW;
            return (
              <rect
                key={i}
                x={x - colW / 2}
                y={PAD_T}
                width={colW}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}

          {/* Hovered point indicator */}
          {hoveredIdx !== null && p1Points[hoveredIdx] && p2Points[hoveredIdx] && (() => {
            const px1 = p1Points[hoveredIdx].x;
            const py1 = p1Points[hoveredIdx].y;
            const py2 = p2Points[hoveredIdx].y;
            return (
              <>
                <line x1={px1} y1={PAD_T} x2={px1} y2={H - PAD_B} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" />
                
                {/* P1 node */}
                <circle cx={px1} cy={py1} r={5} fill={TEAL} stroke="#0A1220" strokeWidth={2} />
                <circle cx={px1} cy={py1} r={9} fill={TEAL} fillOpacity={0.15} />

                {/* P2 node */}
                <circle cx={px1} cy={py2} r={5} fill={AMBER} stroke="#0A1220" strokeWidth={2} />
                <circle cx={px1} cy={py2} r={9} fill={AMBER} fillOpacity={0.15} />
              </>
            );
          })()}
        </svg>

        {/* Tooltip */}
        {hovered && hoveredIdx !== null && (() => {
          const leader = hovered.p1Cumulative > hovered.p2Cumulative ? p1Name : hovered.p1Cumulative < hovered.p2Cumulative ? p2Name : null;
          return (
            <div
              className="absolute top-2 right-3 rounded-lg px-3 py-2.5 pointer-events-none"
              style={{
                background: 'rgba(8,14,26,0.92)',
                border: `1px solid rgba(255,255,255,0.15)`,
                backdropFilter: 'blur(8px)',
                minWidth: 140,
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#4A5F75', fontFamily: 'var(--font-mono)' }}>
                Match {hovered.matchNo}
              </div>
              <div className="text-[11px] mb-1" style={{ color: '#7A90A8' }}>{hovered.team1} vs {hovered.team2}</div>
              
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5" style={{ color: TEAL }}>
                    {p1Name} {leader === p1Name && <Crown className="w-3 h-3" />}
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: hovered.p1Cumulative > 0 ? GREEN : hovered.p1Cumulative < 0 ? RED : '#4A5F75' }}>
                    {hovered.p1Cumulative > 0 ? '+' : ''}₹{hovered.p1Cumulative.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-1.5" style={{ color: AMBER }}>
                    {p2Name} {leader === p2Name && <Crown className="w-3 h-3" />}
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: hovered.p2Cumulative > 0 ? GREEN : hovered.p2Cumulative < 0 ? RED : '#4A5F75' }}>
                    {hovered.p2Cumulative > 0 ? '+' : ''}₹{hovered.p2Cumulative.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Match trail */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2A3F55', fontFamily: 'var(--font-heading)' }}>
          Match Trail
        </div>
        <div className="flex gap-1 flex-wrap">
          {matchPoints.map((pt, i) => {
            const isP1Win = pt.winnerParticipantId === p1?.id;
            const isP2Win = pt.winnerParticipantId === p2?.id;
            const isTied = !isP1Win && !isP2Win;
            const color = isP1Win ? TEAL : isP2Win ? AMBER : '#2A3F55';
            const isHovered = hoveredIdx === i;
            return (
              <button
                key={pt.matchId}
                title={`Match ${pt.matchNo}: ${pt.team1} vs ${pt.team2}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative transition-transform hover:scale-110"
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border transition-all"
                  style={{
                    background: color,
                    borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.05)',
                    boxShadow: isHovered ? `0 0 8px ${color}` : undefined,
                    opacity: isTied ? 0.3 : 1,
                  }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-[10px]" style={{ color: '#2A3F55' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
            <span>{p1Name} won</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
            <span>{p2Name} won</span>
          </div>
        </div>
      </div>

      {/* Win share + earnings share summary */}
      <div
        className="grid grid-cols-2 gap-3"
      >
        {/* Win share */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2A3F55', fontFamily: 'var(--font-heading)' }}>
            Win Share
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold truncate" style={{ color: TEAL, minWidth: 40, fontFamily: 'var(--font-heading)' }}>
              {totalWins.p1Wins}W
            </span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${clamp(p1WinPct, 0, 100)}%`,
                  background: `linear-gradient(to right, ${TEAL}, ${TEAL}88)`,
                  boxShadow: `0 0 8px ${TEAL}55`,
                }}
              />
            </div>
            <span className="text-xs font-semibold truncate" style={{ color: AMBER, minWidth: 40, textAlign: 'right', fontFamily: 'var(--font-heading)' }}>
              {totalWins.p2Wins}W
            </span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: '#3A5570' }}>
            <span>{p1WinPct.toFixed(0)}% {p1Name}</span>
            <span>{(100 - p1WinPct).toFixed(0)}% {p2Name}</span>
          </div>
        </div>

        {/* Earnings share */}
        {(() => {
          const p1e = leaderboard.find(e => e.participant_id === p1?.id)?.total_pl ?? 0;
          const p2e = leaderboard.find(e => e.participant_id === p2?.id)?.total_pl ?? 0;
          const maxAbsE = Math.max(Math.abs(p1e), Math.abs(p2e), 1);
          const p1pct = clamp(((p1e + maxAbsE) / (2 * maxAbsE)) * 100, 0, 100);
          return (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2A3F55', fontFamily: 'var(--font-heading)' }}>
                Earnings Balance
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold scoreboard-num truncate" style={{ color: p1e > 0 ? GREEN : p1e < 0 ? RED : '#4A5F75', minWidth: 40, fontFamily: 'var(--font-mono)' }}>
                  {p1e > 0 ? '+' : ''}₹{p1e.toLocaleString()}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${p1pct}%`,
                      background: p1e >= 0 ? `linear-gradient(to right, ${TEAL}, ${TEAL}88)` : `linear-gradient(to left, ${AMBER}, ${AMBER}88)`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold scoreboard-num truncate" style={{ color: p2e > 0 ? GREEN : p2e < 0 ? RED : '#4A5F75', minWidth: 40, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  {p2e > 0 ? '+' : ''}₹{p2e.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: '#3A5570' }}>
                <span>{p1Name}</span>
                <span>{p2Name}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
