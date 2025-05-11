'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Order,
  Customer,
  ProductTypeEnum,
  PaymentMethod,
  OrderStatus,
  PaymentStatus
} from '@types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ProductTypeEnum as FrontendProductTypeEnum } from '@types';
import { OrderFormData, createOrderFormSchema } from '@/lib/validators/orders';
import { format } from 'date-fns';
import { Combobox, ComboboxOption } from '../ui/combobox';

const defaultOrderFormValues: Partial<OrderFormData> = {
  customerId: undefined,
  description: '',
  amount: undefined,
  deliveryDate: null,
  deliveryTime: '',
  productType: ProductTypeEnum.Tarta,
  customizationDetails: '',
  quantity: 1,
  sizeOrWeight: '',
  flavor: '',
  allergyInformation: '',
  totalPrice: undefined,
  paymentStatus: PaymentStatus.Pendiente,
  paymentMethod: PaymentMethod.Efectivo,
  notes: '',
  createCalendarEvent: false
};

interface OrderFormProps {
  setIsModalOpen?: (value: boolean) => void;
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  setIsCreating?: (value: boolean) => void;
  onOrderCreated?: (createdOrder: Order) => void;
  onCancelForm?: () => void;
}

const OrderForm = ({
  setIsModalOpen,
  setOrders,
  setIsCreating,
  onOrderCreated,
  onCancelForm
}: OrderFormProps) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [productTypeOptions, setProductTypeOptions] = useState<
    ComboboxOption[]
  >([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<OrderFormData>({
    //@ts-ignore
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: defaultOrderFormValues
  });

  useEffect(() => {
    setLoadingProductTypes(true);
    async function fetchProductTypes() {
      try {
        const response = await fetch('/api/product-types');
        if (!response.ok) throw new Error('Failed to fetch product types');
        const typesData: { id: number; name: string }[] = await response.json();

        const enumValues = Object.values(ProductTypeEnum);
        const combinedNames = new Set([
          ...enumValues,
          ...typesData.map((t) => t.name)
        ]);

        setProductTypeOptions(
          Array.from(combinedNames)
            .map((name) => ({ value: name, label: name }))
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      } catch (error) {
        console.error('Error fetching product types:', error);
        setProductTypeOptions(
          Object.values(ProductTypeEnum).map((type) => ({
            value: type,
            label: type
          }))
        );
      } finally {
        setLoadingProductTypes(false);
      }
    }
    fetchProductTypes();
  }, []);

  useEffect(() => {
    setLoadingCustomers(true);
    fetch('/api/customers?limit=1000')
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error('Failed to fetch customers'))
      )
      .then((data) => {
        setCustomers(data.customers || []);
      })
      .catch((error) => {
        console.error('Error fetching customers:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los clientes.',
          variant: 'destructive'
        });
      })
      .finally(() => {
        setLoadingCustomers(false);
      });
  }, [toast]);

  useEffect(() => {
    reset(defaultOrderFormValues);
  }, [reset]);

  const onSubmit: SubmitHandler<OrderFormData> = async (data) => {
    console.log('OrderForm - Form Data Submitted:', data);
    const apiData = {
      ...data,
      amount: data.amount?.toString(),
      totalPrice: data.totalPrice?.toString(),
      depositAmount: (data.depositAmount ?? 0).toString(),
      deliveryDate: data.deliveryDate
        ? format(data.deliveryDate, 'yyyy-MM-dd')
        : null,
      deliveryTime: data.deliveryTime || null,
      orderStatus: OrderStatus.Pendiente
    };

    try {
      if (!apiData.customerId) {
        throw new Error('Falta el ID del cliente para crear el pedido.');
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create order');
      }
      const savedOrder = await response.json();
      toast({ title: 'Éxito', description: 'Pedido creado correctamente.' });

      if (onOrderCreated) {
        onOrderCreated(savedOrder);
      } else if (setOrders) {
        setOrders((prev) => [savedOrder, ...prev]);
      }

      handleCancelOrClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const onValidationErrors = (validationErrors: any) => {
    console.error('ORDER FORM - VALIDATION ERRORS (RHF):', validationErrors);
    toast({
      title: 'Error de Validación',
      description: 'Por favor, revisa los campos marcados en rojo.',
      variant: 'destructive'
    });
  };

  const handleCancelOrClose = () => {
    if (onCancelForm) {
      onCancelForm();
    } else if (setIsModalOpen && setIsCreating) {
      setIsModalOpen(false);
      setIsCreating(false);
    }
    reset(defaultOrderFormValues);
  };

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        Nuevo Pedido
      </h2>
      <form
        className="space-y-4 overflow-y-auto pr-2"
        //@ts-ignore
        onSubmit={handleSubmit(onSubmit, onValidationErrors)}
      >
        <div className={cn('space-y-1.5', 'block')}>
          <Label htmlFor="customerId-create">Cliente</Label>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  field.onChange(value ? parseInt(value, 10) : undefined)
                }
                value={field.value == null ? '' : field.value.toString()}
                disabled={loadingCustomers}
              >
                <SelectTrigger
                  id="customerId-create"
                  className={cn(errors.customerId && 'border-destructive')}
                >
                  <SelectValue
                    placeholder={
                      loadingCustomers
                        ? 'Cargando...'
                        : 'Selecciona un cliente...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingCustomers && customers.length === 0 && (
                    <SelectItem value="no-customers-yet" disabled>
                      No hay clientes
                    </SelectItem>
                  )}
                  {customers.map((customer) => (
                    <SelectItem
                      key={customer.id}
                      value={customer.id!.toString()}
                    >
                      {customer.name} ({customer.phone || customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.customerId && (
            <p className="text-xs text-destructive mt-1">
              {errors.customerId.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description-create">Descripción</Label>
          <Textarea
            id="description-create"
            placeholder="Ej: Tarta cumpleaños infantil, 2 pisos..."
            {...register('description')}
            className={cn(errors.description && 'border-destructive')}
          />
          {errors.description && (
            <p className="text-xs text-destructive mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate-create">Fecha Entrega</Label>
            <Input
              id="deliveryDate-create"
              type="date"
              {...register('deliveryDate', { valueAsDate: true })}
              className={cn(errors.deliveryDate && 'border-destructive')}
            />
            {errors.deliveryDate && (
              <p className="text-xs text-destructive mt-1">
                {errors.deliveryDate.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deliveryTime-create">Hora Entrega (Opcional)</Label>
            <Input
              id="deliveryTime-create"
              type="time"
              {...register('deliveryTime')}
              className={cn(errors.deliveryTime && 'border-destructive')}
            />
            {errors.deliveryTime && (
              <p className="text-xs text-destructive mt-1">
                {errors.deliveryTime.message}
              </p>
            )}
          </div>
        </div>

        <div className="items-top flex space-x-2 pt-2">
          <Controller
            name="createCalendarEvent"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="createCalendarEvent-create"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-labelledby="createCalendarEvent-label"
              />
            )}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="createCalendarEvent-create"
              id="createCalendarEvent-label"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Añadir entrega a Google Calendar
            </label>
            <p className="text-xs text-muted-foreground">
              Creará un evento en tu calendario y el de tus colaboradores.
            </p>
            {errors.createCalendarEvent && (
              <p className="text-xs text-destructive">
                {errors.createCalendarEvent.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="productType-create">Tipo Producto</Label>
            <Controller
              name="productType"
              control={control}
              render={({ field }) => (
                <Combobox
                  id="productType-create"
                  options={productTypeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Selecciona o escribe un tipo..."
                  searchPlaceholder="Buscar o crear tipo..."
                  notFoundMessage={
                    loadingProductTypes
                      ? 'Cargando tipos...'
                      : 'No hay tipos. Escribe para crear uno nuevo.'
                  }
                  disabled={loadingProductTypes}
                  inputClassName={cn(
                    errors.productType && 'border-destructive'
                  )}
                />
              )}
            />
            {errors.productType && (
              <p className="text-xs text-destructive mt-1">
                {errors.productType.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quantity-create">Cantidad</Label>
            <Input
              id="quantity-create"
              type="number"
              step="1"
              {...register('quantity')}
              className={cn(errors.quantity && 'border-destructive')}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive mt-1">
                {errors.quantity.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sizeOrWeight-create">Tamaño / Peso</Label>
            <Input
              id="sizeOrWeight-create"
              placeholder="Ej: 20cm, 1.5kg"
              {...register('sizeOrWeight')}
            />
            {errors.sizeOrWeight && (
              <p className="text-xs text-destructive mt-1">
                {errors.sizeOrWeight.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flavor-create">Sabor / Relleno</Label>
            <Input
              id="flavor-create"
              placeholder="Ej: Chocolate y Nata"
              {...register('flavor')}
            />
            {errors.flavor && (
              <p className="text-xs text-destructive mt-1">
                {errors.flavor.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customizationDetails-create">
            Detalles Personalización (Opcional)
          </Label>
          <Textarea
            id="customizationDetails-create"
            placeholder="Color, nombre, temática..."
            {...register('customizationDetails')}
          />
          {errors.customizationDetails && (
            <p className="text-xs text-destructive mt-1">
              {errors.customizationDetails.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allergyInformation-create">Alergias (Opcional)</Label>
          <Textarea
            id="allergyInformation-create"
            placeholder="Ej: Sin frutos secos"
            {...register('allergyInformation')}
          />
          {errors.allergyInformation && (
            <p className="text-xs text-destructive mt-1">
              {errors.allergyInformation.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount-create">Importe Original (€)</Label>
            <Input
              id="amount-create"
              type="number"
              step="0.01"
              {...register('amount')}
              className={cn(errors.amount && 'border-destructive')}
            />
            {errors.amount && (
              <p className="text-xs text-destructive mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalPrice-create">Precio Total (€)</Label>
            <Input
              id="totalPrice-create"
              type="number"
              step="0.01"
              {...register('totalPrice')}
              className={cn(errors.totalPrice && 'border-destructive')}
            />
            {errors.totalPrice && (
              <p className="text-xs text-destructive mt-1">
                {errors.totalPrice.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="depositAmount-create">
              Señal Recibida (€) (Opcional)
            </Label>
            <Input
              id="depositAmount-create"
              type="number"
              step="0.01"
              {...register('depositAmount')}
              className={cn(errors.depositAmount && 'border-destructive')}
            />
            {errors.depositAmount && (
              <p className="text-xs text-destructive mt-1">
                {errors.depositAmount.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod-create">Método Pago</Label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={defaultOrderFormValues.paymentMethod}
                >
                  <SelectTrigger
                    id="paymentMethod-create"
                    className={cn(errors.paymentMethod && 'border-destructive')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentMethod).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentMethod && (
              <p className="text-xs text-destructive mt-1">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentStatus-create">Estado Pago</Label>
            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={defaultOrderFormValues.paymentStatus}
                >
                  <SelectTrigger
                    id="paymentStatus-create"
                    className={cn(errors.paymentStatus && 'border-destructive')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PaymentStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentStatus && (
              <p className="text-xs text-destructive mt-1">
                {errors.paymentStatus.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes-create">Notas Internas (Opcional)</Label>
          <Textarea
            id="notes-create"
            placeholder="Recordatorios, detalles extra..."
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-xs text-destructive mt-1">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4 sticky bottom-0 bg-background pb-1 border-t -mx-6 px-6">
          <Button type="button" variant="outline" onClick={handleCancelOrClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="ml-2"
            disabled={isSubmitting || loadingCustomers}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Guardar Pedido
          </Button>
        </div>
      </form>
    </>
  );
};

export default OrderForm;
