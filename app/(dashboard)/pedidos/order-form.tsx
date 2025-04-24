'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Order,
  Customer,
  OrderImage,
  ProductType,
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Trash2 } from 'lucide-react';

const orderFormSchema = z.object({
  customerId: z.coerce
    .number()
    .int()
    .positive({ message: 'Selecciona un cliente' }),
  description: z
    .string()
    .trim()
    .min(1, { message: 'La descripción es requerida' }),
  amount: z.coerce
    .number()
    .positive({ message: 'Importe original debe ser positivo' }),
  deliveryDate: z.coerce
    .date({ invalid_type_error: 'Fecha de entrega inválida' })
    .nullable()
    .optional(),
  productType: z.nativeEnum(ProductType),
  customizationDetails: z.string().optional(),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: 'Cantidad debe ser positiva' }),
  sizeOrWeight: z.string().min(1, { message: 'Tamaño/Peso es requerido' }),
  flavor: z.string().min(1, { message: 'Sabor es requerido' }),
  allergyInformation: z.string().optional(),
  totalPrice: z.coerce
    .number()
    .positive({ message: 'Precio total debe ser positivo' }),
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentMethod: z.nativeEnum(PaymentMethod),
  notes: z.string().optional()
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  setIsModalOpen: (value: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setIsEditing: (value: boolean) => void;
  setIsCreating: (value: boolean) => void;
  orderToEdit: Order | null;
}

const defaultOrderFormValues: OrderFormData = {
  customerId: 0,
  description: '',
  amount: 0,
  deliveryDate: null,
  productType: ProductType.Tarta,
  customizationDetails: '',
  quantity: 1,
  sizeOrWeight: '',
  flavor: '',
  allergyInformation: '',
  totalPrice: 0,
  paymentStatus: PaymentStatus.Pendiente,
  paymentMethod: PaymentMethod.Efectivo,
  notes: ''
};

