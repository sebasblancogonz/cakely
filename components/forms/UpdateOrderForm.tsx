'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Order,
  OrderImage,
  ProductTypeEnum,
  PaymentMethod,
  PaymentStatus,
  OrderStatus
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
import {
  UpdateOrderFormData,
  updateOrderFormSchema
} from '@/lib/validators/orders';
import { format } from 'date-fns';
import { Combobox, ComboboxOption } from '../ui/combobox';

const defaultOrderFormValues: Partial<UpdateOrderFormData> = {
  description: '',
  amount: undefined,
  deliveryDate: null,
  productType: ProductTypeEnum.Tarta,
  customizationDetails: '',
  quantity: 1,
  sizeOrWeight: '',
  flavor: '',
  allergyInformation: '',
  totalPrice: undefined,
  paymentStatus: PaymentStatus.Pendiente,
  paymentMethod: PaymentMethod.Efectivo,
  notes: ''
};

interface OrderFormProps {
  orderToEdit: Order;
  onCancel: () => void;
  onUpdateSuccess: (updatedOrder: Order) => void;
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    return format(new Date(date), 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

const formatTimeForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  try {
    return format(new Date(date), 'HH:mm');
  } catch {
    return '';
  }
};

const areImageArraysEqual = (
  arr1: OrderImage[],
  arr2: OrderImage[]
): boolean => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  const ids1 = new Set(arr1.map((img) => img.id));
  const ids2 = new Set(arr2.map((img) => img.id));
  if (ids1.size !== ids2.size) {
    return false;
  }
  for (const id of ids1) {
    if (!ids2.has(id)) {
      return false;
    }
  }
  return true;
};

