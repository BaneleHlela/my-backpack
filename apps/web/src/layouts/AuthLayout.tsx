import { Outlet } from 'react-router-dom';
import { ASSETS } from '@my-backpack/shared';

export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${ASSETS.wallpapers.landscape})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 w-full max-w-md px-2">
        <Outlet />
      </div>
    </div>
  );
}
