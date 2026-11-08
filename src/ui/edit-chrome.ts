import { css, html } from "lit";

/** Corner handle shown while a dashboard page is in edit mode. */
export const editHandle = html`<button class="handle" type="button" aria-label="Resize"></button>`;

export const editChrome = css`
  .handle {
    display: none;
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 7;
    width: 34px;
    height: 34px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: rgba(28, 28, 30, 0.78);
    color: #fff;
    touch-action: none;
    cursor: nwse-resize;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  .handle::before {
    content: "";
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 11px;
    height: 11px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
  }
  :host([editing]) .handle { display: block; }
  :host([resizing]) .handle { background: rgba(28, 28, 30, 0.92); }
  @media (prefers-color-scheme: dark) {
    .handle { background: rgba(245, 245, 247, 0.9); color: #1c1c1e; }
    :host([resizing]) .handle { background: #fff; }
  }
`;
