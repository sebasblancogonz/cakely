'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  variant?:
    | 'link'
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | null
    | undefined;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined;
  className?: string;
  ariaLabel?: string;
}

export function BackButton({
  variant = 'outline',
  size = 'default',
  className,
  ariaLabel = 'Volver a la página anterior'
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('flex-shrink-0', className)}
      onClick={() => router.back()}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="h-4 w-4" /> Volver
    </Button>
  );
}
