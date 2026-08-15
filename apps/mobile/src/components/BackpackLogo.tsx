import MainBackpackLogo from '../../assets/main_backpack_logo.svg';

interface BackpackLogoProps {
  size?: number;
}

export function BackpackLogo({ size = 32 }: BackpackLogoProps) {
  return <MainBackpackLogo width={size} height={size} />;
}
