'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SubscriptionRequiredModalProps {
  isOpen: boolean;

  subscriptionPageUrl?: string;
}

export function SubscriptionRequiredModal({
  isOpen,
  subscriptionPageUrl = '/ajustes/suscripcion'
}: SubscriptionRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToSubscription = () => {
    router.push(subscriptionPageUrl);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent
        hideCloseButton={true}
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          e.preventDefault();
          toast({
            title: 'Acción Requerida',
            description: 'Por favor, elige un plan para continuar.',
            variant: 'default'
          });
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          toast({
            title: 'Acción Requerida',
            description: 'Por favor, elige un plan para continuar.',
            variant: 'default'
          });
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Suscripción Requerida
          </DialogTitle>
          <DialogDescription className="pt-2 text-left">
            Para acceder a esta funcionalidad y continuar usando todas las
            herramientas de Cakely, necesitas una suscripción activa o un
            periodo de prueba vigente.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Por favor, elige un plan para continuar o reactivar tu acceso.
        </p>
        <DialogFooter className="pt-4">
          <Button onClick={handleGoToSubscription} className="w-full">
            <ShieldCheck className="mr-2 h-4 w-4" /> Ver Planes / Suscribirse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
