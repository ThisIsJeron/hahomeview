import { LitElement, html, css, svg } from "lit";
import { glass, glassLayers } from "./glass.ts";
import { editChrome, editHandle } from "./edit-chrome.ts";
import { SIZE_LABEL, type Size } from "../layout.ts";

export class HvClock extends LitElement {
  static properties = { _now: { state: true }, size: { reflect: true } };
  declare _now: Date;
  declare size: Size;
  private _timer?: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this._now = new Date();
  }
  connectedCallback() {
    super.connectedCallback();
    this._start();
    document.addEventListener("visibilitychange", this._onVisibility);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stop();
    document.removeEventListener("visibilitychange", this._onVisibility);
  }
  private _onVisibility = () => (document.hidden ? this._stop() : this._start());
  private _start() {
    this._stop();
    this._now = new Date();
    this._timer = setInterval(() => (this._now = new Date()), 1000);
  }
  private _stop() {
    clearInterval(this._timer);
    this._timer = undefined;
  }

  static styles = [
    glass,
    editChrome,
    css`
      :host {
        --radius: 50%;
        --surface-alpha: 0.18;
        display: block;
        aspect-ratio: 1;
        overflow: hidden;
        cursor: default;
        color: #fff;
      }
      :host .lens,
      :host .surface {
        border-radius: 50%;
      }
      /* The straight band would be clipped to a point on the circle, so the same fade follows the rim. */
      :host .edge.bottom { display: none; }
      :host .edge.top {
        inset: 0;
        height: auto;
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 50%;
        -webkit-mask-image:
          linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%),
          linear-gradient(#000 0, #000 32px, transparent 32px, transparent calc(100% - 32px), #000 calc(100% - 32px), #000 100%);
        -webkit-mask-composite: source-in;
        mask-image:
          linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%),
          linear-gradient(#000 0, #000 32px, transparent 32px, transparent calc(100% - 32px), #000 calc(100% - 32px), #000 100%);
        mask-composite: intersect;
      }
      /* Clock is chrome, not a control — no press scale. */
      :host(:active) { transform: none; }
      :host([resizing]) { animation: none; }
      /* The square corner sits outside the round face, so the handle and label stay on the disc. */
      .handle { right: 18%; bottom: 18%; }
      .badge {
        display: none;
        position: absolute;
        top: 16%;
        right: 18%;
        z-index: 7;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 11px;
        background: rgba(28, 28, 30, 0.78);
        color: #f2f2f7;
        font-size: 12px;
        font-weight: 700;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      :host([editing]) .badge { display: flex; }
      @media (prefers-color-scheme: dark) {
        .badge { background: rgba(245, 245, 247, 0.88); color: #1c1c1e; }
      }
      @media (hover: hover) and (pointer: fine) {
        :host(:hover) { box-shadow: var(--glass-shadow-stack); }
      }
      .face-svg {
        position: absolute;
        inset: 0;
        z-index: 5;
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.55));
      }
      .tick { stroke: #fff; stroke-linecap: round; }
      .hand { stroke: #fff; stroke-linecap: round; }
      .hub { fill: #fff; }
    `,
  ];

  render() {
    const d = this._now;
    const s = d.getSeconds();
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    const hand = (deg: number, len: number, w: number) =>
      svg`<line class="hand" x1="50" y1="54" x2="50" y2="${50 - len}" stroke-width="${w}" transform="rotate(${deg} 50 50)"/>`;
    const ticks = [...Array(12)].map((_, i) => {
      const a = (i * Math.PI) / 6;
      const major = i % 3 === 0;
      const inner = major ? 37 : 43.4;
      const outer = 47.2;
      return svg`<line class="tick" x1="${50 + inner * Math.sin(a)}" y1="${50 - inner * Math.cos(a)}" x2="${50 + outer * Math.sin(a)}" y2="${50 - outer * Math.cos(a)}" stroke-width="${major ? 2.15 : 1.55}"/>`;
    });
    return html`${glassLayers()}<svg class="face-svg" viewBox="0 0 100 100">
      ${ticks}
      ${hand(h * 30, 20, 3.1)}
      ${hand(m * 6, 32, 2.05)}
      ${hand(s * 6, 40, 0.85)}
      <circle class="hub" cx="50" cy="50" r="1.7" />
    </svg>${editHandle}<span class="badge">${SIZE_LABEL[this.size ?? "S"]}</span>`;
  }
}
customElements.define("hv-clock", HvClock);
