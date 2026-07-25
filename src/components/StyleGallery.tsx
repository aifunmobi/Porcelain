/**
 * Style Gallery - dev-only surface for the letterpress material.
 *
 * Rendered instead of the OS when the URL carries ?gallery=1. This is the
 * review surface for the design foundation: every token and every primitive
 * shown as a live sample, in both light and dark.
 *
 * Not part of the shipped OS UI. Nothing here should be imported by app code.
 */
import { useEffect, useState } from 'react';
import { Icon, IconDefs, iconNames } from './Icons';
import './StyleGallery.css';

type Theme = 'light' | 'dark';

const RAISE_DEPTHS = ['p-raise-1', 'p-raise-2', 'p-raise-3'] as const;
const PRESS_DEPTHS = ['p-press-1', 'p-press-2'] as const;
const DEBOSS_DEPTHS = ['p-deboss-1', 'p-deboss-2'] as const;

const PAPER_RAMP = ['--paper-0', '--paper-1', '--paper-2', '--paper-3', '--paper-4'];
const INK_RAMP = ['--ink-strong', '--ink', '--ink-soft'];

const LEGACY_SHADOW_TOKENS = [
  '--shadow-xs',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-inset',
  '--shadow-inset-deep',
  '--shadow-window',
  '--shadow-dock',
  '--shadow-menu',
  '--shadow-icon',
];

