'use client';

import React, { useState } from 'react';
import { Order, OrderImage } from '@types';
import DetailsTable from '@/components/common/DetailsTable';
import dynamic from 'next/dynamic';

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), {
  ssr: false
});

import 'yet-another-react-lightbox/styles.css';
import Link from 'next/link';

interface OrderDetailsProps {
  order: Order;
}

interface OrderDetailUIItem {
  label: string;
  value: React.ReactNode;
  key: string;
}

const OrderDetails = ({ order }: OrderDetailsProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!order) {
    return (
      <p className="text-center text-muted-foreground">
        No hay detalles de pedido para mostrar.
      </p>
    );
  }

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const formatCurrency = (
    value: string | number | null | undefined
  ): string => {
    const num = Number(value);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const imagesArray: OrderImage[] = Array.isArray(order.images)
    ? order.images
    : [];

  const orderDetails: OrderDetailUIItem[] = [
    {
      label: 'Cliente',
      value: order.customer?.name ?? 'N/A',
      key: 'customerName'
    },
    {
      label: 'Contacto',
      value: order.customer?.phone || order.customer?.email || 'N/A',
      key: 'customerContact'
    },
    {
      label: 'Instagram',
      value: order.customer?.instagramHandle || '-',
      key: 'customerInstagram'
    },
    {
      label: 'Conversación',
      value: (
        <>
          <Link
            className="text-blue-500"
            target="_blank"
            rel="noreferrer noopener"
            href={'https://wa.me/' + order.customer?.phone}
          >
            WhatsApp
          </Link>
          <br />
          {order.customer?.instagramHandle && (
            <Link
              target="_blank"
              className="text-blue-500"
              rel="noreferrer noopener"
              href={'https://ig.me/m/' + order.customer?.instagramHandle}
            >
              Instagram
            </Link>
          )}
        </>
      ),
      key: 'conversation'
    },
    { label: 'Descripción', value: order.description, key: 'description' },
    {
      label: 'Cantidad (Original)',
      value: formatCurrency(order.amount),
      key: 'amount'
    },
    { label: 'Tipo de producto', value: order.productType, key: 'productType' },
    {
      label: 'Fecha de entrega',
      value: formatDate(order.deliveryDate),
      key: 'deliveryDate'
    },
    {
      label: 'Estado del pedido',
      value: order.orderStatus,
      key: 'orderStatus'
    },
    {
      label: 'Fecha del pedido',
      value: formatDate(order.orderDate),
      key: 'orderDate'
    },
    {
      label: 'Detalles Personalización',
      value: order.customizationDetails || '-',
      key: 'customizationDetails'
    },
    { label: 'Cantidad (Items)', value: order.quantity, key: 'quantity' },
    { label: 'Tamaño / Peso', value: order.sizeOrWeight, key: 'sizeOrWeight' },
    { label: 'Sabor', value: order.flavor, key: 'flavor' },
    {
      label: 'Alergias',
      value: order.allergyInformation || '-',
      key: 'allergyInformation'
    },
    {
      label: 'Precio Total',
      value: formatCurrency(order.totalPrice),
      key: 'totalPrice'
    },
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
    { label: 'Notas', value: order.notes || '-', key: 'notes' },
    {
      label: 'Imágenes',
      key: 'images',
      value:
        imagesArray.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {imagesArray.map((img, index) =>
              img?.url ? (
                <img
                  key={img.id || index}
                  src={img.url}
                  alt={`Imagen ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleImageClick(index)}
                  loading="lazy"
                />
              ) : null
            )}
          </div>
        ) : (
          'No hay imágenes'
        )
    }
  ].filter(
    (item) =>
      item.value !== undefined && item.value !== null && item.value !== ''
  );

  const slides = imagesArray
    .filter((img) => img?.url)
    .map((img) => ({ src: img.url }));

  return (
    <>
      <DetailsTable data={orderDetails} />
      {slides.length > 0 && (
        <Lightbox
          carousel={{ finite: slides.length <= 1 }}
          render={{
            buttonPrev: slides.length <= 1 ? () => null : undefined,
            buttonNext: slides.length <= 1 ? () => null : undefined
          }}
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={selectedIndex}
          slides={slides}
          styles={{ container: { backgroundColor: 'rgba(0, 0, 0, 0.8)' } }} // Darker background
        />
      )}
    </>
  );
};

export default OrderDetails;
