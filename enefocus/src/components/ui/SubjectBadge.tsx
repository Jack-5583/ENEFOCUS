'use client';
import { subjectColorMap } from '@/lib/utils';
import type { SubjectColor } from '@/lib/types';

interface Props {
  name: string;
  color: SubjectColor;
  size?: 'sm' | 'md';
}

export function SubjectBadge({ name, color, size = 'md' }: Props) {
  const c = subjectColorMap[color];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${c.light} ${c.text}`}
    >
      <span className={`inline-block rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${c.bg}`} />
      {name}
    </span>
  );
}
