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
import { cn } from '@/lib/utils';

export function NavItem({
  href,
  label,
  children,
  isExpanded,
  animationDuration
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  isExpanded: boolean;
  animationDuration?: string;
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

  const wrapperClasses = cn(
    'flex items-center h-9 md:h-8 px-3 py-2 rounded-lg text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isActive && 'bg-muted text-primary',
    'w-full justify-start'
  );

  const linkClasses = clsx(
    'flex items-center gap-2 rounded-lg text-muted-foreground transition-all hover:text-primary',
    isActive && 'bg-muted text-primary',
    isExpanded
      ? 'w-full h-9 justify-start px-3'
      : 'h-9 w-9 justify-center md:h-8 md:w-8'
  );

  const contentClasses = cn(
    'flex items-center gap-2 overflow-hidden w-full' // Overflow hidden aquí es importante
  );

  const labelClasses = cn(
    'whitespace-nowrap transition-all ease-in-out', // Transición para max-width y opacity
    animationDuration, // Usa la duración pasada como prop o el default
    isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0' // Animar max-width y opacity
  );

  const itemContent = (
    <div className={contentClasses}>
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        {children}
      </div>
      <span className={labelClasses}>{label}</span>
    </div>
  );

  if (!isExpanded) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link href={href} className={wrapperClasses} aria-label={label}>
            {itemContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} className={wrapperClasses}>
      {linkContent}
    </Link>
  );
}
