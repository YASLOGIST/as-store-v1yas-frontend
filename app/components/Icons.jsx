/**
 * Lightweight inline SVG icon set — zero dependencies, tree-shakeable.
 * All icons inherit `currentColor` and size via CSS.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/**
 * @param {{size?: number, className?: string}} props
 */
export function LogoMark({size = 24, className}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="0.55" stopColor="#ffa75c" />
          <stop offset="1" stopColor="#ffc46b" />
        </linearGradient>
      </defs>
      <path
        d="M32 7 53 19.25v25.5L32 57 11 44.75v-25.5Z"
        fill="none"
        stroke="url(#logo-g)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M35.5 15 22 34.5h8.5L27 49l14.5-19.5H33Z" fill="url(#logo-g)" />
    </svg>
  );
}

export function IconCart(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <path d="M2.5 3h1.8a1 1 0 0 1 .98.8L6 10m0 0 1.2 6.2a2 2 0 0 0 1.96 1.6h8.1a2 2 0 0 0 1.96-1.57L20.5 10H6Zm3.75 10.5h11.5" />
      <circle cx="9.5" cy="21" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="21" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.6-4.6" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.6-3.5 4.2-5 7.5-5s5.9 1.5 7.5 5" />
    </svg>
  );
}

export function IconMenu(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...props}>
      <path d="M3.5 6.5h17m-17 5.5h17m-17 5.5h11" />
    </svg>
  );
}

export function IconArrowRight(props) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...props}>
      <path d="M4 12h16m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

export function IconBolt(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
    </svg>
  );
}

export function IconShield(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.3 7.5 10 4.3-1.7 7.5-5 7.5-10v-6L12 2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

export function IconRocket(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <path d="M13.5 3.5c3.5-1 6-.5 7.5 1-1.5 4.5-5 8.5-9 10.5L9 13c2-4 5.5-7.5 4.5-9.5Z" />
      <path d="M9 13c-2 0-4 1.5-5 5 3.5-1 5-3 5-5Zm2 3.5c.5 2-.5 4-3 5" />
      <circle cx="15.5" cy="8.5" r="1.2" />
    </svg>
  );
}

export function IconGlobe(props) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.7 2.7 4 5.8 4 9.5s-1.3 6.8-4 9.5c-2.7-2.7-4-5.8-4-9.5s1.3-6.8 4-9.5Z" />
    </svg>
  );
}

export function IconPackage(props) {
  return (
    <svg viewBox="0 0 24 24" width={38} height={38} {...base} {...props}>
      <path d="M21 7.5 12 3 3 7.5v9L12 21l9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  );
}
