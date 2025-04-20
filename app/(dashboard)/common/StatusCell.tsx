import * as React from 'react';
import { OrderStatus } from '@types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface StatusCellProps {
  orderId: number;
  currentStatus: OrderStatus;
  onStatusChange: (orderId: number, newStatus: OrderStatus) => void;
  disabled?: boolean;
}

function getEnumMemberByValue(value: string): OrderStatus | undefined {
  const enumEntry = Object.entries(OrderStatus).find(
    ([key, val]) => val === value
  );
  return enumEntry
    ? OrderStatus[enumEntry[0] as keyof typeof OrderStatus]
    : undefined;
}

export function Status({
  orderId,
  currentStatus,
  onStatusChange,
  disabled = false
}: StatusCellProps) {
  const statusStyles: Record<string, string> = {
    pendiente: 'bg-pending text-pending-text',
    preparando: 'bg-wip text-wip-text',
    listo: 'bg-ready text-ready-text',
    entregado: 'bg-delivered  text-delivered-text'
  };

  const handleSelect = (selectedValue: string) => {
    const newStatusEnumMember = getEnumMemberByValue(selectedValue);

    if (
      newStatusEnumMember &&
      newStatusEnumMember !== currentStatus &&
      !disabled
    ) {
      onStatusChange(orderId, newStatusEnumMember);
    }
  };

  const statusOptions = Object.values(OrderStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Badge
          variant="outline"
          className={`cursor-pointer capitalize ${
            statusStyles[
              currentStatus
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase()
            ]
          }`}
        >
          {currentStatus}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {statusOptions.map((statusValue) => (
          <DropdownMenuItem
            key={statusValue}
            disabled={statusValue === currentStatus}
            onClick={() => handleSelect(statusValue)}
            className="cursor-pointer"
          >
            {statusValue}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
