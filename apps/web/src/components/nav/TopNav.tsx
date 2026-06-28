// Single horizontal nav bar: [FieldSwitcher] [Breadcrumb] [ProfileSwitcher]
import FieldSwitcher from './FieldSwitcher';
import Breadcrumb from './Breadcrumb';
import ProfileSwitcher from './ProfileSwitcher';

export default function TopNav() {
  return (
    <nav className="w-full h-[60px] flex items-center px-4 gap-3 backdrop-blur-md bg-white/30 border-b border-white/40 sticky top-0 z-40">
      <div className="flex-shrink-0">
        <FieldSwitcher />
      </div>

      <div className="flex-1 flex justify-center overflow-hidden px-2">
        <Breadcrumb />
      </div>

      <div className="flex-shrink-0">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}
