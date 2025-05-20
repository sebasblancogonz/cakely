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
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface SubscriptionRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionPageUrl?: string;
  hideCloseButtonProp?: boolean;
}

export function SubscriptionRequiredModal({
  isOpen,
  onClose,
  subscriptionPageUrl = '/ajustes/suscripcion',
  hideCloseButtonProp = false
}: SubscriptionRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToSubscription = () => {
    router.push(subscriptionPageUrl);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(openState) => {
        if (!openState) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton={hideCloseButtonProp}
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
        <DialogFooter className="pt-4 sm:justify-center">
          <Button
            onClick={handleGoToSubscription}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Ver Planes / Suscribirse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
