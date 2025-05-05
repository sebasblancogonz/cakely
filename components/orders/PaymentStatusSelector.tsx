'use client';

import React, { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PaymentStatus } from '@types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updatePaymentStatusAction } from '@/app/(dashboard)/app/pedidos/actions';

interface PaymentStatusSelectorProps {
  orderId: number;
  currentStatus: PaymentStatus;
  disabled?: boolean;
}

export function PaymentStatusSelector({
  orderId,
  currentStatus,
  disabled = false
}: PaymentStatusSelectorProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: PaymentStatus) => {
    if (newStatus === currentStatus || isPending || disabled) {
      return;
    }
    startTransition(async () => {
      const result = await updatePaymentStatusAction(orderId, newStatus);
      if (result.success) {
        toast({ title: 'Éxito', description: result.message });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    });
  };

  return (
    <div className="relative">
      <Select
        value={currentStatus}
        onValueChange={(value) => handleStatusChange(value as PaymentStatus)}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="h-8 text-xs w-[130px] data-[state=open]:ring-primary">
          {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          <SelectValue placeholder="Cambiar estado..." />
        </SelectTrigger>
        <SelectContent>
          {Object.values(PaymentStatus).map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
