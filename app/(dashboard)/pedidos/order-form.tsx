import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Order, OrderImage } from '@types';
import { PaymentMethod, OrderStatus, ProductType, PaymentStatus } from '@types';

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
  const [imagesToDelete, setImagesToDelete] = useState<OrderImage[]>([]);
  const [imageUrls, setImageUrls] = useState<OrderImage[]>(
    orderToEdit?.images || []
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const order = buildOrder(formData, orderToEdit);
    orderToEdit ? updateOrder(order) : saveOrder(order);
  };

  const getFormValue = <T,>(
    formData: FormData,
    key: string,
    defaultValue: T
  ): T => {
    return (formData.get(key) as T) ?? defaultValue;
  };

  const buildOrder = (
    formData: FormData,
    existingOrder: Order | null
  ): Order => {
    if (existingOrder) {
      const updatedOrder: Partial<Order> = {};
      let hasChanges = false;

      const fieldTransformers: Record<
        Exclude<
          keyof Order,
          | 'images'
          | 'orderHistory'
          | 'id'
          | 'orderDate'
          | 'orderStatus'
          | 'paymentStatus'
          | 'customizationDetails'
        >,
        (value: FormDataEntryValue) => any
      > = {
        customerName: (v) => v.toString(),
        customerContact: (v) => v.toString(),
        description: (v) => v.toString(),
        deliveryDate: (v) => new Date(v.toString()),
        productType: (v) => v as ProductType,
        quantity: (v) => parseInt(v.toString(), 10),
        sizeOrWeight: (v) => v.toString(),
        flavor: (v) => v.toString(),
        allergyInformation: (v) => v.toString(),
        paymentMethod: (v) => v as PaymentMethod,
        notes: (v) => v.toString(),
        amount: (v) => parseFloat(v.toString()),
        totalPrice: (v) => parseFloat(v.toString())
      };

      for (const field in fieldTransformers) {
        const key = field as keyof typeof fieldTransformers;
        const formValue = formData.get(field);

        if (formValue !== null) {
          const transformedValue = fieldTransformers[key](formValue);
          const originalValue = existingOrder[key];

          let valueChanged = false;
          if (
            originalValue instanceof Date &&
            transformedValue instanceof Date
          ) {
            valueChanged =
              originalValue.getTime() !== transformedValue.getTime();
          } else {
            valueChanged = transformedValue !== originalValue;
          }

          if (valueChanged) {
            updatedOrder[key] = transformedValue;
            hasChanges = true;
          }
        }
      }

      const originalImages = existingOrder.images || [];
      if (
        imageUrls.length !== originalImages.length ||
        JSON.stringify(imageUrls) !== JSON.stringify(originalImages)
      ) {
        updatedOrder.images = imageUrls;
        hasChanges = true;
        console.log('Image changes detected. New image array:', imageUrls);
      } else {
        console.log('No image changes detected.');
      }

      return hasChanges ? { ...existingOrder, ...updatedOrder } : existingOrder;
    }

    const newAmount = parseFloat(getFormValue(formData, 'amount', '0'));
    return {
      id: undefined,
      orderDate: new Date(),
      orderStatus: OrderStatus.pending,
      paymentStatus: PaymentStatus.Pendiente,
      customizationDetails: '',
      orderHistory: [],
      customerName: getFormValue(formData, 'customerName', ''),
      customerContact: getFormValue(formData, 'customerContact', ''),
      description: getFormValue(formData, 'description', ''),
      deliveryDate: new Date(
        getFormValue(formData, 'deliveryDate', new Date().toISOString())
      ),
      productType: getFormValue(formData, 'productType', ProductType.Otros),
      quantity: parseInt(getFormValue(formData, 'quantity', '1'), 10),
      sizeOrWeight: getFormValue(formData, 'sizeOrWeight', ''),
      flavor: getFormValue(formData, 'flavor', ''),
      allergyInformation: getFormValue(formData, 'allergyInformation', ''),
      paymentMethod: getFormValue(
        formData,
        'paymentMethod',
        PaymentMethod.Efectivo
      ),
      notes: getFormValue(formData, 'notes', ''),
      amount: newAmount,
      totalPrice: newAmount,
      images: imageUrls
    };
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setIsCreating(false);
  };

  const saveOrder = async (order: Order) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (res.ok) {
      setOrders((prev) => [...prev, order]);
      closeModal();
    }
  };

  const updateOrder = async (order: Order) => {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (res.ok) {
      if (imagesToDelete.length > 0) {
        fetch('/api/images', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imagesToDelete)
        });
      }
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      closeModal();
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
    {
      label: 'Sabor',
      name: 'flavor',
      type: 'text',
      placeholder: 'Sabor'
    },
    {
      label: 'Información alergias',
      name: 'allergyInformation',
      type: 'textarea',
      placeholder: 'Alergias del cliente'
    },
    {
      label: 'Notas',
      name: 'notes',
      type: 'textarea',
      placeholder: 'Notas'
    },
    {
      label: 'Importe',
      name: 'amount',
      type: 'number',
      placeholder: 'Importe a cobrar'
    }
  ];

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {orderToEdit ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {fields.map((field) =>
          field.type === 'textarea' ? (
            <TextAreaField
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              name={field.name}
              defaultValue={orderToEdit?.[field.name as keyof Order] as string}
            />
          ) : (
            <InputField
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              defaultValue={orderToEdit?.[
                field.name as keyof Order
              ]?.toString()}
            />
          )
        )}

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

        {orderToEdit && imageUrls.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Imágenes del pedido
            </label>
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((img, index) => (
                <div key={index} className="relative w-24 h-24">
                  <img
                    src={img.url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagesToDelete([...imagesToDelete, img]);
                      setImageUrls((prev) => {
                        return prev.filter((_, i) => i !== index);
                      });
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit" className="ml-2">
            Guardar
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
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
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
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <textarea
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
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
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <select
      name={name}
      defaultValue={defaultValue}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
