'use client';

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  elevated?: boolean;
  dark?: boolean;
}

export function Card({ children, className = '', onClick, elevated, dark }: Props) {
  const base = 'rounded-2xl';
  const surface = dark ? 'bg-black text-white' : 'bg-white text-gray-900';
  const shadow = elevated ? 'shadow-md' : '';
  const cursor = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

  return (
    <div
      className={`${base} ${surface} ${shadow} ${cursor} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
