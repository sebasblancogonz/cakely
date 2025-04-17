import { useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { Order } from '@types';

export default function MultiUpload({ orderId }: { orderId: number }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Manejar la subida de imágenes
  const handleSuccess = (result: any) => {
    console.log(result);
    if (result.event === 'success') {
      const url = (result.info as { secure_url: string }).secure_url;
      setImageUrls((prevUrls) => [...prevUrls, url]);
    }
  };

  // Enviar las URLs a la base de datos (opcional)
  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/store-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: imageUrls, orderId })
      });
      if (response.ok) {
        console.log('URLs almacenadas con éxito');
      } else {
        console.error('Error al almacenar las URLs');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
    }
  };

  return (
    <div>
      <CldUploadWidget
        uploadPreset="aura_dashboard"
        onSuccess={handleSuccess}
        options={{ multiple: true }}
      >
        {({ open }) => <button onClick={() => open?.()}>Subir Imágenes</button>}
      </CldUploadWidget>

      {imageUrls.length > 0 && (
        <div>
          <h3>Imágenes subidas:</h3>
          <ul>
            {imageUrls.map((url, index) => (
              <li key={index}>{url}</li>
            ))}
          </ul>
          <button onClick={handleSubmit}>Guardar URLs</button>
        </div>
      )}
    </div>
  );
}
