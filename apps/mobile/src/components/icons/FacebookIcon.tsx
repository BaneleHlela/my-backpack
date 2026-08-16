// Official Facebook "f" mark (blue roundel), hand-drawn via react-native-svg — see
// GoogleIcon.tsx's module comment for why this is an inline SVG rather than an icon-font glyph.
// Replaces the 📘 emoji placeholder on login.tsx/signup.tsx's "Continue with Facebook" button.
import Svg, { Path } from 'react-native-svg';

interface FacebookIconProps {
  size?: number;
}

export function FacebookIcon({ size = 18 }: FacebookIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Path
        fill="#1877F2"
        d="M36,18c0-9.94-8.06-18-18-18S0,8.06,0,18c0,8.98,6.58,16.41,15.19,17.76V23.13h-4.57v-5.13h4.57
        v-3.91c0-4.51,2.69-7,6.8-7c1.97,0,4.03,0.35,4.03,0.35v4.43h-2.27c-2.24,0-2.94,1.39-2.94,2.81v3.32h5l-0.8,5.13h-4.2v12.63
        C29.42,34.41,36,26.98,36,18z"
      />
    </Svg>
  );
}
