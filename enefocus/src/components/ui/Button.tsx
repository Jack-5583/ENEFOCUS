'use client';
import { type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: Props) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800 active:bg-gray-900',
    secondary: 'bg-white text-black border border-gray-200 hover:bg-gray-50 active:bg-gray-100',
    subtle: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
