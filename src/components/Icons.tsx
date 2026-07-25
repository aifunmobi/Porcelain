import React from 'react';
import './Icons.css';

/**
 * Porcelain OS - embossed paper icon system (L-002).
 *
 * Two modes:
 *   glyph  the bare mark, struck into whatever surface it sits on. Toolbars,
 *          menus, buttons, list rows. This is the default.
 *   tile   an app icon: a raised paper tile with the glyph debossed into its
 *          face. Dock, desktop, Spotlight.
 *
 * Every glyph is a closed solid form rather than a thin outline - an outline
 * has no face to catch the light and will not emboss. Secondary detail is
 * expressed with fillOpacity so it reads as a shallower strike rather than as
 * a different colour.
 *
 * The emboss itself is an SVG filter defined ONCE by <IconDefs />, mounted at
 * the app root and referenced from Icons.css so the theme class can swap the
 * light and dark recipe without any JavaScript.
 */

export type IconMode = 'glyph' | 'tile';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  mode?: IconMode;
  title?: string;
}

/* ---------------------------------------------------------------------------
 * Filter definitions - mounted once
 * ------------------------------------------------------------------------ */

interface EmbossSpec {
  id: string;
  /** cast shadow, offset in the icon's own 24-unit space so it scales with size */
  shadow: { dx: number; dy: number; blur: number; color: string; opacity: number };
  /** specular highlight */
  highlight: { dx: number; dy: number; blur: number; color: string; opacity: number };
}

const EmbossFilter: React.FC<EmbossSpec> = ({ id, shadow, highlight }) => (
  <filter
    id={id}
    filterUnits="objectBoundingBox"
    x="-30%"
    y="-30%"
    width="160%"
    height="160%"
  >
    <feOffset in="SourceAlpha" dx={shadow.dx} dy={shadow.dy} result="sOff" />
    <feGaussianBlur in="sOff" stdDeviation={shadow.blur} result="sBlur" />
    <feFlood floodColor={shadow.color} floodOpacity={shadow.opacity} result="sCol" />
    <feComposite in="sCol" in2="sBlur" operator="in" result="shadow" />

    <feOffset in="SourceAlpha" dx={highlight.dx} dy={highlight.dy} result="hOff" />
    <feGaussianBlur in="hOff" stdDeviation={highlight.blur} result="hBlur" />
    <feFlood floodColor={highlight.color} floodOpacity={highlight.opacity} result="hCol" />
    <feComposite in="hCol" in2="hBlur" operator="in" result="highlight" />

    <feMerge>
      <feMergeNode in="highlight" />
      <feMergeNode in="shadow" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/**
 * Mount once, at the app root. Renders the four emboss recipes:
 * raised / debossed x light / dark. Everything else references them by id.
 */
export const IconDefs: React.FC = () => (
  <svg className="pcl-icon-defs" aria-hidden="true" focusable="false">
    <defs>
      {/* raised out of white paper: light from the top-left */}
      <EmbossFilter
        id="pcl-emboss"
        shadow={{ dx: 0.4, dy: 0.5, blur: 0.28, color: '#4a4237', opacity: 0.45 }}
        highlight={{ dx: -0.35, dy: -0.4, blur: 0.2, color: '#ffffff', opacity: 0.95 }}
      />
      {/* struck into white paper: the light direction inverts */}
      <EmbossFilter
        id="pcl-deboss"
        shadow={{ dx: -0.3, dy: -0.35, blur: 0.22, color: '#4a4237', opacity: 0.5 }}
        highlight={{ dx: 0.38, dy: 0.45, blur: 0.22, color: '#ffffff', opacity: 0.92 }}
      />
      {/* raised out of dark slate: the stock barely catches light */}
      <EmbossFilter
        id="pcl-emboss-dark"
        shadow={{ dx: 0.4, dy: 0.5, blur: 0.3, color: '#000000', opacity: 0.75 }}
        highlight={{ dx: -0.32, dy: -0.38, blur: 0.22, color: '#cfdcee', opacity: 0.22 }}
      />
      {/* struck into dark slate */}
      <EmbossFilter
        id="pcl-deboss-dark"
        shadow={{ dx: -0.3, dy: -0.35, blur: 0.24, color: '#000000', opacity: 0.8 }}
        highlight={{ dx: 0.36, dy: 0.42, blur: 0.24, color: '#cfdcee', opacity: 0.2 }}
      />
    </defs>
  </svg>
);

/* ---------------------------------------------------------------------------
 * Shell
 * ------------------------------------------------------------------------ */

const IconShell: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  mode = 'glyph',
  title,
  children,
}) => {
  const glyphSize = mode === 'tile' ? Math.round(size * 0.56) : size;

  const svg = (
    <svg
      className={`pcl-icon${mode === 'glyph' && className ? ` ${className}` : ''}`}
      width={glyphSize}
      height={glyphSize}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );

  if (mode === 'tile') {
    return (
      <span
        className={`pcl-tile${className ? ` ${className}` : ''}`}
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(4, Math.round(size * 0.24)),
        }}
      >
        {svg}
      </span>
    );
  }

  return svg;
};

