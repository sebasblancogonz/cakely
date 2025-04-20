'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavItem({
  href,
  label,
  children,
  isExpanded
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  isExpanded: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const linkContent = (
    <>
      {children}
      <span
        className={clsx('ml-2 whitespace-nowrap', !isExpanded && 'sr-only')}
      >
        {label}
      </span>
    </>
  );

  const linkClasses = clsx(
    'flex items-center gap-2 rounded-lg text-muted-foreground transition-all hover:text-primary',
    isActive && 'bg-muted text-primary',
    isExpanded
      ? 'w-full h-auto justify-start px-3 py-2'
      : 'h-9 w-9 justify-center md:h-8 md:w-8'
  );

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className={linkClasses}>
            {children}
            <span className="sr-only">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} className={linkClasses}>
      {linkContent}
    </Link>
  );
}
