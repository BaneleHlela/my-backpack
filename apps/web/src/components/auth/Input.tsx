import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps {
  icon: LucideIcon;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

export default function Input({ icon: Icon, type, placeholder, value, onChange, error }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-[1vh]">
      <div
        className={`relative flex items-center border ${
          error ? 'border-red-400' : 'border-white/40'
        } rounded-[.5vh] bg-white focus-within:border-black transition-colors`}
      >
        <Icon className="absolute left-[1vh] w-[2.2vh] h-[2.2vh] text-gray-500 pointer-events-none" />
        <input
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full py-[1.2vh] pl-[3.8vh] pr-[3.8vh] bg-transparent text-[2vh] outline-none text-gray-800 placeholder-gray-400"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-[1vh] text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword
              ? <EyeOff className="w-[2.2vh] h-[2.2vh]" />
              : <Eye className="w-[2.2vh] h-[2.2vh]" />
            }
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-[1.7vh] mt-[0.4vh]">{error}</p>}
    </div>
  );
}
