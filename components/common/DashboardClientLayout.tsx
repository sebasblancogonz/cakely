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
  Calendar,
  Calculator
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
              'flex flex-col sm:gap-4 sm:py-4 transition-all duration-500 ease-in-out',
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
  const transitionDuration = 'duration-500';
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all ease-in-out overflow-x-hidden',
        transitionDuration,
        isExpanded ? 'w-52' : 'w-16'
      )}
    >
      <nav className="flex flex-col gap-4 px-2 sm:py-5">
        <Link
          href="#"
          className={cn(
            'group flex h-9 w-9 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base',
            isExpanded
              ? 'self-start ml-1 h-9 w-auto'
              : 'self-center h-9 w-9 justify-center md:h-8 md:w-8'
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

        <NavItem
          href="/"
          label="Dashboard"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Home className="h-5 w-5" />
        </NavItem>
        <NavItem
          href="/pedidos"
          label="Pedidos"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <ShoppingCart className="h-5 w-5" />
        </NavItem>
        <NavItem
          href="/clientes"
          label="Clientes"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Users2 className="h-5 w-5" />
        </NavItem>
        <NavItem
          href="/calendario"
          label="Calendario"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Calendar className="h-5 w-5" />
        </NavItem>
        <NavItem
          href="/presupuesto"
          label="Presupuesto"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Calculator className="h-5 w-5" />
        </NavItem>
      </nav>

      <nav className="mt-auto flex flex-col gap-4 px-2 sm:py-5">
        <NavItem
          href="/ajustes"
          label="Ajustes"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Settings className="h-5 w-5" />
        </NavItem>
        <div
          className={cn(
            'flex w-full mt-2',
            isExpanded ? 'justify-end pr-1' : 'justify-center'
          )}
        >
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggle}
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 border"
                aria-label={isExpanded ? 'Colapsar menú' : 'Expandir menú'}
              >
                {isExpanded ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {isExpanded ? 'Colapsar' : 'Expandir'}
            </TooltipContent>
          </Tooltip>
        </div>
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
              href="/presupuesto"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Calculator className="h-5 w-5" /> Presupuesto
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/ajustes"
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
