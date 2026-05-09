"use client";

import { Icon as IconifyIcon } from "@iconify-icon/react";

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const solarMap: Record<string, string> = {
  "shield": "solar:shield-check-linear",
  "shield-off": "solar:shield-warning-linear",
  "arrow-left": "solar:arrow-left-linear",
  "arrow-right": "solar:arrow-right-linear",
  "arrow-down": "solar:arrow-down-linear",
  "plus": "solar:add-circle-linear",
  "loader": "solar:refresh-circle-linear",
  "dollar": "solar:wallet-money-linear",
  "hash": "solar:hashtag-linear",
  "pause": "solar:pause-linear",
  "play": "solar:play-linear",
  "settings": "solar:settings-linear",
  "credit-card": "solar:card-linear",
  "alert-triangle": "solar:danger-triangle-linear",
  "clock": "solar:clock-circle-linear",
  "chevron-right": "solar:alt-arrow-right-linear",
  "trash": "solar:trash-bin-2-linear",
  "users": "solar:users-group-two-rounded-linear",
  "save": "solar:diskette-linear",
  "file-warning": "solar:file-corrupted-linear",
  "user": "solar:user-linear",
  "zap": "solar:bolt-linear",
  "lock": "solar:lock-linear",
  "fingerprint": "solar:fingerprint-scan-linear",
  "hexagon": "solar:widget-linear",
};

export function SolarIcon({ name, className = "", size = 20 }: IconProps) {
  const icon = solarMap[name] || `solar:${name}-linear`;

  return (
    <IconifyIcon
      icon={icon}
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
