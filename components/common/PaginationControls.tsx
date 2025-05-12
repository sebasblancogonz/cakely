// src/components/common/PaginationControls.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Para App Router
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number; // Número de página actual (1-basado)
  totalPages: number;
  limit: number; // Elementos por página (necesario para calcular el offset)
  basePath: string; // La ruta base de la página (ej: /admin/users, /pedidos)
  searchParams: URLSearchParams; // Los parámetros de búsqueda actuales para preservarlos
}

export function PaginationControls({
  currentPage,
  totalPages,
  limit,
  basePath,
  searchParams
}: PaginationControlsProps) {
  const router = useRouter();

  const handleNavigation = (newPage: number) => {
    const newOffset = (newPage - 1) * limit;
    const params = new URLSearchParams(searchParams.toString()); // Clona los params actuales
    params.set('offset', newOffset.toString());
    // 'limit' ya debería estar en searchParams o se añadirá por defecto
    // si se gestiona en la página que llama a la API.
    // Si no, asegúrate de que 'limit' también se setee:
    // params.set('limit', limit.toString());

    router.push(`${basePath}?${params.toString()}`, { scroll: false });
  };

  if (totalPages <= 1) {
    return null; // No mostrar controles si solo hay una página o ninguna
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleNavigation(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Anterior</span>
      </Button>
      {/* Opcional: Mostrar números de página (más complejo, omitido por simplicidad) */}
      {/* Podrías añadir un input o select para ir a una página específica si son muchas */}
      <span className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleNavigation(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Página siguiente"
      >
        <span className="hidden sm:inline mr-1">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
