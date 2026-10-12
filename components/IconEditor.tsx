"use client";

import { useEffect, useRef, useState } from "react";
import { setObjectIcon } from "@/app/actions";
import { GRID, PALETTE, PIXELS, generateSprite } from "@/lib/sprite";
import { PixelIcon } from "./PixelIcon";

export function IconEditor({ objectId, initial }: { objectId: number; initial: string }) {
  const [pixels, setPixels] = useState(initial);
  const [color, setColor] = useState(7);
  const painting = useRef<number | null>(null);

  useEffect(() => setPixels(initial), [initial]);

  useEffect(() => {
    const stop = () => (painting.current = null);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const paint = (i: number, c: number) =>
    setPixels((p) => (p[i] === c.toString(16) ? p : p.slice(0, i) + c.toString(16) + p.slice(i + 1)));

  const dirty = pixels !== initial;

  return (
    <table className="editor">
      <tbody>
        <tr>
          <td className="shrink top">
            <div
              className="pixel-grid"
              style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {Array.from({ length: PIXELS }, (_, i) => {
                const c = parseInt(pixels[i], 16);
                return (
                  <div
                    key={i}
                    className="pixel"
                    style={{ background: c ? PALETTE[c] : undefined }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.target as Element).releasePointerCapture?.(e.pointerId);
                      painting.current = e.button === 2 ? 0 : color;
                      paint(i, painting.current);
                    }}
                    onPointerEnter={() => painting.current !== null && paint(i, painting.current)}
                  />
                );
              })}
            </div>
          </td>
          <td className="top">
            <div className="dim">palette (right-click erases)</div>
            <div className="palette">
              {PALETTE.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  title={i === 0 ? "eraser" : p}
                  className={`swatch${i === color ? " selected" : ""}${i === 0 ? " eraser" : ""}`}
                  style={{ background: i ? p : undefined }}
                  onClick={() => setColor(i)}
                >
                  {i === 0 ? "∅" : ""}
                </button>
              ))}
            </div>
            <div className="dim" style={{ marginTop: 12 }}>
              preview
            </div>
            <div className="preview-row">
              <PixelIcon data={pixels} size={128} />
              <PixelIcon data={pixels} size={32} />
              <PixelIcon data={pixels} size={16} />
            </div>
            <form action={setObjectIcon} className="row" style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={objectId} />
              <input type="hidden" name="icon" value={pixels} />
              <button type="button" onClick={() => setPixels(generateSprite((Math.random() * 2 ** 32) >>> 0))}>
                randomize
              </button>
              <button type="button" onClick={() => setPixels("0".repeat(PIXELS))}>
                clear
              </button>
              <button type="button" disabled={!dirty} onClick={() => setPixels(initial)}>
                revert
              </button>
              <button type="submit" className="primary" disabled={!dirty}>
                save icon
              </button>
              {dirty && <span className="warn">● unsaved</span>}
            </form>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