const icon = (displayName: string, art: React.ReactNode): React.FC<IconProps> => {
  const Component: React.FC<IconProps> = (props) => <IconShell {...props}>{art}</IconShell>;
  Component.displayName = displayName;
  return Component;
};

/* shared fragments ------------------------------------------------------- */

const F = 'currentColor';

/* Geometry helpers.
 *
 * Detail inside a solid form is CUT OUT of it (fill-rule evenodd) rather than
 * painted on top at a lower opacity - same colour over same colour is
 * invisible, and a real deboss is a hole anyway. Each of these returns a
 * subpath string; concatenate body + holes into one `d`.
 */
const n = (v: number) => Number(v.toFixed(3));
const rr = (x: number, y: number, w: number, h: number, r = 0) =>
  r <= 0
    ? `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z`
    : `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}` +
      `v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}` +
      `h${n(-(w - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}` +
      `v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`;
const ci = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0z`;
const el = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0z`;
/** a donut: outer disc with a concentric hole */
const ring = (cx: number, cy: number, outer: number, inner: number) => ci(cx, cy, outer) + ci(cx, cy, inner);
/** grid of circular holes */
const dots = (x0: number, y0: number, dx: number, dy: number, cols: number, rows: number, r: number) => {
  let d = '';
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) d += ci(x0 + col * dx, y0 + row * dy, r);
  return d;
};

const PAGE_D =
  'M6.2 2.6h6.6l5.4 5.4v12.6a1.4 1.4 0 0 1-1.4 1.4H6.2a1.4 1.4 0 0 1-1.4-1.4V4a1.4 1.4 0 0 1 1.4-1.4Z' +
  'M12.9 3.4 17.4 7.9h-3.5a1 1 0 0 1-1-1V3.4Z';

const solid = (d: string) => <path fillRule="evenodd" clipRule="evenodd" d={d} fill={F} />;

const gearTeeth = Array.from({ length: 8 }, (_, i) => (
  <rect
    key={i}
    x="10.85"
    y="1.2"
    width="2.3"
    height="4.6"
    rx="1.05"
    fill={F}
    transform={`rotate(${i * 45} 12 12)`}
  />
));

/* ---------------------------------------------------------------------------
 * The set
 * ------------------------------------------------------------------------ */

export const FolderIcon = icon(
  'FolderIcon',
  <>
    <path
      d="M3 6.6A1.8 1.8 0 0 1 4.8 4.8h4.3c.5 0 1 .2 1.3.6l1.4 1.4h7.4A1.8 1.8 0 0 1 21 8.6v8.8a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 17.4V6.6Z"
      fill={F}
    />
    <path d="M3 10h18v1.5H3V10Z" fill={F} fillOpacity="0.35" />
  </>
);

export const FileIcon = icon('FileIcon', solid(PAGE_D));

export const SettingsIcon = icon(
  'SettingsIcon',
  <>
    <rect x="3" y="5.1" width="18" height="2.4" rx="1.2" fill={F} fillOpacity="0.4" />
    <rect x="3" y="10.8" width="18" height="2.4" rx="1.2" fill={F} fillOpacity="0.4" />
    <rect x="3" y="16.5" width="18" height="2.4" rx="1.2" fill={F} fillOpacity="0.4" />
    <circle cx="8.4" cy="6.3" r="2.9" fill={F} />
    <circle cx="15.2" cy="12" r="2.9" fill={F} />
    <circle cx="9.8" cy="17.7" r="2.9" fill={F} />
  </>
);

export const GearIcon = icon(
  'GearIcon',
  <>
    {gearTeeth}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3.3a8.7 8.7 0 1 0 0 17.4 8.7 8.7 0 0 0 0-17.4Zm0 5.4a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z"
      fill={F}
    />
  </>
);

export const TrashIcon = icon(
  'TrashIcon',
  <>
    {solid(
      'M6.3 8.6h11.4l-.85 10.9A1.9 1.9 0 0 1 15 21.2H9a1.9 1.9 0 0 1-1.85-1.8L6.3 8.6Z' +
        rr(9.6, 11.2, 1.6, 6.2, 0.8) +
        rr(12.8, 11.2, 1.6, 6.2, 0.8)
    )}
    <rect x="3.6" y="5.3" width="16.8" height="2.7" rx="1.35" fill={F} />
    <path d="M9.4 2.6h5.2A1.3 1.3 0 0 1 15.9 4v1.3H8.1V4a1.3 1.3 0 0 1 1.3-1.4Z" fill={F} />
  </>
);

export const HomeIcon = icon(
  'HomeIcon',
  <path
    d="M11.1 2.9a1.4 1.4 0 0 1 1.8 0l8.1 6.7c.3.3.5.7.5 1.1v9.1a1.5 1.5 0 0 1-1.5 1.5h-4.7v-6.4H8.7v6.4H4a1.5 1.5 0 0 1-1.5-1.5v-9.1c0-.4.2-.8.5-1.1l8.1-6.7Z"
    fill={F}
  />
);

