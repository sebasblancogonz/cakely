// src/components/customers/CustomerCard.tsx (o donde prefieras)
'use client'; // Puede ser server component si solo muestra datos y usa Link

import React from 'react';
import Link from 'next/link';
import { Customer } from '@types'; // Ajusta ruta
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
// Asume que tienes estos helpers o impórtalos/defínelos
import { displayDate } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  Instagram,
  CalendarPlus,
  BotMessageSquare,
  Eye,
  ListOrdered
} from 'lucide-react'; // Iconos

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const cleanInstagramHandle = (handle: string | null | undefined): string =>
    handle?.replace(/^@/, '') || '';
  const instagramCleaned = cleanInstagramHandle(customer.instagramHandle);

  return (
    <Card
      key={customer.id}
      className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary flex-shrink-0" />{' '}
          {customer.name}
        </CardTitle>
        <CardDescription className="text-xs flex items-center gap-1 pt-1">
          <CalendarPlus className="h-3 w-3" /> Cliente desde:{' '}
          {displayDate(customer.registrationDate, 'P')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm pb-4">
        <Separator />
        <div className="pt-2 space-y-1">
          {customer.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${customer.phone}`} className="hover:underline">
                {customer.phone}
              </a>
            </p>
          )}
          {customer.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="hover:underline truncate"
              >
                {customer.email}
              </a>
            </p>
          )}
          {customer.instagramHandle && (
            <p className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a
                href={`https://instagram.com/${instagramCleaned}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                @{instagramCleaned}
              </a>
            </p>
          )}
        </div>
        {(customer.phone || customer.instagramHandle) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2">
            {customer.phone && (
              <a
                href={`https://wa.me/${customer.phone}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs inline-flex items-center gap-1 text-green-600 hover:underline"
              >
                <BotMessageSquare className="h-3 w-3" /> WhatsApp
              </a>
            )}
            {customer.instagramHandle && (
              <a
                href={`https://ig.me/m/${instagramCleaned}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs inline-flex items-center gap-1 text-purple-600 hover:underline"
              >
                <Instagram className="h-3 w-3" /> Instagram DM
              </a>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/pedidos?customerId=${customer.id}`}>
            <ListOrdered className="mr-1.5 h-4 w-4" /> Pedidos
          </Link>
        </Button>
        <Button variant="secondary" size="sm" className="w-full" asChild>
          <Link href={`/clientes/${customer.id}`}>
            <Eye className="mr-1.5 h-4 w-4" /> Detalles
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
