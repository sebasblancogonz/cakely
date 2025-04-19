'use client';

import { Button } from '@/components/ui/button';
import { Images } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MultiUpload({ orderId }: { orderId: number }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!files) {
      setPreviews([]);
      return;
    }

    const objectUrls = Array.from(files).map((file) =>
      URL.createObjectURL(file)
    );
    setPreviews(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles(selectedFiles);
    }
  };

  const handleUpload = async () => {
    if (!files) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file); // clave 'files' coincide con getAll en la API
    });

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    const urls = data.uploaded.map((img: any) => img.url);
    setImageUrls((prev) => [...prev, ...urls]);
    storeImageURLs(urls);
    setFiles(null);
  };

  const storeImageURLs = async (urls: string[]) => {
    try {
      console.log(imageUrls);
      const response = await fetch('/api/store-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, orderId })
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
    <div className="space-y-4 flex justify-center flex-col">
      <Button size="sm" variant="outline" className="h-8 gap-1">
        <Images className="h-3.5 w-3.5" />
        <label
          className="sr-only sm:not-sr-only sm:whitespace-nowrap cursor-pointer"
          htmlFor="upload-images"
        >
          Elegir imágenes
        </label>
      </Button>
      <input
        type="file"
        name="images"
        id="upload-images"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        multiple
      />

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-2">
          {previews.map((src, index) => (
            <img
              key={index}
              src={src}
              alt={`preview-${index}`}
              className="w-32 h-32 object-cover rounded"
            />
          ))}
        </div>
      )}

      {files && files.length > 0 && (
        <button
          onClick={handleUpload}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Subir imágenes
        </button>
      )}

      {imageUrls.length > 0 && (
        <div>
          <h3 className="font-semibold">Imágenes subidas:</h3>
          <ul className="space-y-2">
            {imageUrls.map((url, index) => (
              <li key={index}>
                <img src={url} alt={`img-${index}`} width={200} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
