'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export type ComboboxOption = {
  value: string;
  label: string;
};

interface CreatableComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  disabled?: boolean;
  inputClassName?: string;
  id?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Selecciona una opción...',
  searchPlaceholder = 'Buscar o escribir...',
  notFoundMessage = 'No se encontraron opciones.',
  disabled,
  inputClassName,
  id
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const [inputValue, setInputValue] = React.useState('');

  const selectedOptionLabel = options.find(
    (option) => option.value === value
  )?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            inputClassName,
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          {value ? selectedOptionLabel || value : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        onPointerDownOutside={() => {
          if (
            inputValue &&
            !options.some(
              (opt) =>
                opt.label.toLowerCase() === inputValue.toLowerCase() ||
                opt.value.toLowerCase() === inputValue.toLowerCase()
            )
          ) {
            onValueChange(inputValue.trim());
          }
          setOpen(false);
        }}
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentLabel: string) => {
                    const selectedOpt = options.find(
                      (opt) =>
                        opt.label.toLowerCase() === currentLabel.toLowerCase()
                    );
                    onValueChange(
                      selectedOpt ? selectedOpt.value : currentLabel
                    );
                    setInputValue('');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {inputValue &&
                !options.some(
                  (opt) => opt.label.toLowerCase() === inputValue.toLowerCase()
                ) && (
                  <CommandItem
                    key={`create-${inputValue}`}
                    value={inputValue}
                    onSelect={() => {
                      onValueChange(inputValue.trim());
                      setInputValue('');
                      setOpen(false);
                    }}
                  >
                    <span className="italic">Crear: "{inputValue}"</span>
                  </CommandItem>
                )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
