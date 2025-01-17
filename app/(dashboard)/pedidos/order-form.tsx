import { Button } from '@/components/ui/button';
import { Order } from '@types';
import { PaymentMethod, OrderStatus, ProductType, PaymentStatus } from '@types';

const OrderForm = ({
  setIsModalOpen,
  setOrders
}: {
  setIsModalOpen: (value: boolean) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const order: Order = {
      customerName: formData.get('customerName') as string,
      customerContact: formData.get('customerContact') as string,
      description: formData.get('description') as string,
      deliveryDate: new Date(formData.get('deliveryDate') as string),
      customizationDetails: '',
      totalPrice: parseFloat(formData.get('amount') as string),
      orderStatus: OrderStatus.pending,
      paymentStatus: PaymentStatus.Pendiente,
      orderDate: new Date(),
      productType: formData.get('productType') as ProductType,
      quantity: parseInt(formData.get('quantity') as string),
      sizeOrWeight: formData.get('sizeOrWeight') as string,
      flavor: formData.get('flavor') as string,
      allergyInformation: formData.get('allergyInformation') as string,
      paymentMethod: formData.get('paymentMethod') as PaymentMethod,
      notes: formData.get('notes') as string,
      amount: parseFloat(formData.get('amount') as string),
      orderHistory: [],
      id: undefined
    };

    saveOrder(order);

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
  }

  return (
    <>
      <h2 className="text-lg font-semibold leading-none tracking-tight mb-4">
        Nuevo Pedido
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cliente
          </label>
          <input
            name='customerName'
            type="text"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Nombre del cliente"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Contacto del cliente
          </label>
          <input
            name='customerContact'
            type="text"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Teléfono o email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            name='description'
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Detalles del pedido"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha de entrega
          </label>
          <input
            name='deliveryDate'
            type="date"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo de producto
          </label>
          <select name='productType' className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="tarta">Tarta</option>
            <option value="galletas">Galletas</option>
            <option value="cupcakes">Cupcakes</option>
            <option value="macarons">Macarons</option>
            <option value="otros">Otros</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cantidad
          </label>
          <input
            name='quantity'
            type="number"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tamaño o peso
          </label>
          <input
            name='sizeOrWeight'
            type="text"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Medida del producto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sabor
          </label>
          <input
            name='flavor'
            type="text"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Sabor del producto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Información alergias
          </label>
          <textarea
            name='allergyInformation'
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Detalles de alergias"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Método de pago
          </label>
          <select name='paymentMethod' className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="bizum">Bizum</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            name='notes'
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Notas adicionales"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Importe
          </label>
          <input
            name='amount'
            type="number"
            className="mt-1 block w-full rounded-md focus:outline-none border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.00"
          />
        </div>
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

export default OrderForm;