export const UploadIcon = icon(
  'UploadIcon',
  <>
    <path
      d="M4 14.2a1.25 1.25 0 0 1 1.25 1.25v3.05h13.5v-3.05a1.25 1.25 0 1 1 2.5 0v3.65A1.9 1.9 0 0 1 19.35 21H4.65a1.9 1.9 0 0 1-1.9-1.9v-3.65A1.25 1.25 0 0 1 4 14.2Z"
      fill={F}
      fillOpacity="0.55"
    />
    <path
      d="M12 2.6c.34 0 .66.14.9.38l4.3 4.3a1.27 1.27 0 0 1-1.8 1.8l-2.13-2.14v8.2a1.27 1.27 0 1 1-2.54 0v-8.2L8.6 9.08a1.27 1.27 0 1 1-1.8-1.8l4.3-4.3c.24-.24.56-.38.9-.38Z"
      fill={F}
    />
  </>
);

export const DownloadIcon = icon(
  'DownloadIcon',
  <>
    <path
      d="M4 14.2a1.25 1.25 0 0 1 1.25 1.25v3.05h13.5v-3.05a1.25 1.25 0 1 1 2.5 0v3.65A1.9 1.9 0 0 1 19.35 21H4.65a1.9 1.9 0 0 1-1.9-1.9v-3.65A1.25 1.25 0 0 1 4 14.2Z"
      fill={F}
      fillOpacity="0.55"
    />
    <path
      d="M12 16.4c-.34 0-.66-.14-.9-.38l-4.3-4.3a1.27 1.27 0 0 1 1.8-1.8l2.13 2.14V3.86a1.27 1.27 0 1 1 2.54 0v8.2l2.13-2.14a1.27 1.27 0 1 1 1.8 1.8l-4.3 4.3c-.24.24-.56.38-.9.38Z"
      fill={F}
    />
  </>
);

export const SearchIcon = icon(
  'SearchIcon',
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M10.6 2.8a7.8 7.8 0 1 0 4.52 14.16l3.72 3.72a1.35 1.35 0 0 0 1.91-1.91l-3.72-3.72A7.8 7.8 0 0 0 10.6 2.8Zm0 2.7a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2Z"
    fill={F}
  />
);

export const ComputerIcon = icon(
  'ComputerIcon',
  <>
    <path
      d="M3.3 5.2A1.9 1.9 0 0 1 5.2 3.3h13.6a1.9 1.9 0 0 1 1.9 1.9v9.3a1.9 1.9 0 0 1-1.9 1.9H5.2a1.9 1.9 0 0 1-1.9-1.9V5.2Z"
      fill={F}
    />
    <path d="M9.6 16.5h4.8l.5 2.3H9.1l.5-2.3Z" fill={F} fillOpacity="0.55" />
    <rect x="6.2" y="18.6" width="11.6" height="2.2" rx="1.1" fill={F} />
  </>
);

export const GlobeIcon = icon(
  'GlobeIcon',
  <>
    {solid(ring(12, 12, 9.1, 7.4))}
    {solid(el(12, 12, 4, 7.4) + el(12, 12, 2.6, 6))}
    <rect x="4.3" y="11.15" width="15.4" height="1.7" rx="0.85" fill={F} />
  </>
);

export const UsbIcon = icon(
  'UsbIcon',
  <>
    {solid(
      rr(8.6, 9.4, 6.8, 11.6, 1.8) + rr(10.3, 12.8, 3.4, 1.5, 0.75) + rr(10.3, 15.4, 3.4, 1.5, 0.75)
    )}
    {solid(rr(10.1, 3.2, 3.8, 6.4, 1.1) + rr(10.9, 5, 2.2, 1.6, 0.6))}
  </>
);

export const NotepadIcon = icon(
  'NotepadIcon',
  solid(
    rr(4.6, 3.4, 14.8, 17.2, 2.2) +
      rr(7.6, 7.4, 8.8, 1.7, 0.85) +
      rr(7.6, 11, 8.8, 1.7, 0.85) +
      rr(7.6, 14.6, 5.6, 1.7, 0.85)
  )
);

export const CalculatorIcon = icon(
  'CalculatorIcon',
  solid(rr(4.4, 2.6, 15.2, 18.8, 2.4) + rr(7, 5.4, 10, 3.4, 1) + dots(7.9, 12.4, 4.1, 3.4, 3, 3, 1.15))
);

export const PaletteIcon = icon(
  'PaletteIcon',
  solid(
    'M12 2.9c-5.1 0-9.2 3.8-9.2 8.6 0 4.7 3.7 7.8 8.2 7.8 1.3 0 2.1-.7 2.1-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.7-1.6h1.7c3.1 0 5.6-2.4 5.6-5.4 0-3.2-4-5.4-9.2-5.4Z' +
      ci(7.3, 9.5, 1.45) +
      ci(11.4, 7, 1.45) +
      ci(15.8, 8.3, 1.45) +
      ci(7.1, 14.2, 1.45)
  )
);

