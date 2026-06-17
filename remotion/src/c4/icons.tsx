import React from 'react';
import { COLORS } from './shared';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const BulbIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="20" r="10" stroke={color} strokeWidth={strokeWidth} />
    <path d="M18 30 Q18 36 24 36 Q30 36 30 30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="20" y1="36" x2="28" y2="36" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="21" y1="40" x2="27" y2="40" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const TVIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="10" width="40" height="26" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <line x1="16" y1="40" x2="32" y2="40" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="24" y1="36" x2="24" y2="40" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="10" y="22" width="28" height="20" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <path d="M16 22V16a8 8 0 0 1 16 0v6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <circle cx="24" cy="32" r="3" fill={color} />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="4" y="14" width="32" height="22" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="20" cy="25" r="6" stroke={color} strokeWidth={strokeWidth} />
    <path d="M36 19l8-5v20l-8-5" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <rect x="8" y="10" width="8" height="4" rx="1" fill={color} />
  </svg>
);

export const ThermostatIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="34" r="6" stroke={color} strokeWidth={strokeWidth} />
    <rect x="20" y="8" width="8" height="22" rx="4" stroke={color} strokeWidth={strokeWidth} />
    <line x1="28" y1="14" x2="32" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="28" y1="18" x2="32" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="28" y1="22" x2="32" y2="22" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 80, color = COLORS.BLUE, strokeWidth = 2.5 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path d="M40 8 L68 20 L68 42 Q68 60 40 72 Q12 60 12 42 L12 20 Z" stroke={color} strokeWidth={strokeWidth} fill={`${color}22`} strokeLinejoin="round" />
    <path d="M28 40 L36 48 L54 30" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M24 6 C16 6 12 12 12 20 L12 30 L8 34 L40 34 L36 30 L36 20 C36 12 32 6 24 6 Z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
    <path d="M19 34 Q19 38 24 38 Q29 38 29 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="8" stroke={color} strokeWidth={strokeWidth} />
    <line x1="24" y1="4" x2="24" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="24" y1="38" x2="24" y2="44" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="4" y1="24" x2="10" y2="24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="38" y1="24" x2="44" y2="24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="8.7" y1="8.7" x2="12.9" y2="12.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="35.1" y1="35.1" x2="39.3" y2="39.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="39.3" y1="8.7" x2="35.1" y2="12.9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="12.9" y1="35.1" x2="8.7" y2="39.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const BlindsIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="6" width="36" height="36" rx="2" stroke={color} strokeWidth={strokeWidth} />
    <line x1="6" y1="14" x2="42" y2="14" stroke={color} strokeWidth={strokeWidth} />
    <line x1="6" y1="22" x2="42" y2="22" stroke={color} strokeWidth={strokeWidth} />
    <line x1="6" y1="30" x2="42" y2="30" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="24" cy="38" r="3" stroke={color} strokeWidth={strokeWidth} />
    <line x1="24" y1="14" x2="24" y2="35" stroke={color} strokeWidth={strokeWidth} strokeDasharray="2 4" />
  </svg>
);

export const TowelRailIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="8" y="8" width="6" height="32" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <rect x="34" y="8" width="6" height="32" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <line x1="14" y1="18" x2="34" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="14" y1="30" x2="34" y2="30" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <path d="M18 10 Q24 6 30 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
  </svg>
);

export const CoffeeIcon: React.FC<IconProps> = ({ size = 48, color = COLORS.BLUE_L, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M8 16 L12 40 L36 40 L40 16 Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <path d="M40 22 Q48 22 48 28 Q48 34 40 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="14" y1="10" x2="14" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="24" y1="8" x2="24" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <line x1="34" y1="10" x2="34" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 28, color = COLORS.GREEN, strokeWidth = 2.5 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="12" fill={color} />
    <path d="M8 14 L12 18 L20 10" stroke="#fff" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PhoneIcon: React.FC<{ size?: number }> = ({ size = 240 }) => {
  const h = size * 2;
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} fill="none">
      <rect x="4" y="4" width={size - 8} height={h - 8} rx="28" stroke={COLORS.WHITE} strokeWidth="3" fill={COLORS.CARD} />
      <rect x={size / 2 - 30} y="12" width="60" height="6" rx="3" fill={COLORS.GRAY} opacity="0.4" />
      <circle cx={size / 2} cy="18" r="4" fill={COLORS.GRAY} opacity="0.3" />
    </svg>
  );
};
