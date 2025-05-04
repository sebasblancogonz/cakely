import * as React from 'react';
import { PaymentStatus } from '@types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface StatusCellProps {
  orderId: number;
  currentStatus: PaymentStatus;
  onStatusChange: (orderId: number, newStatus: PaymentStatus) => void;
  disabled?: boolean;
}

function getEnumMemberByValue(value: string): PaymentStatus | undefined {
  const enumEntry = Object.entries(PaymentStatus).find(
    ([key, val]) => val === value
  );
  return enumEntry
    ? PaymentStatus[enumEntry[0] as keyof typeof PaymentStatus]
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
    parcial: 'bg-wip text-wip-text',
    pagado: 'bg-delivered  text-delivered-text',
    cancelado: 'bg-cancelled text-cancelled-text',
    reembolsado: 'bg-refunded text-refunded-text'
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

  const statusOptions = Object.values(PaymentStatus);

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
