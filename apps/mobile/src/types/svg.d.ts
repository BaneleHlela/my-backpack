// Lets TypeScript resolve local `.svg` imports as React components — Metro's actual bundling
// of them is handled by react-native-svg-transformer (see metro.config.js). Without this, `.svg`
// imports type-check as `any` at best or fail resolution entirely under strict mode.
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: FC<SvgProps>;
  export default content;
}
