import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '../common/Button';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
} from '../../services/communityService';

interface CommunityImageUploadProps {
  onImagesChange: (files: File[]) => void;
  disabled?: boolean;
}

interface SelectedImage {
  id: number;
  file: File;
  previewUrl: string;
}

const ACCEPTED_IMAGE_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
].join(',');

function formatFileSize(size: number): string {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const CommunityImageUpload: React.FC<CommunityImageUploadProps> = ({
  onImagesChange,
  disabled = false,
}) => {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const previewUrls = useRef(new Set<string>());

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    []
  );

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';

    const nextErrors: string[] = [];
    const additions: SelectedImage[] = [];
    const overflowNames: string[] = [];
    const availableSlots = Math.max(0, MAX_IMAGES_PER_POST - images.length);

    for (const file of selectedFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        nextErrors.push(`${file.name}: ${validation.error ?? 'This image is not supported.'}`);
        continue;
      }

      if (additions.length >= availableSlots) {
        overflowNames.push(file.name);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      additions.push({
        id: nextId.current++,
        file,
        previewUrl,
      });
    }

    if (overflowNames.length > 0) {
      nextErrors.push(
        `You can select up to ${MAX_IMAGES_PER_POST} images. ${overflowNames.length} additional image${overflowNames.length === 1 ? ' was' : 's were'} not added.`
      );
    }

    setErrors(nextErrors);

    if (additions.length > 0) {
      const nextImages = [...images, ...additions];
      setImages(nextImages);
      onImagesChange(nextImages.map(({ file }) => file));
    }
  };

  const removeImage = (imageId: number) => {
    const imageToRemove = images.find(({ id }) => id === imageId);
    if (!imageToRemove) return;

    URL.revokeObjectURL(imageToRemove.previewUrl);
    previewUrls.current.delete(imageToRemove.previewUrl);

    const nextImages = images.filter(({ id }) => id !== imageId);
    setImages(nextImages);
    onImagesChange(nextImages.map(({ file }) => file));
    setErrors([]);
  };

  const isAtLimit = images.length >= MAX_IMAGES_PER_POST;

  return (
    <section className="space-y-4" aria-label="Post images">
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Add photos</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            JPEG, PNG, or WebP · Up to {MAX_IMAGES_PER_POST} images · 5 MB each
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="whitespace-nowrap text-xs font-medium text-slate-500" aria-live="polite">
            {images.length} / {MAX_IMAGES_PER_POST}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isAtLimit || disabled}
            icon={<ImagePlus className="h-4 w-4" />}
            onClick={() => inputRef.current?.click()}
          >
            Choose images
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            disabled={isAtLimit || disabled}
            className="sr-only"
            aria-label="Choose images to add to your post"
            onChange={handleSelection}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <ul
          className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
          role="alert"
        >
          {errors.map((error, index) => (
            <li key={`${index}-${error}`}>{error}</li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map(({ id, file, previewUrl }) => (
            <figure
              key={id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(id)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white shadow-sm transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
              <figcaption className="truncate px-2.5 py-2 text-[11px] text-slate-600">
                <span className="block truncate font-medium" title={file.name}>
                  {file.name}
                </span>
                <span className="text-slate-400">{formatFileSize(file.size)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};

export default CommunityImageUpload;
