import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function InstagramIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14 8.5h-1.5A2 2 0 0 0 10.5 10.5v1.5H9v2.5h1.5V21h2.5v-6.5H15l.5-2.5h-2v-1c0-.4.3-.5.6-.5H15V8.5Z" />
    </svg>
  );
}

export function TiktokIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      <path d="M14 4v10.2a2.8 2.8 0 1 1-2.4-2.77" />
      <path d="M14 4c.4 2.2 2 4 4.5 4.3" />
    </svg>
  );
}
