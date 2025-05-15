'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Package, Users, Beaker, Loader2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import OrderDetails from '@/components/orders/OrderDetails';
import CustomerDetails from '@/components/customers/CustomerDetails';
import { IngredientDetails } from '@/components/common/IngredientDetails';
import { Order, Customer, IngredientPrice } from '@types';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: number;
  type: 'order' | 'customer' | 'ingredient';
  title: string;
  description?: string;
  url: string;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    type: SearchResult['type'];
  } | null>(null);
  const [itemDetails, setItemDetails] = useState<
    Order | Customer | IngredientPrice | null
  >(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (query) {
      setIsLoading(true);
      setError(null);
      setResults([]);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res
              .json()
              .catch(() => ({ message: `API Error: ${res.statusText}` }));
            throw new Error(errData.message || `API Error: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          setResults(data.results || []);
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch search results.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setResults([]);
      setIsLoading(false);
      setError(null);
    }
  }, [query]);

  useEffect(() => {
    if (!selectedItem) return;

    setIsLoadingDetails(true);
    setItemDetails(null);
    let apiUrl = '';
    switch (selectedItem.type) {
      case 'order':
        apiUrl = `/api/orders/${selectedItem.id}`;
        break;
      case 'customer':
        apiUrl = `/api/customers/${selectedItem.id}`;
        break;
      case 'ingredient':
        apiUrl = `/api/ingredient-prices/${selectedItem.id}`;
        break;
      default:
        setIsLoadingDetails(false);
        return;
    }

    fetch(apiUrl)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ message: `API Error: ${res.statusText}` }));
          throw new Error(errData.message || `API Error: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setItemDetails(data);
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: `No se pudieron cargar los detalles: ${err.message}`,
          variant: 'destructive'
        });
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  }, [selectedItem, toast]);

  const handleItemClick = useCallback((item: SearchResult) => {
    setSelectedItem({ id: item.id, type: item.type });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setItemDetails(null);
  }, []);

  const groupedResults = useMemo(() => {
    return results.reduce(
      (acc, result) => {
        (acc[result.type] = acc[result.type] || []).push(result);
        return acc;
      },
      {} as Record<SearchResult['type'], SearchResult[]>
    );
  }, [results]);

  const renderGroup = (
    title: string,
    icon: React.ReactNode,
    items: SearchResult[]
  ) => (
    <Card key={title}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon} {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <button
                onClick={() => handleItemClick(item)}
                className="block w-full text-left p-2 rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium text-primary truncate">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {query ? (
          <>
            Resultados de búsqueda para:{' '}
            <span className="text-primary">{query}</span>
          </>
        ) : (
          'Búsqueda Global'
        )}
      </h1>

      {!query && !isLoading && (
        <p className="text-muted-foreground text-center py-10">
          Introduce un término en la barra superior para buscar.
        </p>
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && !isLoading && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Error en la Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && results.length === 0 && query && (
        <p className="text-muted-foreground text-center py-10">
          No se encontraron resultados para "{query}".
        </p>
      )}

      {!isLoading && !error && results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {groupedResults.order &&
            renderGroup(
              'Pedidos',
              <Package className="h-5 w-5" />,
              groupedResults.order
            )}
          {groupedResults.customer &&
            renderGroup(
              'Clientes',
              <Users className="h-5 w-5" />,
              groupedResults.customer
            )}
          {groupedResults.ingredient &&
            renderGroup(
              'Ingredientes',
              <Beaker className="h-5 w-5" />,
              groupedResults.ingredient
            )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {isLoadingDetails && (
          <div className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoadingDetails && itemDetails && selectedItem?.type === 'order' && (
          <OrderDetails order={itemDetails as Order} />
        )}
        {!isLoadingDetails &&
          itemDetails &&
          selectedItem?.type === 'customer' && (
            <CustomerDetails customer={itemDetails as Customer} />
          )}
        {!isLoadingDetails &&
          itemDetails &&
          selectedItem?.type === 'ingredient' && (
            <IngredientDetails ingredient={itemDetails as IngredientPrice} />
          )}
        {!isLoadingDetails && !itemDetails && selectedItem && (
          <p className="p-6 text-center text-muted-foreground">
            No se pudieron cargar los detalles.
          </p>
        )}
      </Modal>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando búsqueda...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
