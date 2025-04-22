'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PanelLeft,
  Settings,
  ShoppingCart,
  Users2,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { Analytics } from '@vercel/analytics/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import DashboardBreadcrumb, {
  BreadcrumbTrailItem
} from './DashboardBreadcrumb';
import Providers from '../../app/(dashboard)/providers';
import { SearchInput } from '../../app/(dashboard)/search';
import { NavItem } from '../../app/(dashboard)/nav-item';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userComponent: React.ReactNode;
}

export default function DashboardClientLayout({
  children,
  userComponent
}: DashboardClientLayoutProps) {
  const pathname = usePathname();
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const breadcrumbTrail = useMemo((): BreadcrumbTrailItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const segmentLabels: Record<string, string> = {
      pedidos: 'Pedidos',
      clientes: 'Clientes',
      analytics: 'Analytics'
    };
    const trail: BreadcrumbTrailItem[] = [{ label: 'Dashboard', href: '/' }];
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      let label =
        segmentLabels[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      if (
        segment === 'editar' &&
        segments[index - 1] === 'pedidos' &&
        segments[index + 1]
      ) {
        label = `Editar Pedido #${segments[index + 1]}`;
      } else if (/^\d+$/.test(segment) && segments[index - 1] === 'pedidos') {
        label = `Pedido #${segment}`;
      } else if (/^\d+$/.test(segment) && segments[index - 1] === 'clientes') {
        label = `Cliente #${segment}`;
      }
      if (isLast) {
        trail.push({ label });
      } else {
        if (!/^\d+$/.test(segment)) {
          trail.push({ label, href: currentPath });
        }
      }
    });
    return trail;
  }, [pathname]);

  return (
    <TooltipProvider>
      <Providers>
        <main className="flex min-h-screen w-full flex-col bg-muted/40">
          <DesktopNav
            isExpanded={isNavExpanded}
            onToggle={() => setIsNavExpanded(!isNavExpanded)}
          />
          <div
            className={cn(
              'flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 ease-in-out',
              isNavExpanded ? 'sm:pl-64' : 'sm:pl-14'
            )}
          >
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <MobileNav />
              <DashboardBreadcrumb trail={breadcrumbTrail} />
              <SearchInput />
              {userComponent}
            </header>
            <main className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4 bg-muted/40">
              {children}
            </main>
          </div>
          <Analytics />
        </main>
      </Providers>
    </TooltipProvider>
  );
}

interface DesktopNavProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function DesktopNav({ isExpanded, onToggle }: DesktopNavProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-300 ease-in-out',
        isExpanded ? 'w-52' : 'w-14'
      )}
    >
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="#"
          className={cn(
            'group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base',
            isExpanded && 'self-start ml-3 mb-2'
          )}
        >
          <Image
            src="/logo small-01.webp"
            alt="Aura Bakery Logo"
            width={32}
            height={32}
            className="rounded-full"
          />
        </Link>

        <NavItem href="/" label="Dashboard" isExpanded={isExpanded}>
          <Home className="h-5 w-5" />
        </NavItem>
        <NavItem href="/pedidos" label="Pedidos" isExpanded={isExpanded}>
          <ShoppingCart className="h-5 w-5" />
        </NavItem>
        <NavItem href="/clientes" label="Clientes" isExpanded={isExpanded}>
          <Users2 className="h-5 w-5" />
        </NavItem>
        <NavItem href="/calendario" label="Calendario" isExpanded={isExpanded}>
          <Calendar className="h-5 w-5" />
        </NavItem>
      </nav>

      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="#"
              className={cn(
                'flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                isExpanded
                  ? 'w-full justify-start px-2.5 py-1.5'
                  : 'h-9 w-9 md:h-8 md:w-8'
              )}
            >
              <Settings className="h-5 w-5" />
              <span className={cn('ml-2', !isExpanded && 'sr-only')}>
                Ajustes
              </span>
            </Link>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right">Ajustes</TooltipContent>}
        </Tooltip>

        <Button
          onClick={onToggle}
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-full h-8 w-8 mt-2 border',
            isExpanded && 'self-end mr-2'
          )}
          aria-label={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <nav className="grid gap-6 text-lg font-medium mt-4">
          <SheetTrigger asChild>
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base mb-4"
            >
              <Image
                src="/logo small-01.webp"
                alt="Aura Bakery Logo"
                width={32}
                height={32}
                className="rounded-full transition-all group-hover:scale-110"
              />
              <span className="sr-only">Aura Bakery</span>
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Home className="h-5 w-5" /> Dashboard
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/pedidos"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <ShoppingCart className="h-5 w-5" /> Pedidos
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/clientes"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Users2 className="h-5 w-5" /> Clientes
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/calendario"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-5 w-5" /> Calendario
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="#"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" /> Ajustes
            </Link>
          </SheetTrigger>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