export const MusicIcon = icon(
  'MusicIcon',
  <>
    <path d="M9.4 4.4 20 2.1v3.7L9.4 8.1V4.4Z" fill={F} />
    <rect x="9.4" y="4" width="2.2" height="12.6" rx="1.1" fill={F} />
    <rect x="17.8" y="2.2" width="2.2" height="11.8" rx="1.1" fill={F} />
    <ellipse cx="7.3" cy="17.3" rx="3.6" ry="3.2" fill={F} />
    <ellipse cx="15.7" cy="14.7" rx="3.6" ry="3.2" fill={F} />
  </>
);

export const VideoIcon = icon(
  'VideoIcon',
  <>
    <rect x="2.5" y="5.9" width="12.9" height="12.2" rx="2.5" fill={F} />
    <path
      d="M16.7 10.5 20.4 8c.85-.58 2 .03 2 1.06v5.88c0 1.03-1.15 1.64-2 1.06l-3.7-2.5v-3Z"
      fill={F}
      fillOpacity="0.7"
    />
  </>
);

export const CameraIcon = icon(
  'CameraIcon',
  solid(
    'M9.3 3.4h5.4c.62 0 1.2.32 1.53.85l.87 1.4h2.5A2.4 2.4 0 0 1 22 8.05v9.55a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 17.6V8.05a2.4 2.4 0 0 1 2.4-2.4h2.5l.87-1.4c.33-.53.91-.85 1.53-.85Z' +
      ci(12, 13, 4.4) +
      ci(12, 13, 2)
  )
);

export const PrinterIcon = icon(
  'PrinterIcon',
  <>
    <rect x="6.4" y="2.6" width="11.2" height="5.2" rx="1.1" fill={F} />
    {solid(rr(2.6, 7.4, 18.8, 9.4, 2.3) + ci(18.2, 10.8, 1.15) + rr(5.6, 9.6, 8.6, 1.6, 0.8))}
    {solid(rr(6.4, 13.6, 11.2, 7.8, 1.3) + rr(8.6, 16, 6.8, 1.4, 0.7) + rr(8.6, 18.4, 6.8, 1.4, 0.7))}
  </>
);

export const CloudIcon = icon(
  'CloudIcon',
  <path
    d="M7.3 19.6a5.3 5.3 0 0 1-.6-10.57 6.7 6.7 0 0 1 12.83 1.93 4.4 4.4 0 0 1-.93 8.64H7.3Z"
    fill={F}
  />
);

export const CalendarIcon = icon(
  'CalendarIcon',
  <>
    {solid(
      rr(3.2, 4.6, 17.6, 16.2, 2.4) + rr(5.6, 9.4, 12.8, 1.3, 0.65) + dots(7.6, 13.8, 4.4, 4, 3, 2, 1.2)
    )}
    <rect x="6.8" y="2.4" width="2.5" height="4.6" rx="1.25" fill={F} />
    <rect x="14.7" y="2.4" width="2.5" height="4.6" rx="1.25" fill={F} />
  </>
);

export const ClockIcon = icon(
  'ClockIcon',
  <>
    {solid(ring(12, 12, 9.2, 7.1))}
    <path
      d="M10.95 7.3a1.05 1.05 0 0 1 2.1 0v4.1l2.6 1.52a1.05 1.05 0 1 1-1.06 1.81l-3.12-1.82a1.05 1.05 0 0 1-.52-.91V7.3Z"
      fill={F}
    />
  </>
);

export const BatteryIcon = icon(
  'BatteryIcon',
  <>
    {solid(rr(2.3, 7.3, 17.2, 9.4, 2.7) + rr(4.3, 9.3, 13.1, 5.4, 1.4) + rr(4.3, 9.3, 7.2, 5.4, 1.4))}
    <rect x="20.3" y="10.3" width="1.9" height="3.4" rx="0.9" fill={F} />
  </>
);

export const VolumeIcon = icon(
  'VolumeIcon',
  <>
    <path
      d="M11.2 4.2a1.2 1.2 0 0 1 .8 1.13v13.34a1.2 1.2 0 0 1-1.99.9L5.85 16H3.6A1.6 1.6 0 0 1 2 14.4V9.6A1.6 1.6 0 0 1 3.6 8h2.25l4.16-3.57a1.2 1.2 0 0 1 1.19-.23Z"
      fill={F}
    />
    <path
      d="M15.5 8.4a1.25 1.25 0 0 1 1.77 0 5.1 5.1 0 0 1 0 7.2 1.25 1.25 0 1 1-1.77-1.77 2.6 2.6 0 0 0 0-3.66 1.25 1.25 0 0 1 0-1.77Z"
      fill={F}
      fillOpacity="0.62"
    />
    <path
      d="M18.5 5.3a1.25 1.25 0 0 1 1.77 0 9.5 9.5 0 0 1 0 13.4 1.25 1.25 0 0 1-1.77-1.77 7 7 0 0 0 0-9.86 1.25 1.25 0 0 1 0-1.77Z"
      fill={F}
      fillOpacity="0.4"
    />
  </>
);

