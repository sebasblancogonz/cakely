'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { OrderImage } from '@types';

const Lightbox = dynamic(() => import('yet-another-react-lightbox'), {
  ssr: false
});
import 'yet-another-react-lightbox/styles.css';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface OrderImagesClientProps {
  images: OrderImage[];
}

const OrderImagesClient: React.FC<OrderImagesClientProps> = ({
  images = []
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const slides = images
    .filter((img) => img?.url)
    .map((img) => ({ src: img.url }));

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  if (slides.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay imágenes de referencia.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {images.map(
          (img, index) =>
            img?.url && (
              <div
                key={img.id || `img-${index}`}
                className="relative w-24 h-24 cursor-pointer rounded border overflow-hidden hover:opacity-80 transition-opacity hover:ring-2 hover:ring-primary"
                onClick={() => handleImageClick(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleImageClick(index)}
              >
                <Image
                  src={img.url}
                  alt={`Referencia ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                  sizes="(max-width: 640px) 100px, 100px"
                />
              </div>
            )
        )}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={selectedIndex}
        slides={slides}
        styles={{ container: { backgroundColor: 'rgba(0, 0, 0, 0.85)' } }}
        carousel={{ finite: slides.length <= 1 }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined
        }}
        plugins={[Thumbnails, Zoom]}
      />
    </>
  );
};

export default OrderImagesClient;
