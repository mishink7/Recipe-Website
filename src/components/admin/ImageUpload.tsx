"use client";

import { useRef, useState } from "react";

interface ImageUploadProps {
  imageUrl?: string;
  onFileSelect: (base64: string) => void;
  currentImage?: string | null;
}

export default function ImageUpload({ imageUrl, onFileSelect, currentImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || imageUrl || currentImage || null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      // Strip the data URL prefix to get pure base64
      const base64 = result.split(",")[1];
      onFileSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Image</label>
      {displayUrl && (
        <div className="mb-3 rounded-lg overflow-hidden border border-card-border">
          <img
            src={displayUrl}
            alt="Recipe preview"
            className="w-full max-h-64 object-cover"
          />
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-accent bg-accent-light/20"
            : "border-card-border hover:border-accent"
        }`}
      >
        <p className="text-sm text-muted">
          {displayUrl ? "Drop a new image or click to replace" : "Drop an image here or click to select"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
