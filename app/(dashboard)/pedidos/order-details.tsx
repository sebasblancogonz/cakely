import { Order } from '@types';
import DetailsTable from '../common/DetailsTable';

const OrderDetails = ({ order }: { order: Order }) => {
  const orderDetails = [
    {
      label: 'Nombre del cliente',
      value: order.customerName,
      key: 'customerName'
    },
    {
      label: 'Contacto del cliente',
      value: order.customerContact,
      key: 'customerContact'
    },
    { label: 'Descripción', value: order.description, key: 'description' },
    { label: 'Cantidad', value: order.amount, key: 'amount' },
    { label: 'Tipo de producto', value: order.productType, key: 'productType' },
    {
      label: 'Fecha de entrega',
      value: order.deliveryDate.toString(),
      key: 'deliveryDate'
    },
    {
      label: 'Estado del pedido',
      value: order.orderStatus,
      key: 'orderStatus'
    },
    {
      label: 'Fecha del pedido',
      value: order.orderDate.toString(),
      key: 'orderDate'
    },
    {
      label: 'Detalles de personalización',
      value: order.customizationDetails,
      key: 'customizationDetails'
    },
    { label: 'Cantidad', value: order.quantity, key: 'quantity' },
    { label: 'Tamaño o peso', value: order.sizeOrWeight, key: 'sizeOrWeight' },
    { label: 'Sabor', value: order.flavor, key: 'flavor' },
    {
      label: 'Información de alergias',
      value: order.allergyInformation,
      key: 'allergyInformation'
    },
    { label: 'Precio total', value: order.totalPrice, key: 'totalPrice' },
    {
      label: 'Estado de pago',
      value: order.paymentStatus,
      key: 'paymentStatus'
    },
    {
      label: 'Método de pago',
      value: order.paymentMethod,
      key: 'paymentMethod'
    },
    { label: 'Notas', value: order.notes, key: 'notes' }
  ];

  return <DetailsTable data={orderDetails} />;
};

export default OrderDetails;