export const MicrophoneIcon = icon(
  'MicrophoneIcon',
  <>
    <rect x="8.7" y="2.2" width="6.6" height="11.8" rx="3.3" fill={F} />
    <path
      d="M5.4 10.4a1.25 1.25 0 0 1 1.25 1.25 5.35 5.35 0 0 0 10.7 0 1.25 1.25 0 1 1 2.5 0 7.86 7.86 0 0 1-6.6 7.76v1.09h2.15a1.25 1.25 0 1 1 0 2.5H8.6a1.25 1.25 0 1 1 0-2.5h2.15V19.4a7.86 7.86 0 0 1-6.6-7.76A1.25 1.25 0 0 1 5.4 10.4Z"
      fill={F}
      fillOpacity="0.62"
    />
  </>
);

export const HelpIcon = icon(
  'HelpIcon',
  <>
    {solid(ring(12, 12, 9.2, 7.2))}
    <path
      d="M12 7.1c-1.95 0-3.5 1.2-3.78 2.9a1.05 1.05 0 0 0 2.07.34c.11-.66.79-1.13 1.71-1.13.94 0 1.58.52 1.58 1.23 0 .55-.25.85-1.08 1.38-.97.62-1.54 1.3-1.54 2.42v.22a1.05 1.05 0 1 0 2.1 0v-.18c0-.33.12-.5.75-.9 1.13-.72 1.87-1.55 1.87-2.94 0-1.88-1.6-3.34-3.68-3.34Z"
      fill={F}
    />
    <circle cx="12" cy="16.5" r="1.2" fill={F} />
  </>
);

export const TerminalIcon = icon(
  'TerminalIcon',
  solid(
    rr(2.5, 4, 19, 16, 2.6) +
      'M6.5 9.2h1.75l3 2.8-3 2.8H6.5l3-2.8z' +
      rr(12.4, 13.6, 5.2, 1.8, 0.9)
  )
);

export const WordIcon = icon(
  'WordIcon',
  solid(
    PAGE_D +
      'M7.5 11.7h1.75l.95 3.3 1.05-3.3h1.5l1.05 3.3.95-3.3h1.75l-1.95 6.4h-1.6l-.95-3-.95 3h-1.6z'
  )
);

export const ExcelIcon = icon(
  'ExcelIcon',
  solid(
    PAGE_D +
      rr(7.5, 11.8, 3.4, 2.6, 0.5) +
      rr(11.7, 11.8, 3.4, 2.6, 0.5) +
      rr(7.5, 15.2, 3.4, 2.6, 0.5) +
      rr(11.7, 15.2, 3.4, 2.6, 0.5)
  )
);

export const ImageIcon = icon(
  'ImageIcon',
  solid(
    rr(2.7, 4.4, 18.6, 15.2, 2.6) + ci(8.4, 9.7, 2.05) + 'M4.9 17.3l4.6-5.4 3.3 3.6 2.5-2.7 3.9 4.5z'
  )
);

export const WifiIcon = icon(
  'WifiIcon',
  <>
    <path
      d="M12 4.2c3.94 0 7.53 1.53 10.2 4.02a1.32 1.32 0 0 1-1.8 1.93A12.5 12.5 0 0 0 12 6.84c-3.24 0-6.2 1.23-8.4 3.31a1.32 1.32 0 0 1-1.8-1.93A15.14 15.14 0 0 1 12 4.2Z"
      fill={F}
    />
    <path
      d="M12 9.5c2.53 0 4.85 1 6.55 2.62a1.32 1.32 0 0 1-1.82 1.91A6.9 6.9 0 0 0 12 12.14c-1.8 0-3.44.68-4.73 1.89a1.32 1.32 0 1 1-1.82-1.91A9.5 9.5 0 0 1 12 9.5Z"
      fill={F}
      fillOpacity="0.68"
    />
    <circle cx="12" cy="18.3" r="2.4" fill={F} />
  </>
);

