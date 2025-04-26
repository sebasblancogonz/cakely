// src/components/forms/LogoUploadForm.tsx (o donde prefieras)
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { hashBusinessId } from '@/lib/encoder';
import { upload, UploadResponse } from '@imagekit/next';
import { Label } from '../ui/label';

interface LogoUploadFormProps {
  businessId: number | undefined;
  currentLogoUrl: string | null;
  onUploadSuccess: (newLogoUrl: string) => void;
}

const isValidLogoType = (file: File | null): boolean => {
  if (!file) return false;
  return file.type === 'image/svg+xml' || file.type === 'image/png';
};

const MAX_LOGO_SIZE_MB = 2;

export default function LogoUploadForm({
  businessId,
  currentLogoUrl,
  onUploadSuccess
}: LogoUploadFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const authenticator = useCallback(async () => {
    try {
      const res = await fetch('/api/images/auth');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Authentication failed [${res.status}]: ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch authentication details:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Could not get upload credentials.';
      setError(`Error de autenticación: ${message}`);
      throw new Error(message);
    }
  }, []);

  const updateBusinessProfile = async (newLogoUrl: string) => {
    try {
      const response = await fetch('/api/business-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: newLogoUrl })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to update business profile'
        );
      }

      const updatedProfile = await response.json();
      console.log('Business profile updated:', updatedProfile);
      toast({
        title: 'Éxito',
        description: 'Logo actualizado correctamente.'
      });
      onUploadSuccess(updatedProfile.logoUrl ?? newLogoUrl);
    } catch (err) {
      console.error('Error updating business profile:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error al guardar el logo: ${message}`);
      toast({
        title: 'Error al Guardar',
        description: `No se pudo actualizar el perfil del negocio: ${message}`,
        variant: 'destructive'
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !businessId) {
      setError('No hay archivo seleccionado o falta ID del negocio.');
      return;
    }
    if (!isValidLogoType(file)) {
      setError('Formato inválido. Solo se permiten SVG y PNG.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setError(`El archivo es demasiado grande (Máx ${MAX_LOGO_SIZE_MB}MB).`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const hashedFolder = await hashBusinessId(businessId);
      const authDetails = await authenticator();

      const result: UploadResponse = await upload({
        ...authDetails,
        file: file,
        fileName: `logo_${Date.now()}.${file.name.split('.').pop()}`,
        useUniqueFileName: false,
        folder: `${hashedFolder}/logo`,
        tags: [`businessId:${businessId}`, 'logo'],
        abortSignal: abortControllerRef.current.signal,
        onProgress: (progressEvent: ProgressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentage =
              (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(percentage);
          }
        }
      });

      console.log('Upload successful:', result);

      if (result.url) {
        await updateBusinessProfile(result.url);
      } else {
        throw new Error(
          'La subida se completó pero no se recibió URL de ImageKit.'
        );
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Error desconocido durante la subida.';
      if (!(err instanceof Error && err.message.includes('aborted'))) {
        setError(`Error al subir la imagen: ${message}`);
        toast({
          title: 'Error de Subida',
          description: message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsUploading(false);
      setFile(null);
      setTimeout(() => setUploadProgress(0), 2000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('Upload cancelled by user.');
      console.log('Upload cancellation requested.');
      setError('Subida cancelada por el usuario.');
      setIsUploading(false);
      setUploadProgress(0);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    setError(null);
    setUploadProgress(0);

    if (selectedFile) {
      if (!isValidLogoType(selectedFile)) {
        toast({
          title: 'Archivo Inválido',
          description: 'Por favor, selecciona un archivo SVG o PNG.',
          variant: 'destructive'
        });
        setFile(null);
        e.target.value = '';
        return;
      }
      if (selectedFile.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
        toast({
          title: 'Archivo Demasiado Grande',
          description: `El tamaño máximo permitido es ${MAX_LOGO_SIZE_MB}MB.`,
          variant: 'destructive'
        });
        setFile(null);
        e.target.value = '';
        return;
      }
    }
    setFile(selectedFile);
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;
    if (!confirm('¿Estás seguro de que quieres eliminar el logo actual?'))
      return;

    setIsUploading(true);
    setError(null);
    try {
      await updateBusinessProfile('');
    } catch (e) {
      console.error('Error removing logo', e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      {currentLogoUrl && !isUploading && !preview && (
        <div className="mb-4 text-center">
          <Label className="mb-2 block">Logo Actual</Label>
          <div className="relative group w-32 h-32 mx-auto border rounded-md overflow-hidden">
            <Image
              src={currentLogoUrl}
              alt="Logo actual del negocio"
              layout="fill"
              objectFit="contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveLogo}
              aria-label="Eliminar logo actual"
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="logo"
        id="logo-upload"
        accept="image/svg+xml, image/png"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
        multiple={false}
      />

      {!isUploading && (
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="h-4 w-4" />
          <span>
            {currentLogoUrl ? 'Cambiar Logo' : 'Subir Logo'} (SVG, PNG)
          </span>
        </Button>
      )}

      {preview && !isUploading && (
        <div className="mt-4 text-center">
          <Label className="mb-2 block">Nuevo Logo (Previsualización)</Label>
          <img
            src={preview}
            alt="Previsualización del nuevo logo"
            className="w-32 h-32 object-contain rounded border mx-auto"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {file && !isUploading && (
        <Button onClick={handleUpload} className="mt-2">
          <UploadCloud className="mr-2 h-4 w-4" />
          Confirmar y Subir Logo
        </Button>
      )}

      {isUploading && (
        <div className="w-full max-w-xs mt-4 space-y-2">
          <progress
            value={uploadProgress}
            max={100}
            aria-label="Progreso de subida del logo"
            className="w-full h-2 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-primary transition-all [&::-moz-progress-bar]:bg-primary"
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Subiendo... {uploadProgress.toFixed(0)}%
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAbort}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
