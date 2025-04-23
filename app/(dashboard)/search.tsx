'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      const params = new URLSearchParams({ q: trimmedQuery });
      startTransition(() => {
        router.push(`/search?${params.toString()}`);
      });
    } else {
      startTransition(() => {
        router.push(`/search`);
      });
    }
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="relative ml-auto flex-1 md:grow-0"
    >
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        placeholder="Buscar pedidos, clientes..."
        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px] h-9"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isPending && (
        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
      )}
    </form>
  );
}