export const BluetoothIcon = icon(
  'BluetoothIcon',
  <path
    d="M7.8 7.2 16.2 16.8 12 20.6V3.4l4.2 3.8L7.8 16.8"
    stroke={F}
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

export const PlayIcon = icon(
  'PlayIcon',
  <path
    d="M7.2 4.9a1.3 1.3 0 0 1 2-1.09l10.2 6.9a1.3 1.3 0 0 1 0 2.16l-10.2 6.9a1.3 1.3 0 0 1-2-1.08V4.9Z"
    fill={F}
  />
);

export const PauseIcon = icon(
  'PauseIcon',
  <>
    <rect x="6.1" y="3.8" width="4.4" height="16.4" rx="1.6" fill={F} />
    <rect x="13.5" y="3.8" width="4.4" height="16.4" rx="1.6" fill={F} />
  </>
);

export const SkipForwardIcon = icon(
  'SkipForwardIcon',
  <>
    <path
      d="M4.6 5.8a1.2 1.2 0 0 1 1.86-1l8.3 6.2a1.2 1.2 0 0 1 0 2l-8.3 6.2a1.2 1.2 0 0 1-1.86-1V5.8Z"
      fill={F}
    />
    <rect x="16.4" y="4.6" width="3.4" height="14.8" rx="1.5" fill={F} />
  </>
);

export const SkipBackIcon = icon(
  'SkipBackIcon',
  <>
    <path
      d="M19.4 5.8a1.2 1.2 0 0 0-1.86-1l-8.3 6.2a1.2 1.2 0 0 0 0 2l8.3 6.2a1.2 1.2 0 0 0 1.86-1V5.8Z"
      fill={F}
    />
    <rect x="4.2" y="4.6" width="3.4" height="14.8" rx="1.5" fill={F} />
  </>
);

export const PlusIcon = icon(
  'PlusIcon',
  <>
    <rect x="10.4" y="3.6" width="3.2" height="16.8" rx="1.6" fill={F} />
    <rect x="3.6" y="10.4" width="16.8" height="3.2" rx="1.6" fill={F} />
  </>
);

export const MinusIcon = icon(
  'MinusIcon',
  <rect x="3.6" y="10.4" width="16.8" height="3.2" rx="1.6" fill={F} />
);

const CROSS = (
  <>
    <rect
      x="3.9"
      y="10.4"
      width="16.2"
      height="3.2"
      rx="1.6"
      fill={F}
      transform="rotate(45 12 12)"
    />
    <rect
      x="3.9"
      y="10.4"
      width="16.2"
      height="3.2"
      rx="1.6"
      fill={F}
      transform="rotate(-45 12 12)"
    />
  </>
);

export const CloseIcon = icon('CloseIcon', CROSS);
export const XIcon = icon('XIcon', CROSS);

export const MaximizeIcon = icon(
  'MaximizeIcon',
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M4.4 3.6h15.2a.8.8 0 0 1 .8.8v15.2a.8.8 0 0 1-.8.8H4.4a.8.8 0 0 1-.8-.8V4.4a.8.8 0 0 1 .8-.8Zm2.4 3.2v10.4h10.4V6.8H6.8Z"
    fill={F}
  />
);

export const MinimizeIcon = icon(
  'MinimizeIcon',
  <rect x="4.4" y="15.4" width="15.2" height="3.2" rx="1.6" fill={F} />
);

export const ChevronLeftIcon = icon(
  'ChevronLeftIcon',
  <path
    d="M15.2 4.6 8.2 12l7 7.4"
    stroke={F}
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

export const ChevronRightIcon = icon(
  'ChevronRightIcon',
  <path
    d="M8.8 4.6 15.8 12l-7 7.4"
    stroke={F}
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

export const ChevronUpIcon = icon(
  'ChevronUpIcon',
  <path
    d="M4.6 15.2 12 8.2l7.4 7"
    stroke={F}
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

export const ChevronDownIcon = icon(
  'ChevronDownIcon',
  <path
    d="M4.6 8.8 12 15.8l7.4-7"
    stroke={F}
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

export const GridIcon = icon(
  'GridIcon',
  <>
    <rect x="3.4" y="3.4" width="7.6" height="7.6" rx="1.9" fill={F} />
    <rect x="13" y="3.4" width="7.6" height="7.6" rx="1.9" fill={F} />
    <rect x="3.4" y="13" width="7.6" height="7.6" rx="1.9" fill={F} />
    <rect x="13" y="13" width="7.6" height="7.6" rx="1.9" fill={F} />
  </>
);

export const ListIcon = icon(
  'ListIcon',
  <>
    {[0, 1, 2].map((i) => (
      <React.Fragment key={i}>
        <circle cx="5" cy={6.4 + i * 5.6} r="1.8" fill={F} />
        <rect
          x="9"
          y={4.9 + i * 5.6}
          width="11.6"
          height="3"
          rx="1.5"
          fill={F}
          fillOpacity="0.55"
        />
      </React.Fragment>
    ))}
  </>
);

export const RefreshIcon = icon(
  'RefreshIcon',
  <path
    d="M12 3.2a8.8 8.8 0 1 1-8.63 10.53 1.32 1.32 0 1 1 2.59-.53A6.2 6.2 0 1 0 12 5.8c-1.4 0-2.7.46-3.75 1.24l1.9 1.5a.55.55 0 0 1-.25.97l-5.2.96a.55.55 0 0 1-.65-.62l.79-5.2a.55.55 0 0 1 .93-.32l1.63 1.63A8.75 8.75 0 0 1 12 3.2Z"
    fill={F}
  />
);

export const BrowserIcon = icon(
  'BrowserIcon',
  solid(
    rr(2.5, 4, 19, 16, 2.6) +
      rr(2.5, 8.7, 19, 1) +
      ci(5.9, 6.4, 0.95) +
      ci(8.5, 6.4, 0.95) +
      ci(11.1, 6.4, 0.95) +
      rr(13.6, 5.3, 5.6, 2.2, 1.1)
  )
);

export const WeatherIcon = icon(
  'WeatherIcon',
  <>
    <circle cx="8.8" cy="8" r="3.9" fill={F} fillOpacity="0.55" />
    <path
      d="M10.5 20.6a4.7 4.7 0 0 1-.53-9.37 6 6 0 0 1 11.43 1.72 3.94 3.94 0 0 1-.83 7.65H10.5Z"
      fill={F}
    />
  </>
);

export const InfoIcon = icon(
  'InfoIcon',
  <>
    {solid(ring(12, 12, 9.2, 7.2))}
    <circle cx="12" cy="8.5" r="1.25" fill={F} />
    <rect x="10.85" y="10.9" width="2.3" height="5.8" rx="1.15" fill={F} />
  </>
);

export const BellIcon = icon(
  'BellIcon',
  <>
    <path
      d="M12 2.2a6.9 6.9 0 0 0-6.9 6.9v3.5l-1.44 2.85A1.2 1.2 0 0 0 4.73 17.2h14.54a1.2 1.2 0 0 0 1.07-1.75l-1.44-2.85V9.1A6.9 6.9 0 0 0 12 2.2Z"
      fill={F}
    />
    <path d="M9.3 18.7h5.4a2.7 2.7 0 0 1-5.4 0Z" fill={F} fillOpacity="0.62" />
  </>
);

export const CheckCircleIcon = icon(
  'CheckCircleIcon',
  <>
    {solid(ring(12, 12, 9.2, 7.2))}
    <path
      d="M15.75 9.35a1.15 1.15 0 0 1 .12 1.62l-4.2 4.9a1.15 1.15 0 0 1-1.68.06l-2.1-2.1a1.15 1.15 0 1 1 1.63-1.63l1.22 1.22 3.4-3.96a1.15 1.15 0 0 1 1.61-.11Z"
      fill={F}
    />
  </>
);

export const AlertCircleIcon = icon(
  'AlertCircleIcon',
  <>
    {solid(ring(12, 12, 9.2, 7.2))}
    <rect x="10.85" y="7.4" width="2.3" height="6" rx="1.15" fill={F} />
    <circle cx="12" cy="16.2" r="1.3" fill={F} />
  </>
);

export const AlertTriangleIcon = icon(
  'AlertTriangleIcon',
  solid(
    'M10.36 3.4a1.9 1.9 0 0 1 3.28 0l8.1 14.1a1.9 1.9 0 0 1-1.64 2.85H3.9a1.9 1.9 0 0 1-1.64-2.85l8.1-14.1Z' +
      rr(10.8, 8.8, 2.4, 5.6, 1.2) +
      ci(12, 17.1, 1.35)
  )
);

export const FileTextIcon = icon(
  'FileTextIcon',
  solid(PAGE_D + rr(7.4, 11.8, 8.4, 1.6, 0.8) + rr(7.4, 14.8, 8.4, 1.6, 0.8) + rr(7.4, 17.8, 5, 1.6, 0.8))
);

export const CopyIcon = icon(
  'CopyIcon',
  <>
    <rect x="3.2" y="3.2" width="12.4" height="12.4" rx="2.2" fill={F} fillOpacity="0.5" />
    <rect x="8.4" y="8.4" width="12.4" height="12.4" rx="2.2" fill={F} />
  </>
);

export const SaveIcon = icon(
  'SaveIcon',
  solid(
    'M4.8 3.2h11.5l4.5 4.5V19a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 19V5a1.8 1.8 0 0 1 1.8-1.8Z' +
      rr(7.4, 3.2, 7.6, 5.2, 0.8) +
      rr(11.6, 4, 2.4, 3.6, 0.5) +
      rr(6.6, 12.6, 10.8, 8.2, 1.1) +
      rr(8.4, 14.4, 7.2, 1.3, 0.65) +
      rr(8.4, 16.8, 7.2, 1.3, 0.65)
  )
);

export const AlignLeftIcon = icon(
  'AlignLeftIcon',
  <>
    <rect x="3.4" y="4.4" width="17.2" height="2.6" rx="1.3" fill={F} />
    <rect x="3.4" y="9.2" width="11.6" height="2.6" rx="1.3" fill={F} fillOpacity="0.6" />
    <rect x="3.4" y="14" width="17.2" height="2.6" rx="1.3" fill={F} />
    <rect x="3.4" y="18.8" width="11.6" height="2.6" rx="1.3" fill={F} fillOpacity="0.6" />
  </>
);

export const ArrowRightIcon = icon(
  'ArrowRightIcon',
  <path
    d="M13.1 4.36a1.3 1.3 0 0 1 1.84 0l6.7 6.72a1.3 1.3 0 0 1 0 1.84l-6.7 6.72a1.3 1.3 0 0 1-1.84-1.84l4.5-4.5H3.9a1.3 1.3 0 1 1 0-2.6h13.7l-4.5-4.5a1.3 1.3 0 0 1 0-1.84Z"
    fill={F}
  />
);

/* ---- new apps: L-007 and L-008 ---------------------------------------- */

export const PreviewIcon = icon(
  'PreviewIcon',
  <>
    {solid(
      'M5 2.6h5.9l4.3 4.3v5.3H5a1.4 1.4 0 0 1-1.4-1.4V4A1.4 1.4 0 0 1 5 2.6Z' +
        'M11 3.4 14.7 7.1h-2.8a.9.9 0 0 1-.9-.9V3.4Z'
    )}
    {solid(ring(15, 15, 5.6, 3.3))}
    <rect
      x="18.15"
      y="17.5"
      width="2.6"
      height="5.6"
      rx="1.3"
      fill={F}
      transform="rotate(-45 19.45 20.3)"
    />
  </>
);

export const ArchiveIcon = icon(
  'ArchiveIcon',
  <>
    <rect x="2.6" y="3.8" width="18.8" height="5" rx="1.5" fill={F} />
    {solid(
      'M4.3 9.6h15.4v9.7a1.9 1.9 0 0 1-1.9 1.9H6.2a1.9 1.9 0 0 1-1.9-1.9V9.6Z' + rr(9.4, 12.4, 5.2, 2.4, 1.2)
    )}
  </>
);

export const ScreenshotIcon = icon(
  'ScreenshotIcon',
  <>
    <path
      d="M3.4 8.2V5.6a2.2 2.2 0 0 1 2.2-2.2h2.6M15.8 3.4h2.6a2.2 2.2 0 0 1 2.2 2.2v2.6M20.6 15.8v2.6a2.2 2.2 0 0 1-2.2 2.2h-2.6M8.2 20.6H5.6a2.2 2.2 0 0 1-2.2-2.2v-2.6"
      stroke={F}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="12" cy="12" r="3.6" fill={F} fillOpacity="0.75" />
  </>
);

export const MailIcon = icon(
  'MailIcon',
  solid(rr(2.3, 4.6, 19.4, 14.8, 2.5) + 'M3.9 6.1l8.1 5.9 8.1-5.9v2.2l-8.1 5.9-8.1-5.9z')
);

export const ContactsIcon = icon(
  'ContactsIcon',
  <>
    {solid(
      rr(4.2, 3.4, 16.4, 17.2, 2.4) +
        ci(11.9, 10, 2.9) +
        'M7.2 17.6c.6-2.55 2.55-4.05 4.7-4.05s4.1 1.5 4.7 4.05z'
    )}
    {[0, 1, 2].map((i) => (
      <rect key={i} x="2.2" y={6.4 + i * 4.6} width="3.6" height="2.2" rx="1.1" fill={F} />
    ))}
  </>
);

export const RemindersIcon = icon(
  'RemindersIcon',
  solid(
    rr(3.4, 3.4, 17.2, 17.2, 2.6) +
      'M6.7 9.5l1.15-1.15 1.35 1.35 2.75-2.75 1.15 1.15-3.9 3.9z' +
      rr(14.4, 8.5, 4.1, 1.7, 0.85) +
      'M6.7 16l1.15-1.15 1.35 1.35 2.75-2.75 1.15 1.15-3.9 3.9z' +
      rr(14.4, 15, 4.1, 1.7, 0.85)
  )
);

/* ---------------------------------------------------------------------------
 * Map + dynamic component. Every key that existed before still resolves.
 * ------------------------------------------------------------------------ */

export const iconMap: Record<string, React.FC<IconProps>> = {
  folder: FolderIcon,
  file: FileIcon,
  document: FileIcon,
  settings: GearIcon,
  gear: GearIcon,
  trash: TrashIcon,
  home: HomeIcon,
  upload: UploadIcon,
  download: DownloadIcon,
  search: SearchIcon,
  computer: ComputerIcon,
  globe: GlobeIcon,
  usb: UsbIcon,
  notepad: NotepadIcon,
  notes: NotepadIcon,
  calculator: CalculatorIcon,
  palette: PaletteIcon,
  music: MusicIcon,
  video: VideoIcon,
  camera: CameraIcon,
  printer: PrinterIcon,
  cloud: CloudIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  battery: BatteryIcon,
  volume: VolumeIcon,
  microphone: MicrophoneIcon,
  help: HelpIcon,
  terminal: TerminalIcon,
  word: WordIcon,
  excel: ExcelIcon,
  image: ImageIcon,
  wifi: WifiIcon,
  bluetooth: BluetoothIcon,
  play: PlayIcon,
  pause: PauseIcon,
  'skip-forward': SkipForwardIcon,
  'skip-back': SkipBackIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  close: CloseIcon,
  maximize: MaximizeIcon,
  minimize: MinimizeIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-up': ChevronUpIcon,
  'chevron-down': ChevronDownIcon,
  grid: GridIcon,
  list: ListIcon,
  refresh: RefreshIcon,
  browser: BrowserIcon,
  weather: WeatherIcon,
  info: InfoIcon,
  x: XIcon,
  bell: BellIcon,
  'check-circle': CheckCircleIcon,
  'alert-circle': AlertCircleIcon,
  'alert-triangle': AlertTriangleIcon,
  'file-text': FileTextIcon,
  copy: CopyIcon,
  save: SaveIcon,
  'align-left': AlignLeftIcon,
  'arrow-right': ArrowRightIcon,

  // L-007
  preview: PreviewIcon,
  archive: ArchiveIcon,
  screenshot: ScreenshotIcon,

  // L-008
  mail: MailIcon,
  contacts: ContactsIcon,
  reminders: RemindersIcon,
};

/** Every mapped name, in declaration order. Used by the gallery's icon sheet. */
export const iconNames = Object.keys(iconMap);

// Dynamic Icon component
export const Icon: React.FC<IconProps & { name: string }> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || FileIcon;
  return <IconComponent {...props} />;
};
