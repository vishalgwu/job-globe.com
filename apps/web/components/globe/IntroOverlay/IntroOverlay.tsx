"use client";

interface IntroOverlayProps {
  isVisible: boolean;
  onEnter: () => void;
  onPersonalize: () => void;
}

export function IntroOverlay({
  isVisible,
  onEnter,
  onPersonalize,
}: IntroOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="intro-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro-copy">
        <p className="eyebrow">Jarvis Job Globe</p>
        <h1 id="intro-title">Find opportunity on the globe.</h1>
        <p>
          Explore hiring demand from world scale to street scale, then open verified roles in
          seconds.
        </p>
      </div>
      <div className="intro-actions">
        <button className="primary-action" type="button" onClick={onEnter}>
          Enter the Globe
        </button>
        <button type="button" onClick={onPersonalize}>
          Personalise My Search
        </button>
      </div>
    </div>
  );
}
