'use client';

import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
  UploadResponse
} from '@imagekit/next';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderImage } from '@types';

interface FileProgress {
  loaded: number;
  total: number;
}

interface TotalProgress {
  totalLoaded: number;
  totalSize: number;
}

export default function MultiUpload({ orderId }: { orderId: number }) {
  const [images, setImages] = useState<OrderImage[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [globalProgress, setGlobalProgress] = useState<number>(0);
  const progressRef = useRef<Record<string, FileProgress>>({});
  const totalProgressRef = useRef<TotalProgress>({
    totalLoaded: 0,
    totalSize: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    if (!files) {
      setPreviews([]);
      return;
    }
    const fileArray = Array.from(files);
    const urls = fileArray.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const authenticator = useCallback(async () => {
    try {
      const res = await fetch('/api/images/auth');
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Authentication error response: ${errText}`);
        throw new Error(`Authentication failed: ${res.statusText}`);
      }
      return await res.json();
    } catch (error) {
      console.error('Failed to fetch authentication details:', error);
      throw new Error('Could not get upload credentials.');
    }
  }, []);

  const storeImageMetadata = async (uploaded: OrderImage[]) => {
    if (uploaded.length === 0) return;
    try {
      const response = await fetch('/api/store-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: uploaded, orderId })
      });
      if (!response.ok) {
        console.error('Failed to store image metadata:', await response.text());
      }
    } catch (error) {
      console.error('Error storing image metadata:', error);
    }
  };

  const updateGlobalProgress = useCallback(() => {
    const currentProgress = progressRef.current;
    const totalSize = totalProgressRef.current.totalSize;

    if (totalSize === 0) {
      setGlobalProgress(0);
      return;
    }

    let totalLoaded = 0;
    Object.values(currentProgress).forEach((fileProg) => {
      totalLoaded += fileProg.loaded;
    });

    totalProgressRef.current.totalLoaded = totalLoaded;
    const percentage = (totalLoaded / totalSize) * 100;
    setGlobalProgress(percentage > 100 ? 100 : percentage);
  }, []);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setGlobalProgress(0);
    progressRef.current = {};
    totalProgressRef.current = { totalLoaded: 0, totalSize: 0 };

    const filesArray = Array.from(files);
    totalProgressRef.current.totalSize = filesArray.reduce(
      (sum, file) => sum + file.size,
      0
    );

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const uploadPromises = filesArray.map((file, index) => {
      const fileKey = `${file.name}-${index}`;
      progressRef.current[fileKey] = { loaded: 0, total: file.size };

      return new Promise(async (resolve, reject) => {
        let authDetails;
        try {
          authDetails = await authenticator();

          const result: UploadResponse = await upload({
            ...authDetails,
            file,
            fileName: file.name,
            useUniqueFileName: true,
            folder: 'aurabakery',
            tags: [`orderId:${orderId}`],
            abortSignal: signal,
            onProgress: (progressEvent: ProgressEvent) => {
              if (progressEvent.lengthComputable) {
                progressRef.current[fileKey] = {
                  loaded: progressEvent.loaded,
                  total: progressEvent.total
                };
                updateGlobalProgress();
              }
            }
          });
          resolve({ uploadResult: result, fileKey: fileKey });
        } catch (error) {
          reject({ error: error, fileKey: fileKey });
        }
      });
    });

    const results = await Promise.allSettled(uploadPromises);

    const uploadedSuccessfully: OrderImage[] = [];
    results.forEach((result: any) => {
      if (result.status === 'fulfilled') {
        const { uploadResult, fileKey } = result.value;

        console.log(`Upload successful for ${fileKey}:`, uploadResult.filePath);
        if (uploadResult.fileId && uploadResult.url) {
          uploadedSuccessfully.push({
            id: uploadResult.fileId,
            url: uploadResult.url
          });
        } else {
          console.warn(
            `Upload result for ${fileKey} missing fileId or url`,
            uploadResult
          );
        }
        delete progressRef.current[fileKey];
      } else {
        const { error, fileKey } = result.reason;

        if (error instanceof ImageKitAbortError) {
          console.error(`Upload aborted for file ${fileKey}:`, error.reason);
        } else if (error instanceof ImageKitInvalidRequestError) {
          console.error(`Invalid request for file ${fileKey}:`, error.message);
        } else if (error instanceof ImageKitUploadNetworkError) {
          console.error(`Network error for file ${fileKey}:`, error.message);
        } else if (error instanceof ImageKitServerError) {
          console.error(`Server error for file ${fileKey}:`, error.message);
        } else {
          console.error(
            `Upload/Auth error for file ${fileKey}:`,
            error.message || error
          );
        }
        delete progressRef.current[fileKey];
      }
    });

    updateGlobalProgress();
    if (
      totalProgressRef.current.totalLoaded >=
        totalProgressRef.current.totalSize &&
      totalProgressRef.current.totalSize > 0
    ) {
      setGlobalProgress(100);
    }

    if (uploadedSuccessfully.length > 0) {
      setImages((prev) => [...prev, ...uploadedSuccessfully]);
      await storeImageMetadata(uploadedSuccessfully);
    }

    setIsUploading(false);
    if (filesArray.length > 0) {
      setFiles(null);
      setTimeout(() => {
        if (!isUploading) {
          setGlobalProgress(0);
        }
      }, 1500);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAbort = () => {
    abortControllerRef.current.abort();
    console.log('Upload cancellation requested.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalProgress(0);
    progressRef.current = {};
    totalProgressRef.current = { totalLoaded: 0, totalSize: 0 };
    setFiles(e.target.files);
  };

  return (
    <div className="space-y-4 flex justify-center flex-col items-center">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        <Images className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap cursor-pointer">
          Elegir imágenes
        </span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        name="images"
        id="upload-images"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        multiple
        disabled={isUploading}
      />

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-2 justify-center">
          {previews.map((src, index) => (
            <img
              key={index}
              src={src}
              alt={`preview-${index}`}
              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded border"
            />
          ))}
        </div>
      )}

      {files && files.length > 0 && !isUploading && (
        <Button onClick={handleUpload} className="mt-2" disabled={isUploading}>
          Subir {files.length} {files.length === 1 ? 'imagen' : 'imágenes'}
        </Button>
      )}

      {isUploading && (
        <div className="w-full max-w-md mt-4 space-y-2">
          <progress
            value={globalProgress}
            max={100}
            className="w-full [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg   [&::-webkit-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {globalProgress.toFixed(0)}% Completado
            </p>
            <Button size="sm" variant="destructive" onClick={handleAbort}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-6 w-full">
          <h3 className="font-semibold text-center mb-2">Imágenes subidas:</h3>
          <ul className="space-y-2 flex flex-wrap gap-4 justify-center">
            {images.map((image, index) => (
              <li key={image.id || index} className="border rounded p-1">
                <img
                  src={image.url}
                  alt={`Imagen subida ${index + 1}`}
                  className="w-24 h-24 object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
