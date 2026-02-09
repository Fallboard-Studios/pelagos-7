import './OceanScene.css';

// ========================================
// TYPES & INTERFACES
// ========================================
interface OceanSceneProps {
  width?: number;
  height?: number;
}

// ========================================
// CONSTANTS
// ========================================
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const BACKGROUND_COLOR = '#0a1128';

// ========================================
// COMPONENT
// ========================================
export function OceanScene({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: OceanSceneProps = {}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="ocean-scene"
      width={width}
      height={height}
    >
      <rect fill={BACKGROUND_COLOR} width={width} height={height} />
      <g id="background-layer" />
      <g id="robot-layer" />
      <g id="foreground-layer" />
      <g id="ui-layer" />
    </svg>
  );
}
