'use client';

import { useState } from 'react';
import { Order } from '@types';
import DetailsTable from '@/components/common/DetailsTable';
import dynamic from 'next/dynamic';

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), {
  ssr: false
});

import 'yet-another-react-lightbox/styles.css';

const OrderDetails = ({ order }: { order: Order }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

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
    { label: 'Notas', value: order.notes, key: 'notes' },
    {
      label: 'Imágenes',
      key: 'images',
      value:
        Array.isArray(order.images) && order.images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {order.images.map((img, index) => (
              <img
                key={index}
                src={img.url}
                alt={`Imagen ${index + 1}`}
                className="w-24 h-24 object-cover rounded-md border cursor-pointer"
                onClick={() => handleImageClick(index)}
              />
            ))}
          </div>
        ) : (
          'No hay imágenes'
        )
    }
  ];

  return (
    <>
      <DetailsTable data={orderDetails} />
      <Lightbox
        carousel={{ finite: order.images.length <= 1 }}
        render={{
          buttonPrev: order.images.length <= 1 ? () => null : undefined,
          buttonNext: order.images.length <= 1 ? () => null : undefined
        }}
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={selectedIndex}
        slides={order.images.map((img) => ({ src: img.url }))}
        styles={{
          container: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }}
      />
    </>
  );
};

export default OrderDetails;
