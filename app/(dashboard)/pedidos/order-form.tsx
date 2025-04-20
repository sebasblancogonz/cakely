import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Order,
  OrderImage,
  ProductType,
  PaymentMethod,
  OrderStatus,
  PaymentStatus
} from '@types';

const productTypeOptions = [
  { value: ProductType.Tarta, label: 'Tarta' },
  { value: ProductType.Galletas, label: 'Galletas' },
  { value: ProductType.Cupcakes, label: 'Cupcakes' },
  { value: ProductType.Macarons, label: 'Macarons' },
  { value: ProductType.Otros, label: 'Otros' }
];

const paymentMethodOptions = [
  { value: PaymentMethod.Efectivo, label: 'Efectivo' },
  { value: PaymentMethod.Tarjeta, label: 'Tarjeta' },
  { value: PaymentMethod.Transferencia, label: 'Transferencia' },
  { value: PaymentMethod.Bizum, label: 'Bizum' }
];

const OrderForm = ({
  setIsModalOpen,
  setOrders,
  setIsEditing,
  setIsCreating,
  orderToEdit
}: {
  setIsModalOpen: (value: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setIsEditing: (value: boolean) => void;
  setIsCreating: (value: boolean) => void;
  orderToEdit: Order | null;
}) => {
  const [imageUrls, setImageUrls] = useState<OrderImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<OrderImage[]>([]);

  useEffect(() => {
    if (orderToEdit?.images) {
      setImageUrls(orderToEdit.images);
    } else {
      setImageUrls([]);
    }
    setImagesToDelete([]);
  }, [orderToEdit]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const orderData = buildOrder(formData, orderToEdit, imageUrls);
    orderToEdit ? updateOrder(orderData) : saveOrder(orderData);
  };

  const getFormValue = <T,>(
    formData: FormData,
    key: string,
    defaultValue: T,
    transform?: (value: FormDataEntryValue) => T
  ): T => {
    const value = formData.get(key);
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return transform ? transform(value) : (value as T);
  };

  const buildOrder = (
    formData: FormData,
    existingOrder: Order | null,
    currentImages: OrderImage[]
  ): Order => {
    const customerName = getFormValue(formData, 'customerName', '');
    const customerContact = getFormValue(formData, 'customerContact', '');
    const description = getFormValue(formData, 'description', '');
    const deliveryDate = getFormValue(
      formData,
      'deliveryDate',
      new Date(),
      (v) => new Date()
    );
    const productType = getFormValue(
      formData,
      'productType',
      ProductType.Otros,
      (v) => v as ProductType
    );
    const quantity = getFormValue(
      formData,
      'quantity',
      1,
      (v) => parseInt(v.toString(), 10) || 1
    );
    const sizeOrWeight = getFormValue(formData, 'sizeOrWeight', '');
    const flavor = getFormValue(formData, 'flavor', '');
    const allergyInformation = getFormValue(formData, 'allergyInformation', '');
    const paymentMethod = getFormValue(
      formData,
      'paymentMethod',
      PaymentMethod.Efectivo,
      (v) => v as PaymentMethod
    );
    const notes = getFormValue(formData, 'notes', '');
    const amount = getFormValue(
      formData,
      'amount',
      0,
      (v) => parseFloat(v.toString()) || 0
    );
    const totalPrice = amount;

    const orderDataFromForm: Partial<Order> = {
      customerName,
      customerContact,
      description,
      deliveryDate,
      productType,
      quantity,
      sizeOrWeight,
      flavor,
      allergyInformation,
      paymentMethod,
      notes,
      amount,
      totalPrice,
      images: currentImages
    };

    if (existingOrder) {
      return {
        ...existingOrder,
        ...orderDataFromForm
      };
    } else {
      return {
        id: undefined,
        orderDate: new Date(),
        orderStatus: OrderStatus.pending,
        paymentStatus: PaymentStatus.Pendiente,
        customizationDetails: '',
        orderHistory: [],
        ...orderDataFromForm
      } as Order;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
  };

  const saveOrder = async (order: Order) => {
    console.log('Guardando nuevo pedido:', order);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const savedOrder = await res.json();
        setOrders((prev) => [...prev, savedOrder]);
        closeModal();
      } else {
        console.error('Error al guardar:', await res.text());
      }
    } catch (error) {
      console.error('Error de red al guardar:', error);
    }
  };

  const updateOrder = async (order: Order) => {
    console.log('Actualizando pedido:', order);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });

      if (res.ok) {
        const updatedOrder = await res.json();

        if (imagesToDelete.length > 0) {
          console.log('Borrando imágenes:', imagesToDelete);
          try {
            const deleteRes = await fetch('/api/images', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(imagesToDelete.map((img) => img.id))
            });
            if (!deleteRes.ok) {
              console.error(
                'Error al borrar imágenes:',
                await deleteRes.text()
              );
            }
          } catch (deleteError) {
            console.error('Error de red al borrar imágenes:', deleteError);
          }
        }

        setOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
        );
        closeModal();
      } else {
        console.error('Error al actualizar:', await res.text());
      }
    } catch (error) {
      console.error('Error de red al actualizar:', error);
    }
  };

  const fields = [
    {
      label: 'Cliente',
      name: 'customerName',
      type: 'text',
      placeholder: 'Nombre del cliente'
    },
    {
      label: 'Contacto del cliente',
      name: 'customerContact',
      type: 'text',
      placeholder: 'Contacto del cliente'
    },
    {
      label: 'Descripción',
      name: 'description',
      type: 'textarea',
      placeholder: 'Descripción del encargo'
    },
    {
      label: 'Fecha de entrega',
      name: 'deliveryDate',
      type: 'date',
      placeholder: 'Fecha de entrega del encargo'
    },
    {
      label: 'Cantidad',
      name: 'quantity',
      type: 'number',
      placeholder: 'Cantidad de productos'
    },
    {
      label: 'Tamaño o peso',
      name: 'sizeOrWeight',
      type: 'text',
      placeholder: 'Tamaño o peso del encargo'
    },
    { label: 'Sabor', name: 'flavor', type: 'text', placeholder: 'Sabor' },
    {
      label: 'Información alergias',
      name: 'allergyInformation',
      type: 'textarea',
      placeholder: 'Alergias del cliente'
    },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Notas' },
    {
      label: 'Importe',
      name: 'amount',
      type: 'number',
      placeholder: 'Importe a cobrar',
      step: '0.01'
    }
  ];

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {orderToEdit ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      <form
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        onSubmit={handleSubmit}
      >
        {fields.map((field) => {
          let defaultValue: string | number | Date | undefined = orderToEdit?.[
            field.name as keyof Order
          ] as any;
          let formattedDefaultValue: string | number | undefined = undefined;

          if (defaultValue !== undefined && defaultValue !== null) {
            if (field.type === 'date' && defaultValue instanceof Date) {
              formattedDefaultValue = defaultValue.toISOString().split('T')[0];
            } else if (typeof defaultValue === 'number') {
              formattedDefaultValue = defaultValue;
            } else {
              formattedDefaultValue = defaultValue.toString();
            }
          }

          return field.type === 'textarea' ? (
            <TextAreaField
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              name={field.name}
              defaultValue={formattedDefaultValue?.toString()}
            />
          ) : (
            <InputField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              defaultValue={formattedDefaultValue?.toString()}
              step={field.type === 'number' ? field.step || '1' : undefined}
            />
          );
        })}

        <SelectField
          label="Tipo de producto"
          name="productType"
          options={productTypeOptions}
          defaultValue={orderToEdit?.productType}
        />

        <SelectField
          label="Método de pago"
          name="paymentMethod"
          options={paymentMethodOptions}
          defaultValue={orderToEdit?.paymentMethod}
        />

        {orderToEdit && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Imágenes del pedido (Editar)
            </label>
            {imageUrls.length === 0 && (
              <p className="text-xs text-gray-500">
                No hay imágenes asociadas.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((img, index) => (
                <div key={img.id || index} className="relative w-24 h-24">
                  <img
                    src={img.url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (img.id) {
                        setImagesToDelete([...imagesToDelete, img]);
                      }
                      setImageUrls((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                    }}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Eliminar imagen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 sticky bottom-0 bg-white pb-1">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit" className="ml-2">
            {orderToEdit ? 'Actualizar Pedido' : 'Guardar Pedido'}
          </Button>
        </div>
      </form>
    </>
  );
};

const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
  step
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  step?: string;
}) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      step={step}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  </div>
);

const TextAreaField = ({
  label,
  name,
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <textarea
      id={name}
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      rows={3}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  </div>
);

const SelectField = ({
  label,
  name,
  options,
  defaultValue
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <select
      id={name}
      name={name}
      defaultValue={defaultValue}
      className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export default OrderForm;
