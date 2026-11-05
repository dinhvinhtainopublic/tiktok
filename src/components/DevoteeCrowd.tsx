import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Devotee } from '../types/temple';
import { Person, hash } from './Person';

interface DevoteeCrowdProps {
  devotees: Devotee[];
  recentGiftDonor: string | null;
  recentGiftPrayer?: string | null;
  labelsOnly?: boolean; // 3D layer draws the people; keep only chat bubbles here
}

// Seats in stage % (x = center, y = feet line) for everyone else: six close rows at the bottom of the hall,
// packed up to a narrow walkway down the middle, just wide enough for one person (it widens a little toward the camera).
// Top donors kneel further up on their cushions (OfferingArea). The front row fills first.
const ROWS_Y = [86.8, 89.2, 91.6, 94, 96.4, 98.8];
const SEAT_STEP_X = 4.6;
export const SEATS = ROWS_Y.flatMap((y) => {
  const inner = 4 + (y - 88) * 0.15; // half the walkway: just room for one person to walk down the middle
  const row: Array<{ x: number; y: number }> = [];
  for (let x = 50 - inner; x >= 4; x -= SEAT_STEP_X) row.push({ x, y }, { x: 100 - x, y });
  return row;
});
// Farther rows (higher on screen) are smaller
const widthAt = (y: number) => `${6.5 * (0.62 + ((y - 70) / 30) * 0.42)}%`;
const WALK_MS = 3500;

const Viewer: React.FC<{ devotee: Devotee; isVip: boolean; prayerText: string | null; labelsOnly?: boolean }> = ({
  devotee,
  isVip,
  prayerText,
  labelsOnly,
}) => {
  const { x, y } = SEATS[(devotee.seat ?? 0) % SEATS.length];
  const isNew = Date.now() - devotee.joinedAt < WALK_MS;
  const [arrived, setArrived] = useState(!isNew);

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
      style={{ width: widthAt(y), zIndex: arrived ? Math.round(y) : 120 }}
      initial={isNew ? { left: '50%', top: '108%' } : false}
      animate={
        isNew
          ? { left: ['50%', '50%', `${x}%`], top: ['108%', `${y}%`, `${y}%`] }
          : { left: `${x}%`, top: `${y}%` }
      }
      transition={{ duration: WALK_MS / 1000, times: [0, 0.75, 1], ease: 'easeInOut' }}
      onAnimationComplete={() => setArrived(true)}
    >
      {/* No name tag in the rows: their TikTok avatar over the head (initial when there is none), and what they say above it */}
      {arrived && (
        <div className="absolute bottom-full mb-0.5 w-[34%] max-w-[18px] aspect-square rounded-full border border-[#d9a55a] bg-[#b07a3a] overflow-hidden shadow-[0_0_5px_rgba(217,165,90,0.6)] flex items-center justify-center text-[7px] font-bold text-[#fff7e0]">
          {devotee.avatarUrl ? (
            <img src={devotee.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            devotee.displayName.slice(0, 1).toUpperCase()
          )}
        </div>
      )}
      {prayerText && (!labelsOnly || arrived) && (
        <div className="absolute bottom-full mb-6 z-50 w-max max-w-[120px] px-2 py-0.5 rounded-lg bg-[#2a1608]/85 border border-[#b07a3a]/60 text-[#fbe7b8] text-[9px] font-semibold leading-tight text-center shadow-md animate-float-subtle">
          <div className="line-clamp-2">{prayerText}</div>
        </div>
      )}
      <div className={`w-full ${!labelsOnly && (isVip || !arrived) ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : ''}`}>
        <Person seed={hash(devotee.username)} mode={arrived ? 'pray' : 'walk'} hidden={labelsOnly} />
      </div>
    </motion.div>
  );
};

export const DevoteeCrowd: React.FC<DevoteeCrowdProps> = ({ devotees, recentGiftDonor, recentGiftPrayer, labelsOnly }) => {
  // One viewer per seat (App keeps seats unique); empty seats keep a background devotee
  const bySeat = new Map<number, Devotee>();
  for (const d of devotees) bySeat.set((d.seat ?? 0) % SEATS.length, d);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {SEATS.map((seat, i) =>
        bySeat.has(i) || labelsOnly ? null : (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${seat.x}%`, top: `${seat.y}%`, width: widthAt(seat.y), zIndex: Math.round(seat.y) }}
          >
            <Person seed={i * 37} mode="pray" />
          </div>
        )
      )}

      {[...bySeat.values()].map((d) => {
        const isVip = Boolean(recentGiftDonor && d.username.toLowerCase() === recentGiftDonor.toLowerCase());
        return (
          <Viewer
            key={d.id}
            devotee={d}
            isVip={isVip}
            prayerText={(isVip && recentGiftPrayer) || d.activeComment || null}
            labelsOnly={labelsOnly}
          />
        );
      })}
    </div>
  );
};
