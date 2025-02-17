import { Button } from '@/components/ui/button';
import { Order, OrderHistory } from '@types';
import { PaymentMethod, OrderStatus, ProductType, PaymentStatus } from '@types';

const OrderForm = ({
  setIsModalOpen,
  setOrders,
  setIsEditing,
  orderToEdit
}: {
  setIsModalOpen: (value: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setIsEditing: (value: boolean) => void;
  orderToEdit: Order | null;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    if (orderToEdit) {
      const order: Order = buildOrder(formData, orderToEdit);
      updateOrder(order);
    } else {
      const order: Order = buildOrder(formData, null);
      saveOrder(order);
    }
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
        keyof Order,
        (value: FormDataEntryValue) => any
      > = {
        id: (value) => value, // No se actualiza
        orderDate: (value) => new Date(value.toString()),
        orderStatus: (value) => value as OrderStatus,
        paymentStatus: (value) => value as PaymentStatus,
        customizationDetails: (value) => value.toString(),
        orderHistory: (value) => JSON.parse(value.toString()) as OrderHistory[],
        customerName: (value) => value.toString(),
        customerContact: (value) => value.toString(),
        description: (value) => value.toString(),
        deliveryDate: (value) => new Date(value.toString()),
        productType: (value) => value as ProductType,
        quantity: (value) => parseInt(value.toString(), 10),
        sizeOrWeight: (value) => value.toString(),
        flavor: (value) => value.toString(),
        allergyInformation: (value) => value.toString(),
        paymentMethod: (value) => value as PaymentMethod,
        notes: (value) => value.toString(),
        amount: (value) => parseFloat(value.toString()),
        totalPrice: (value) => parseFloat(value.toString())
      };

      for (const field in fieldTransformers) {
        const key = field as keyof Order;
        const formValue = formData.get(field);

        if (formValue !== null) {
          const transformedValue = fieldTransformers[key](formValue);

          if (transformedValue !== existingOrder[key]) {
            updatedOrder[key] = transformedValue;
            hasChanges = true;
          }
        }
      }

      return hasChanges ? { ...existingOrder, ...updatedOrder } : existingOrder;
    }

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
      deliveryDate: new Date(getFormValue(formData, 'deliveryDate', '')),
      productType: getFormValue(formData, 'productType', ProductType.Otros),
      quantity: parseInt(getFormValue(formData, 'quantity', '0')),
      sizeOrWeight: getFormValue(formData, 'sizeOrWeight', ''),
      flavor: getFormValue(formData, 'flavor', ''),
      allergyInformation: getFormValue(formData, 'allergyInformation', ''),
      paymentMethod: getFormValue(
        formData,
        'paymentMethod',
        PaymentMethod.Efectivo
      ),
      notes: getFormValue(formData, 'notes', ''),
      amount: parseFloat(getFormValue(formData, 'amount', '0')),
      totalPrice: parseFloat(getFormValue(formData, 'amount', '0'))
    };
  };

  async function saveOrder(order: Order) {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (response.ok) {
      setOrders((orders) => [...orders, order]);
      setIsModalOpen(false);
    }

    setIsEditing(false);
  }

  async function updateOrder(order: Order) {
    const response = await fetch(`/api/orders/${Number(order.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (response.ok) {
      setOrders((orders) => orders.map((o) => (o.id === order.id ? order : o)));
      setIsModalOpen(false);
    }
  }

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {orderToEdit ? 'Editar Pedido' : 'Nuevo Pedido'}
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          label="Cliente"
          name="customerName"
          placeholder="Nombre del cliente"
          defaultValue={orderToEdit?.customerName}
        />
        <InputField
          label="Contacto del cliente"
          name="customerContact"
          placeholder="Teléfono o email"
          defaultValue={orderToEdit?.customerContact}
        />
        <TextAreaField
          label="Descripción"
          name="description"
          placeholder="Descripción del pedido"
          defaultValue={orderToEdit?.description}
        />
        <InputField
          label="Fecha de entrega"
          name="deliveryDate"
          type="date"
          defaultValue={
            orderToEdit?.deliveryDate instanceof Date
              ? orderToEdit.deliveryDate.toISOString().split('T')[0]
              : new Date(orderToEdit?.deliveryDate || '')
                  .toISOString()
                  .split('T')[0]
          }
        />

        <SelectField
          label="Tipo de producto"
          name="productType"
          options={[
            { value: ProductType.Tarta, label: 'Tarta' },
            { value: ProductType.Galletas, label: 'Galletas' },
            { value: ProductType.Cupcakes, label: 'Cupcakes' },
            { value: ProductType.Macarons, label: 'Macarons' },
            { value: ProductType.Otros, label: 'Otros' }
          ]}
          defaultValue={orderToEdit?.productType}
        />
        <InputField
          label="Cantidad"
          name="quantity"
          type="number"
          defaultValue={orderToEdit?.quantity?.toString()}
        />
        <InputField
          label="Tamaño o peso"
          name="sizeOrWeight"
          placeholder="Tamaño o peso del producto"
          defaultValue={orderToEdit?.sizeOrWeight}
        />
        <InputField
          label="Sabor"
          name="flavor"
          placeholder="Sabor del producto"
          defaultValue={orderToEdit?.flavor}
        />
        <TextAreaField
          label="Información alergias"
          name="allergyInformation"
          placeholder="Información sobre alergias"
          defaultValue={orderToEdit?.allergyInformation}
        />
        <SelectField
          label="Método de pago"
          name="paymentMethod"
          options={[
            { value: PaymentMethod.Efectivo, label: 'Efectivo' },
            { value: PaymentMethod.Tarjeta, label: 'Tarjeta' },
            {
              value: PaymentMethod['Transferencia'],
              label: 'Transferencia'
            },
            { value: PaymentMethod.Bizum, label: 'Bizum' }
          ]}
          defaultValue={orderToEdit?.paymentMethod}
        />
        <TextAreaField
          label="Notas"
          name="notes"
          placeholder="Notas adicionales"
          defaultValue={orderToEdit?.notes}
        />
        <InputField
          label="Importe"
          name="amount"
          type="number"
          placeholder="0.00"
          defaultValue={orderToEdit?.amount?.toString()}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(false)}
          >
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
