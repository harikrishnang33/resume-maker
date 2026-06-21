import { Svg, Path, Rect, Circle } from '@react-pdf/renderer';
import type { IconName } from '../types';

/**
 * The contact icons, ported from src/components/Icon.tsx to react-pdf's SVG
 * primitives so they render as crisp vectors in the PDF (same 24x24 paths).
 */
export function PdfIcon({ name, size, color = '#000' }: { name: IconName; size: number; color?: string }) {
  const box = { width: size, height: size, viewBox: '0 0 24 24' };
  const stroke = { stroke: color, strokeWidth: 1.8, fill: 'none' as const };
  const fill = { fill: color };

  switch (name) {
    case 'email':
      return (
        <Svg {...box}>
          <Rect x={3} y={5} width={18} height={14} rx={2} {...stroke} />
          <Path d="M3 7 l9 6 l9 -6" {...stroke} />
        </Svg>
      );
    case 'phone':
      return (
        <Svg {...box}>
          <Path
            d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.6a1 1 0 0 1-.25 1z"
            {...fill}
          />
        </Svg>
      );
    case 'location':
      return (
        <Svg {...box}>
          <Path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" {...fill} />
        </Svg>
      );
    case 'linkedin':
      return (
        <Svg {...box}>
          <Path
            d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95s-2.08 1.4-2.08 2.85V21H9z"
            {...fill}
          />
        </Svg>
      );
    case 'github':
      return (
        <Svg {...box}>
          <Path
            d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"
            {...fill}
          />
        </Svg>
      );
    case 'web':
      return (
        <Svg {...box}>
          <Circle cx={12} cy={12} r={9} {...stroke} />
          <Path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" {...stroke} />
        </Svg>
      );
    default:
      return null;
  }
}
