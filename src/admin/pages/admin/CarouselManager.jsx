import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, Edit2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { uploadFile, resolveAssetUrl } from "@/lib/api";

export function CarouselManager({ images = [], onImagesChange, disabled = false }) {
  const [images_list, setImages] = useState(images);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ url: "", title: "", alt: "" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const openEditDialog = (index) => {
    if (index >= 0 && index < images_list.length) {
      setEditingIndex(index);
      setEditForm({
        url: images_list[index].url,
        title: images_list[index].title || "",
        alt: images_list[index].alt || "",
      });
    } else {
      setEditingIndex(-1);
      setEditForm({ url: "", title: "", alt: "" });
    }
    setIsDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
    setEditForm({ url: "", title: "", alt: "" });
    setError("");
  };

  const handleSaveImage = useCallback(() => {
    if (!editForm.url.trim()) {
      setError("Image URL is required");
      return;
    }

    const nextImages = images_list.slice();
    if (editingIndex >= 0) {
      nextImages[editingIndex] = {
        url: editForm.url.trim(),
        title: editForm.title.trim(),
        alt: editForm.alt.trim(),
      };
    } else {
      nextImages.push({
        url: editForm.url.trim(),
        title: editForm.title.trim(),
        alt: editForm.alt.trim(),
      });
    }

    setImages(nextImages);
    onImagesChange(nextImages);
    closeEditDialog();
  }, [editingIndex, editForm, images_list, onImagesChange]);

  const handleRemoveImage = useCallback(
    (index) => {
      const nextImages = images_list.filter((_, i) => i !== index);
      setImages(nextImages);
      onImagesChange(nextImages);
    },
    [images_list, onImagesChange]
  );

  const handleUploadImage = useCallback(
    async (file) => {
      if (!file) return;
      try {
        setUploading(true);
        setError("");
        const uploaded = await uploadFile(file);
        const url = String(uploaded?.url || uploaded?.path || "").trim();
        if (!url) throw new Error("Upload failed");
        setEditForm((prev) => ({ ...prev, url }));
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleMoveUp = useCallback(
    (index) => {
      if (index <= 0) return;
      const nextImages = images_list.slice();
      [nextImages[index - 1], nextImages[index]] = [nextImages[index], nextImages[index - 1]];
      setImages(nextImages);
      onImagesChange(nextImages);
    },
    [images_list, onImagesChange]
  );

  const handleMoveDown = useCallback(
    (index) => {
      if (index >= images_list.length - 1) return;
      const nextImages = images_list.slice();
      [nextImages[index], nextImages[index + 1]] = [nextImages[index + 1], nextImages[index]];
      setImages(nextImages);
      onImagesChange(nextImages);
    },
    [images_list, onImagesChange]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Heroes Carousel</CardTitle>
          <CardDescription>Manage banner carousel images ({images_list.length} images)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {images_list.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <p className="text-gray-500">No carousel images added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {images_list.map((image, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-200">
                    <img
                      src={resolveAssetUrl(image.url)}
                      alt={image.alt || "Carousel image"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">{image.title || image.url}</p>
                    <p className="truncate text-xs text-gray-500">{image.alt || "No alt text"}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(index)}
                      disabled={disabled}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={disabled || index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={disabled || index === images_list.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => openEditDialog(-1)} disabled={disabled} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Image
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{editingIndex >= 0 ? "Edit Image" : "Add Image"}</AlertDialogTitle>
            <AlertDialogDescription>Upload or paste an image URL for the carousel.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div>
              <label className="block text-sm font-medium mb-2">Image Preview</label>
              <div className="h-32 w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {editForm.url ? (
                  <img
                    src={resolveAssetUrl(editForm.url)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "";
                    }}
                  />
                ) : (
                  <span className="text-sm text-gray-500">No image selected</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Upload Image</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="carousel-image-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("carousel-image-upload")?.click()}
                  disabled={uploading || disabled}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                placeholder="e.g., /uploads/banner.jpg"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title (Optional)</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Image title"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Alt Text (Optional)</label>
              <Input
                value={editForm.alt}
                onChange={(e) => setEditForm({ ...editForm, alt: e.target.value })}
                placeholder="Alternative text for accessibility"
                disabled={disabled}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={closeEditDialog} disabled={disabled}>
                Cancel
              </Button>
              <Button onClick={handleSaveImage} disabled={disabled || !editForm.url.trim()}>
                {editingIndex >= 0 ? "Update" : "Add"} Image
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
