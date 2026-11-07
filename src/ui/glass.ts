import { css } from "lit";

// iOS 26 "liquid glass" approximation. Safari cannot run SVG filters inside backdrop-filter,
// so this is blur + saturate + translucent fill + inset highlight + specular gradient.
export const glass = css`
  :host {
    display: block;
    position: relative;
    border-radius: var(--radius);
    background: var(--glass);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    backdrop-filter: blur(24px) saturate(160%);
    box-shadow:
      inset 0 1px 0 var(--glass-edge),
      inset 0 0 0 1px rgba(255, 255, 255, 0.12),
      0 8px 30px var(--glass-shadow);
    overflow: hidden;
  }
  :host::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 45%);
  }
`;
