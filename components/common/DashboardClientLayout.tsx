'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useBusinessProfile } from '@/hooks/use-business-profile';
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
  Calculator,
  Loader2,
  BarChart3,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
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
import { BusinessProfileData } from '@/types/types';
import { useSession } from 'next-auth/react';
import { PLANS_CONFIG } from '@/config/plans';

interface DashboardClientLayoutProps {
  children: React.ReactNode;
  userComponent: React.ReactNode;
}

export default function DashboardClientLayout({
  children,
  userComponent
}: DashboardClientLayoutProps) {
  const pathname = usePathname();
  const { profile, isLoadingProfile } = useBusinessProfile();
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const baseTitle = 'Panel de Control';
  const defaultBusinessName = 'Cakely';

  useEffect(() => {
    if (isLoadingProfile) {
      document.title = 'Cargando perfil... | ' + baseTitle;
    } else if (profile?.name) {
      document.title = `${profile.name} - ${baseTitle}`;
    } else {
      document.title = `${defaultBusinessName} - ${baseTitle}`;
    }
  }, [isLoadingProfile, profile?.name]);

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
        label = `Editar Pedido`;
      } else if (/^\d+$/.test(segment) && segments[index - 1] === 'pedidos') {
        label = `Detalles`;
      } else if (/^\d+$/.test(segment) && segments[index - 1] === 'clientes') {
        label = `Detalles`;
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
            isSuperAdmin={user?.isSuperAdmin}
            isExpanded={isNavExpanded}
            onToggle={() => setIsNavExpanded(!isNavExpanded)}
            profile={profile}
            isLoadingProfile={isLoadingProfile}
          />
          <div
            className={cn(
              'flex flex-col sm:gap-4 sm:py-4 transition-all duration-500 ease-in-out',
              isNavExpanded ? 'sm:pl-64' : 'sm:pl-14'
            )}
          >
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <MobileNav
                profile={profile}
                isSuperAdmin={user?.isSuperAdmin}
                isLoadingProfile={isLoadingProfile}
              />
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
  profile: BusinessProfileData | null;
  isLoadingProfile: boolean;
  isSuperAdmin: boolean | undefined;
}

function DesktopNav({
  profile,
  isSuperAdmin,
  isLoadingProfile,
  isExpanded,
  onToggle
}: DesktopNavProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const planId = user?.planId;
  const userPlanConfig = planId ? PLANS_CONFIG[planId] : null;
  const hasAnalyticsAccess =
    userPlanConfig && userPlanConfig?.analiticasAvanzadas;
  const hasQuoteCalculatorAccess =
    userPlanConfig && userPlanConfig?.calculadoraPresupuesto;
  const hasPlan = userPlanConfig !== null;

  const transitionDuration = 'duration-500';
  const defaultBusinessName = 'Mi Negocio';
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
          href="/"
          className={cn(
            'group flex items-center justify-center gap-2 rounded-lg text-lg font-semibold text-primary-foreground',
            isExpanded
              ? 'h-12 self-start ml-1 px-2'
              : 'h-9 w-9 self-center justify-center md:h-8 md:w-8'
          )}
        >
          {isLoadingProfile ? (
            <div
              className={cn(
                'flex items-center justify-center',
                isExpanded ? 'w-full' : 'h-full w-full'
              )}
            >
              <Loader2
                className={cn(
                  'h-5 w-5 animate-spin text-muted-foreground',
                  isExpanded && 'mr-auto ml-1'
                )}
              />
            </div>
          ) : profile?.logoUrl ? (
            <>
              <Image
                src={profile.logoUrl}
                alt={profile.name ?? defaultBusinessName}
                width={isExpanded ? 36 : 32}
                height={isExpanded ? 36 : 32}
                className="rounded-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {isExpanded && (
                <span className="text-sm font-semibold text-foreground pl-1">
                  {profile.name ?? defaultBusinessName}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-md bg-muted text-muted-foreground text-xs',
                  isExpanded ? 'h-9 w-9' : 'h-8 w-8'
                )}
              >
                {profile?.name
                  ? profile.name.substring(0, 1).toUpperCase()
                  : 'B'}
              </span>
              {isExpanded && (
                <span className="text-sm font-semibold text-foreground pl-1">
                  {profile?.name ?? defaultBusinessName}
                </span>
              )}
            </>
          )}
          {!isExpanded && (
            <span className="sr-only">
              {profile?.name ?? defaultBusinessName}
            </span>
          )}
        </Link>

        <NavItem
          href="/"
          label="Inicio"
          isExpanded={isExpanded}
          animationDuration={transitionDuration}
        >
          <Home className="h-5 w-5" />
        </NavItem>
        {hasPlan && (
          <>
            {hasAnalyticsAccess && (
              <NavItem
                href="/estadisticas"
                label="Estadísticas"
                isExpanded={isExpanded}
                animationDuration={transitionDuration}
              >
                <BarChart3 className="h-5 w-5" />
              </NavItem>
            )}

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
            {hasQuoteCalculatorAccess && (
              <NavItem
                href="/presupuesto"
                label="Presupuesto"
                isExpanded={isExpanded}
                animationDuration={transitionDuration}
              >
                <Calculator className="h-5 w-5" />
              </NavItem>
            )}
            {isSuperAdmin && (
              <NavItem
                href="/admin"
                label="Admin area"
                isExpanded={isExpanded}
                animationDuration={transitionDuration}
              >
                <Settings2 className="h-5 w-5" />
              </NavItem>
            )}
          </>
        )}
      </nav>

      <nav className="mt-auto flex flex-col gap-4 px-2 sm:py-5">
        {hasPlan && (
          <>
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
          </>
        )}
      </nav>
    </aside>
  );
}

interface MobileNavProps {
  profile: BusinessProfileData | null;
  isLoadingProfile: boolean;
  isSuperAdmin: boolean | undefined;
}

function MobileNav({
  profile,
  isLoadingProfile,
  isSuperAdmin
}: MobileNavProps) {
  const defaultBusinessName = 'Mi Negocio';
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <SheetHeader hidden={true}>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="grid gap-6 text-lg font-medium mt-4">
          <SheetTrigger asChild>
            <Link
              href="/"
              className="flex items-center gap-4 px-2.5 text-foreground hover:text-foreground"
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isLoadingProfile ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : profile?.logoUrl ? (
                  <Image
                    src={profile.logoUrl}
                    alt={profile.name ?? defaultBusinessName}
                    width={32}
                    height={32}
                    className="rounded-md"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="flex items-center justify-center h-8 w-8 rounded-md bg-muted text-muted-foreground text-sm">
                    {profile?.name
                      ? profile.name.substring(0, 1).toUpperCase()
                      : 'B'}
                  </span>
                )}
              </div>
              <span className="text-base text-foreground truncate">
                {isLoadingProfile
                  ? 'Cargando...'
                  : (profile?.name ?? defaultBusinessName)}
              </span>
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Home className="h-5 w-5" /> Inicio
            </Link>
          </SheetTrigger>
          <SheetTrigger asChild>
            <Link
              href="/estadisticas"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="h-5 w-5" /> Estadisticas
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
          {isSuperAdmin && (
            <SheetTrigger asChild>
              <Link
                href="/admin"
                className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-5 w-5" /> Admin area
              </Link>
            </SheetTrigger>
          )}
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
