import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_COLORS = [
  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'bg-rose-500/10 text-rose-500 border-rose-500/20',
  'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
  'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'bg-pink-500/10 text-pink-500 border-pink-500/20',
];

export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getTextColor(name: string): string {
  const avatarColor = getAvatarColor(name);
  return avatarColor.split(' ').find(c => c.startsWith('text-')) || 'text-foreground';
}
