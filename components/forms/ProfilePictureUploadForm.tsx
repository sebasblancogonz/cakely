'use client';

import { upload } from '@imagekit/next';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface ProfilePictureUploadFormProps {
  currentImageUrl: string | null | undefined;
  onUploadSuccess: (newImageUrl: string | null) => void;
}

const isValidImageType = (file: File | null): boolean => {
  if (!file) return false;
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    file.type
  );
};
const MAX_IMAGE_SIZE_MB = 2;

export default function ProfilePictureUploadForm({
  currentImageUrl,
  onUploadSuccess
}: ProfilePictureUploadFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    currentImageUrl ?? null
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(currentImageUrl ?? null);
    }
  }, [currentImageUrl, file]);

  useEffect(() => {
    if (!file) {
      setPreview(currentImageUrl ?? null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, currentImageUrl]);

  const authenticator = useCallback(async () => {
    try {
      const res = await fetch('/api/images/auth');
      if (!res.ok) throw new Error(`Authentication failed [${res.status}]`);
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch auth details:', err);
      const message =
        err instanceof Error ? err.message : 'Could not get credentials.';
      setError(`Error de autenticación: ${message}`);
      throw new Error(message);
    }
  }, []);

  const updateProfilePicture = async (newImageUrl: string | null) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: newImageUrl })
      });
      if (!response.ok) throw new Error('Failed to update profile picture');
      const updatedUser = await response.json();
      toast({ description: 'Foto de perfil actualizada.' });
      onUploadSuccess(updatedUser.image);
    } catch (err) {
      console.error('Error updating profile picture:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error al guardar foto: ${message}`);
      toast({
        title: 'Error',
        description: `No se pudo guardar la foto: ${message}`,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('No hay archivo seleccionado.');
      return;
    }
    if (!isValidImageType(file)) {
      setError('Formato inválido.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(`Máx ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const authDetails = await authenticator();
      const folderPath = `avatars`;

      const result = await upload({
        ...authDetails,
        file: file,
        fileName: `avatar_${Date.now()}.${file.name.split('.').pop()}`,
        useUniqueFileName: false,
        folder: folderPath,
        tags: ['avatar'],
        abortSignal: abortControllerRef.current.signal,
        onProgress: (progressEvent: ProgressEvent) => {
          if (progressEvent.lengthComputable) {
            setUploadProgress(
              (progressEvent.loaded / progressEvent.total) * 100
            );
          }
        }
      });

      console.log('Upload successful:', result);
      if (result.url) {
        await updateProfilePicture(result.url);
      } else {
        throw new Error('ImageKit did not return a URL.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      const message =
        err instanceof Error ? err.message : 'Unknown upload error.';
      if (!message.includes('aborted')) {
        setError(`Error al subir: ${message}`);
        toast({
          title: 'Error de Subida',
          description: message,
          variant: 'destructive'
        });
      } else {
        setError('Subida cancelada.');
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
    abortControllerRef.current?.abort('User cancelled.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setError(null);
    setUploadProgress(0);
    if (selectedFile) {
      if (!isValidImageType(selectedFile)) {
        return;
      }
      if (selectedFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        return;
      }
    }
    setFile(selectedFile);
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;
    if (!confirm('¿Quitar foto de perfil actual?')) return;
    setIsUploading(true);
    setError(null);
    try {
      await updateProfilePicture(null);
    } catch (e) {
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <div className="w-24 h-24 rounded-full overflow-hidden border relative bg-muted flex items-center justify-center group">
        {preview ? (
          <Image
            src={preview}
            alt="Foto de perfil"
            layout="fill"
            objectFit="cover"
            key={preview}
            onError={() => setPreview(null)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sin Foto</span>
        )}
        {currentImageUrl && !file && !isUploading && (
          <Button
            variant="destructive"
            size="icon"
            type="button"
            className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-80 transition-opacity z-10"
            onClick={handleRemoveImage}
            aria-label="Eliminar foto actual"
          >
            {' '}
            <X className="h-4 w-4" />{' '}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id="profile-pic-upload"
        accept="image/png, image/jpeg, image/webp, image/gif"
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
          <span>{currentImageUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
        </Button>
      )}

      {file && !isUploading && (
        <Button onClick={handleUpload}>
          <UploadCloud className="mr-2 h-4 w-4" /> Confirmar y Subir
        </Button>
      )}

      {isUploading && (
        <div className="w-full max-w-xs mt-2 space-y-2 text-center">
          <progress
            value={uploadProgress}
            max={100}
            aria-label="Progreso de subida"
            className="w-full h-2 [&::-webkit-progress-bar]:rounded-lg [&::-webkit-progress-value]:rounded-lg [&::-webkit-progress-bar]:bg-slate-300 [&::-webkit-progress-value]:bg-primary transition-all [&::-moz-progress-bar]:bg-primary"
          />
          <div className="flex justify-center items-center gap-4">
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

      {error && (
        <p className="text-sm text-destructive mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