const UpdateOrderForm = ({
  onCancel,
  orderToEdit,
  onUpdateSuccess
}: OrderFormProps) => {
  const { toast } = useToast();
  const [imageUrls, setImageUrls] = useState<OrderImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<OrderImage[]>([]);
  const [initialImageUrls, setInitialImageUrls] = useState<OrderImage[]>([]);
  const [productTypeOptions, setProductTypeOptions] = useState<
    ComboboxOption[]
  >([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<UpdateOrderFormData>({
    resolver: zodResolver(updateOrderFormSchema),
    defaultValues: {
      description: orderToEdit.description ?? '',
      amount: orderToEdit.amount ? Number(orderToEdit.amount) : undefined,
      deliveryDate: orderToEdit.deliveryDate
        ? new Date(orderToEdit.deliveryDate)
        : null,
      deliveryTime: formatTimeForInput(orderToEdit.deliveryDate),
      productType: orderToEdit.productType?.name ?? '',
      customizationDetails: orderToEdit.customizationDetails ?? '',
      quantity: orderToEdit.quantity ?? 1,
      sizeOrWeight: orderToEdit.sizeOrWeight ?? '',
      flavor: orderToEdit.flavor ?? '',
      allergyInformation: orderToEdit.allergyInformation ?? '',
      totalPrice: orderToEdit.totalPrice
        ? Number(orderToEdit.totalPrice)
        : undefined,
      depositAmount: orderToEdit.depositAmount
        ? Number(orderToEdit.depositAmount)
        : undefined,
      paymentStatus: orderToEdit.paymentStatus as PaymentStatus,
      orderStatus: orderToEdit.orderStatus as OrderStatus,
      paymentMethod: orderToEdit.paymentMethod as PaymentMethod,
      notes: orderToEdit.notes ?? '',
      images: orderToEdit.images ?? []
    }
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
    const dateForInputReset = formatDateForInput(orderToEdit.deliveryDate);
    const initialImages = Array.isArray(orderToEdit.images)
      ? orderToEdit.images
      : [];

    reset({
      description: orderToEdit.description,
      amount: Number(orderToEdit.amount) || undefined,
      //@ts-ignore
      deliveryDate: dateForInputReset,
      deliveryTime: formatTimeForInput(orderToEdit.deliveryDate),
      productType: orderToEdit.productType?.name ?? '',
      customizationDetails: orderToEdit.customizationDetails || '',
      quantity: orderToEdit.quantity,
      sizeOrWeight: orderToEdit.sizeOrWeight,
      flavor: orderToEdit.flavor,
      allergyInformation: orderToEdit.allergyInformation || '',
      totalPrice: Number(orderToEdit.totalPrice) || undefined,
      paymentStatus: orderToEdit.paymentStatus as PaymentStatus,
      orderStatus: orderToEdit.orderStatus as OrderStatus,
      paymentMethod: orderToEdit.paymentMethod as PaymentMethod,
      depositAmount: orderToEdit.depositAmount
        ? Number(orderToEdit.depositAmount)
        : undefined,
      notes: orderToEdit.notes || '',
      images: initialImages
    });
    setImageUrls(initialImages);
    setInitialImageUrls(initialImages);
    setImagesToDelete([]);
  }, [orderToEdit, reset]);

  const onSubmit = async (data: UpdateOrderFormData) => {
    const imagesChanged = !areImageArraysEqual(initialImageUrls, imageUrls);

    if (!isDirty && !imagesChanged) {
      toast({
        title: 'Sin cambios',
        description: 'No has modificado ningún dato del pedido.',
        variant: 'default'
      });
      setImagesToDelete([]);
      setImageUrls([]);
      return;
    }
    console.log('Form Data Submitted:', data);

    const apiData = {
      ...data,
      amount: data.amount?.toString(),
      totalPrice: data.totalPrice?.toString(),
      depositAmount: (data.depositAmount ?? 0).toString(),
      deliveryDate: data.deliveryDate ? data.deliveryDate : null,
      images: imageUrls
    };

    console.log('API DATA BRO', apiData);

    delete (apiData as any).customerId;

    try {
      let savedOrUpdatedOrder: Order;

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

      if (imagesToDelete.length > 0) {
        await Promise.all(
          imagesToDelete.map(async (img) => {
            const response = await fetch(`/api/images/${img.id}`, {
              method: 'DELETE'
            });
            if (!response.ok) {
              console.warn('Failed to delete image with ID:', img.id);
            }
          })
        );
      }

      toast({
        title: 'Éxito',
        description: 'Pedido actualizado correctamente.'
      });
      onUpdateSuccess(savedOrUpdatedOrder);

      onCancel();
    } catch (error) {
      console.error('Error saving/updating order:', error);
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

  const closeModal = () => {
    onCancel();
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
        Editar Pedido
      </h2>
      <form
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        onSubmit={handleSubmit(onSubmit, onValidationErrors)}
      >
        <div className={cn('space-y-1.5', 'hidden')}>
          <Input
            readOnly
            disabled
            value={
              orderToEdit?.customer?.name
                ? `${orderToEdit.customer.name} (${orderToEdit.customer.phone || orderToEdit.customer.email})`
                : 'Cargando...'
            }
            className="bg-muted border-muted"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Input
            readOnly
            disabled
            value={`${orderToEdit?.customer?.name} (${orderToEdit?.customer?.phone || orderToEdit?.customer?.email})`}
            className="bg-muted border-muted"
          />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="update-deliveryDate">Fecha Entrega</Label>
            <Input
              id="update-deliveryDate"
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
            <Label htmlFor="update-deliveryTime">Hora Entrega (Opcional)</Label>
            <Input
              id="update-deliveryTime"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="productType">Tipo Producto</Label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label htmlFor="depositAmount">Señal Recibida (€) (Opcional)</Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              placeholder="Ej: 20.00"
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
        <div className="flex justify-end pt-4 sticky bottom-0 bg-background pb-1 border-t">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit" className="ml-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Actualizar Pedido
          </Button>
        </div>
      </form>
    </>
  );
};

export default UpdateOrderForm;
