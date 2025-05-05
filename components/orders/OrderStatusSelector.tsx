'use client';

import React, { useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { OrderStatus } from '@types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updateOrderStatusAction } from '@/app/(dashboard)/app/pedidos/actions';

interface OrderStatusSelectorProps {
  orderId: number;
  currentStatus: OrderStatus;
  disabled?: boolean;
}

export function OrderStatusSelector({
  orderId,
  currentStatus,
  disabled = false
}: OrderStatusSelectorProps) {
  const { toast } = useToast();

  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (newStatus === currentStatus || isPending || disabled) {
      return;
    }

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, newStatus);
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
        onValueChange={(value) => handleStatusChange(value as OrderStatus)}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="h-8 text-xs w-[130px] data-[state=open]:ring-primary">
          {/* Mostrar loader dentro del trigger si está pendiente */}
          {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          <SelectValue placeholder="Cambiar estado..." />
        </SelectTrigger>
        <SelectContent>
          {Object.values(OrderStatus).map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
