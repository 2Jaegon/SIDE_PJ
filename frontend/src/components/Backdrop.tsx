import React from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { useReducedMotion } from './office3d/useReducedMotion';
import { useTheme } from '../theme';

// ???꾩껜 ?ㅼ뿉???꾩＜ 泥쒖쿇???먮Ⅴ??湲덈튆 洹몃씪?붿뼵?? ?좊━ ?⑤꼸 ?ㅻ줈 鍮꾩퀜 蹂댁씠???⑸룄???대몼寃??뚮윭 ?붾떎.
export const Backdrop: React.FC = () => {
  const reduced = useReducedMotion();
  const dark = useTheme() === 'dark';
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none opacity-[0.55]">
      <ShaderGradientCanvas style={{ position: 'absolute', inset: 0 }} pixelDensity={1} fov={45} powerPreference="low-power">
        <ShaderGradient
          type="plane"
          animate={reduced ? 'off' : 'on'}
          uSpeed={0.12}
          uStrength={3}
          uDensity={1.2}
          uFrequency={4}
          uAmplitude={0}
          color1={dark ? '#d97757' : '#ebd9cf'}
          color2={dark ? '#4a281c' : '#f5ece5'}
          color3={dark ? '#1f1e1d' : '#faf9f5'}
          brightness={0.9}
          reflection={0.05}
          grain="off"
          lightType="3d"
          cAzimuthAngle={180}
          cPolarAngle={90}
          cDistance={3.6}
          cameraZoom={1}
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={0}
          rotationZ={0}
        />
      </ShaderGradientCanvas>
    </div>
  );
};
