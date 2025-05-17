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
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface SubscriptionReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionPageUrl?: string;
}

export function SubscriptionReminderModal({
  isOpen,
  onClose,
  subscriptionPageUrl = '/ajustes/suscripcion'
}: SubscriptionReminderModalProps) {
  const router = useRouter();

  const handleGoToSubscription = () => {
    router.push(subscriptionPageUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Actualiza tu Suscripción
          </DialogTitle>
          <DialogDescription className="pt-2">
            Parece que tu negocio no tiene una suscripción activa o tu periodo
            de prueba ha finalizado. Para continuar disfrutando de todas las
            funcionalidades de Cakely, por favor, elige un plan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Más Tarde
          </Button>
          <Button onClick={handleGoToSubscription} className="gap-1">
            <ShoppingCart className="h-4 w-4" /> Ver Planes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