const OrderForm = ({
  setIsModalOpen,
  setOrders,
  setIsEditing,
  setIsCreating,
  orderToEdit
}: OrderFormProps) => {
  const { toast } = useToast();
  const isEditingMode = !!orderToEdit;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [imageUrls, setImageUrls] = useState<OrderImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<OrderImage[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaultOrderFormValues
  });

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
    if (isEditingMode && orderToEdit) {
      reset({
        customerId: orderToEdit.customerId,
        description: orderToEdit.description,
        amount: Number(orderToEdit.amount) || 0,
        deliveryDate: orderToEdit.deliveryDate
          ? new Date(orderToEdit.deliveryDate)
          : null,
        productType: orderToEdit.productType as ProductType,
        customizationDetails: orderToEdit.customizationDetails || '',
        quantity: orderToEdit.quantity,
        sizeOrWeight: orderToEdit.sizeOrWeight,
        flavor: orderToEdit.flavor,
        allergyInformation: orderToEdit.allergyInformation || '',
        totalPrice: Number(orderToEdit.totalPrice) || 0,
        paymentStatus: orderToEdit.paymentStatus as PaymentStatus,
        paymentMethod: orderToEdit.paymentMethod as PaymentMethod,
        notes: orderToEdit.notes || ''
      });
      setImageUrls(Array.isArray(orderToEdit.images) ? orderToEdit.images : []);
      setImagesToDelete([]);
    } else if (!isEditingMode) {
      reset(defaultOrderFormValues);
      setImageUrls([]);
      setImagesToDelete([]);
    }
  }, [orderToEdit, isEditingMode, reset]);

  const onSubmit = async (data: OrderFormData) => {
    console.log('Form Data Submitted:', data);

    const apiData = {
      ...data,
      amount: data.amount.toString(),
      totalPrice: data.totalPrice.toString(),
      deliveryDate: data.deliveryDate ? data.deliveryDate : null
    };

    try {
      let savedOrUpdatedOrder: Order;

      if (isEditingMode && orderToEdit?.id) {
        console.log('Updating order:', orderToEdit.id, apiData);
        const response = await fetch(`/api/orders/${orderToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update order');
        }
        savedOrUpdatedOrder = await response.json();
        setOrders((prev) =>
          prev.map((o) =>
            o.id === savedOrUpdatedOrder.id ? savedOrUpdatedOrder : o
          )
        );
        toast({
          title: 'Éxito',
          description: 'Pedido actualizado correctamente.'
        });
      } else {
        console.log('Saving new order:', apiData);
        const dataToSend = {
          ...apiData,
          orderStatus: OrderStatus.pending
        };
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create order');
        }
        savedOrUpdatedOrder = await response.json();
        setOrders((prev) => [savedOrUpdatedOrder, ...prev]);
        toast({ title: 'Éxito', description: 'Pedido creado correctamente.' });
      }

      if (isEditingMode && imagesToDelete.length > 0) {
        console.log('Deleting images:', imagesToDelete);
      }

      closeModal();
    } catch (error) {
      console.error('Error saving/updating order:', error);
      toast({
        title: 'Error',
        description: `No se pudo guardar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
    reset(defaultOrderFormValues);
  };

  const handleImageDelete = (imgToDelete: OrderImage, index: number) => {
    if (imgToDelete.id) {
      setImagesToDelete([...imagesToDelete, imgToDelete]);
    }
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {isEditingMode ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      <form
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-1.5">
          <Label htmlFor="customerId">Cliente</Label>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  field.onChange(value ? parseInt(value, 10) : undefined)
                }
                value={field.value?.toString()}
                disabled={loadingCustomers}
              >
                <SelectTrigger
                  id="customerId"
                  className={cn(errors.customerId && 'border-destructive')}
                >
                  <SelectValue
                    placeholder={
                      loadingCustomers
                        ? 'Cargando clientes...'
                        : 'Selecciona un cliente...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loadingCustomers && customers.length === 0 && (
                    <SelectItem value="no-customers" disabled>
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
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
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
            <Label htmlFor="deliveryDate">Fecha Entrega</Label>
            <Input
              id="deliveryDate"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="productType">Tipo Producto</Label>
            <Controller
              name="productType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    id="productType"
                    className={cn(errors.productType && 'border-destructive')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProductType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productType && (
              <p className="text-xs text-destructive mt-1">
                {errors.productType.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
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
            <Label htmlFor="sizeOrWeight">Tamaño / Peso</Label>
            <Input
              id="sizeOrWeight"
              placeholder="Ej: 20cm, 12 raciones, 1.5kg"
              {...register('sizeOrWeight')}
              className={cn(errors.sizeOrWeight && 'border-destructive')}
            />
            {errors.sizeOrWeight && (
              <p className="text-xs text-destructive mt-1">
                {errors.sizeOrWeight.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flavor">Sabor / Relleno</Label>
            <Input
              id="flavor"
              placeholder="Ej: Chocolate y Nata"
              {...register('flavor')}
              className={cn(errors.flavor && 'border-destructive')}
            />
            {errors.flavor && (
              <p className="text-xs text-destructive mt-1">
                {errors.flavor.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customizationDetails">
            Detalles Personalización (Opcional)
          </Label>
          <Textarea
            id="customizationDetails"
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
          <Label htmlFor="allergyInformation">Alergias (Opcional)</Label>
          <Textarea
            id="allergyInformation"
            placeholder="Ej: Sin frutos secos, sin lactosa"
            {...register('allergyInformation')}
          />
          {errors.allergyInformation && (
            <p className="text-xs text-destructive mt-1">
              {errors.allergyInformation.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Importe Original (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Ej: 50.00"
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
            <Label htmlFor="totalPrice">Precio Total (€)</Label>
            <Input
              id="totalPrice"
              type="number"
              step="0.01"
              placeholder="Ej: 55.50"
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
            <Label htmlFor="paymentMethod">Método Pago</Label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    id="paymentMethod"
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paymentStatus">Estado Pago</Label>
          <Controller
            name="paymentStatus"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="paymentStatus"
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

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas Internas (Opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Recordatorios, detalles extra..."
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-xs text-destructive mt-1">
              {errors.notes.message}
            </p>
          )}
        </div>

        {isEditingMode && (
          <div className="space-y-2">
            <Label>Imágenes Actuales</Label>
            {imageUrls.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay imágenes asociadas.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((img, index) => (
                <div key={img.id || index} className="relative w-20 h-20">
                  <img
                    src={img.url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                    onClick={() => handleImageDelete(img, index)}
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 sticky bottom-0 bg-background pb-1 border-t">
          <Button type="button" variant="outline" onClick={closeModal}>
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
            {isEditingMode ? 'Actualizar Pedido' : 'Guardar Pedido'}
          </Button>
        </div>
      </form>
    </>
  );
};

export default OrderForm;