function Sample({
  name,
  note,
  children,
}: {
  name: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gallery__sample" data-sample={name}>
      <div className="gallery__stage">{children}</div>
      <code className="gallery__name">{name}</code>
      {note ? <span className="gallery__note">{note}</span> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="gallery__section">
      <h2 className="gallery__heading p-engraved">{title}</h2>
      <hr className="p-groove" />
      <div className="gallery__grid">{children}</div>
    </section>
  );
}

export function StyleGallery() {
  const [theme, setTheme] = useState<Theme>('light');
  const [tokenReport, setTokenReport] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-auto');
    if (theme === 'dark') root.classList.add('dark');
  }, [theme]);

  // Read the legacy shadow tokens back off the live document so the gallery
  // proves they still resolve rather than asserting it in prose.
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const report: Record<string, string> = {};
    for (const token of LEGACY_SHADOW_TOKENS) {
      report[token] = styles.getPropertyValue(token).trim();
    }
    setTokenReport(report);
  }, [theme]);

  return (
    <div className="gallery p-paper" data-theme={theme}>
      <IconDefs />
      <header className="gallery__bar p-plate">
        <div>
          <h1 className="gallery__title p-embossed">Porcelain letterpress</h1>
          <p className="gallery__sub p-engraved">
            Design foundation — L-001. Light source: top-left, always.
          </p>
        </div>
        <button
          type="button"
          className="gallery__toggle p-pressable p-engraved"
          data-testid="theme-toggle"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
        </button>
      </header>

      <Section title="Paper stock">
        {PAPER_RAMP.map((token) => (
          <Sample key={token} name={token}>
            <div
              className="gallery__swatch p-hairline"
              style={{ background: `var(${token})` }}
            />
          </Sample>
        ))}
        {INK_RAMP.map((token) => (
          <Sample key={token} name={token}>
            <div className="gallery__swatch p-hairline" style={{ background: `var(${token})` }} />
          </Sample>
        ))}
      </Section>

      <Section title="Raised">
        {RAISE_DEPTHS.map((cls) => (
          <Sample key={cls} name={`.${cls}`}>
            <div className={`gallery__block ${cls}`} />
          </Sample>
        ))}
      </Section>

      <Section title="Pressed and debossed">
        {PRESS_DEPTHS.map((cls) => (
          <Sample key={cls} name={`.${cls}`}>
            <div className={`gallery__block gallery__block--sunk ${cls}`} />
          </Sample>
        ))}
        {DEBOSS_DEPTHS.map((cls) => (
          <Sample key={cls} name={`.${cls}`}>
            <div className={`gallery__block gallery__block--sunk ${cls}`} />
          </Sample>
        ))}
      </Section>

      <Section title="Primitives">
        <Sample name=".p-plate" note="raised panel — windows, cards, menus">
          <div className="gallery__block p-plate" />
        </Sample>

        <Sample name=".p-tile" note="app icon tile">
          <div className="gallery__tile p-tile">
            <span className="p-engraved">A</span>
          </div>
        </Sample>

        <Sample name=".p-well" note="inputs, list bodies">
          <div className="gallery__block p-well" />
        </Sample>

        <Sample name=".p-well--deep" note="deepest pressed area">
          <div className="gallery__block p-well p-well--deep" />
        </Sample>

        <Sample name=".p-groove" note="engraved divider">
          <div className="gallery__groovebox">
            <hr className="p-groove" />
          </div>
        </Sample>

        <Sample name=".p-hairline" note="material edge">
          <div className="gallery__block p-hairline" />
        </Sample>

        <Sample name=".p-engraved" note="type struck in">
          <span className="gallery__type p-engraved">Porcelain</span>
        </Sample>

        <Sample name=".p-embossed" note="type raised out">
          <span className="gallery__type p-embossed">Porcelain</span>
        </Sample>

        <Sample name=".p-paper" note="shared grain overlay">
          <div className="gallery__block gallery__block--grain p-paper p-hairline" />
        </Sample>

        <Sample name=".p-pressable" note="click it — the form presses in">
          <button type="button" className="gallery__button p-pressable p-engraved" data-testid="pressable">
            Press me
          </button>
        </Sample>
      </Section>

      <Section title="A composed control set">
        <Sample name="toolbar">
          <div className="gallery__toolbar p-plate">
            <button type="button" className="gallery__chip p-pressable p-engraved">
              Open
            </button>
            <button type="button" className="gallery__chip p-pressable p-engraved">
              Save
            </button>
            <span className="p-groove p-groove--vertical" />
            <input className="gallery__input p-well p-engraved" defaultValue="Search" />
          </div>
        </Sample>
      </Section>

      <section className="gallery__section">
        <h2 className="gallery__heading p-engraved">
          Icon sheet — {iconNames.length} marks
        </h2>
        <hr className="p-groove" />
        <p className="gallery__sub p-engraved">
          Every mapped name, at 16 / 24 / 48px as a glyph, then as a 48px app tile.
          Nothing here may fall back to the generic file mark.
        </p>
        <div className="gallery__icons" data-testid="icon-sheet">
          {iconNames.map((name) => (
            <div className="gallery__iconcard" key={name} data-icon={name}>
              <div className="gallery__iconrow">
                <span data-icon-size="16">
                  <Icon name={name} size={16} />
                </span>
                <span data-icon-size="24">
                  <Icon name={name} size={24} />
                </span>
                <span data-icon-size="48">
                  <Icon name={name} size={48} />
                </span>
                <span data-icon-size="tile">
                  <Icon name={name} size={48} mode="tile" />
                </span>
              </div>
              <code className="gallery__name">{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="gallery__section">
        <h2 className="gallery__heading p-engraved">Icon scale check</h2>
        <hr className="p-groove" />
        <p className="gallery__sub p-engraved">
          The emboss is expressed in the icon's own 24-unit space, so it scales with
          the mark instead of dissolving at 16px or clipping at 64px.
        </p>
        <div className="gallery__scalerow" data-testid="scale-row">
          {[16, 20, 24, 32, 48, 64].map((s) => (
            <div className="gallery__sample" key={s}>
              <div className="gallery__stage">
                <Icon name="folder" size={s} />
              </div>
              <code className="gallery__name">{s}px glyph</code>
            </div>
          ))}
          {[16, 20, 24, 32, 48, 64].map((s) => (
            <div className="gallery__sample" key={`t${s}`}>
              <div className="gallery__stage">
                <Icon name="folder" size={s} mode="tile" />
              </div>
              <code className="gallery__name">{s}px tile</code>
            </div>
          ))}
        </div>
      </section>

      <section className="gallery__section">
        <h2 className="gallery__heading p-engraved">Legacy shadow tokens</h2>
        <hr className="p-groove" />
        <p className="gallery__sub p-engraved">
          Read live off the document. Every one must resolve to a non-empty value —
          existing components still reference these names.
        </p>
        <table className="gallery__table p-well" data-testid="legacy-tokens">
          <tbody>
            {LEGACY_SHADOW_TOKENS.map((token) => (
              <tr key={token}>
                <td>
                  <code>{token}</code>
                </td>
                <td className={tokenReport[token] ? 'ok' : 'bad'}>
                  {tokenReport[token] ? 'resolves' : 'EMPTY'}
                </td>
                <td className="gallery__value">{tokenReport[token]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default StyleGallery;
