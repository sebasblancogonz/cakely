import React from 'react';
import { IngredientPrice } from '@types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface IngredientDetailsProps {
  ingredient: IngredientPrice;
}

export function IngredientDetails({ ingredient }: IngredientDetailsProps) {
  if (!ingredient) return null;

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle>{ingredient.name}</CardTitle>
        <CardDescription>Detalles del Ingrediente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-1">
          <Label className="font-semibold col-span-1">ID:</Label>
          <span className="col-span-2">{ingredient.id}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Label className="font-semibold col-span-1">Unidad de Precio:</Label>
          <span className="col-span-2">{ingredient.unit}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Label className="font-semibold col-span-1">Precio / Unidad:</Label>
          <span className="col-span-2">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 4
            }).format(Number(ingredient.pricePerUnit))}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Label className="font-semibold col-span-1">Proveedor:</Label>
          <span className="col-span-2">{ingredient.supplier || '-'}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Label className="font-semibold col-span-1">
            Última Actualización:
          </Label>
          <span className="col-span-2">
            {ingredient.updatedAt
              ? new Date(ingredient.updatedAt).toLocaleString('es-ES')
              : '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
