import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate, Trash2, Check, Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/adminApi";
import { DEFAULT_PRIMARY_COLOR, THEME_UPDATED_EVENT } from "@/lib/theme";

function normalizeColor(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_PRIMARY_COLOR;
  return raw;
}

export default function Layouts() {
  const navigate = useNavigate();
  const [store, setStore] = useState({ active_id: null, presets: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [pendingApplyPreset, setPendingApplyPreset] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const presets = useMemo(() => (Array.isArray(store?.presets) ? store.presets : []), [store]);
  const activeId = typeof store?.active_id === "string" ? store.active_id : null;
  const activePreset = useMemo(
    () => (activeId ? presets.find((row) => row?.id === activeId) || null : null),
    [activeId, presets]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");
        const result = await adminApi.listPublicThemes();
        if (!active) return;
        setStore(result && typeof result === "object" ? result : { active_id: null, presets: [] });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load themes.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const onDelete = async (id) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const result = await adminApi.deletePublicTheme(String(id));
      setStore(result && typeof result === "object" ? result : store);
      setMessage("Theme deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete theme.");
    } finally {
      setSaving(false);
    }
  };

  const onApply = async (preset) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const id = String(preset?.id || "").trim();
      if (!id) throw new Error("Missing theme id.");
      const result = await adminApi.applyPublicTheme(id);
      setStore(result && typeof result === "object" ? result : store);
      window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: { settings: preset?.settings || {} } }));
      setMessage("Theme applied.");
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to apply theme.");
    } finally {
      setSaving(false);
      setIsApplyDialogOpen(false);
    }
  };

  const openEditor = (id = "") => {
    const safeId = String(id || "").trim();
    navigate(safeId ? `/admin/theme-editor?id=${encodeURIComponent(safeId)}` : "/admin/theme-editor");
  };

  const renderThemeCard = ({ preset, isActive, title, description, iframeSrc }) => {
    const id = String(preset?.id || "").trim();
    const settings = preset?.settings && typeof preset.settings === "object" ? preset.settings : {};
    const color = normalizeColor(settings?.public_primary_color || settings?.primary_color);

    return (
      <Card key={id || title} className="border-border/60 bg-card/90 overflow-hidden">
        <div className="relative h-40 w-full bg-white">
          <iframe
            title={`Theme preview ${id || title}`}
            src={iframeSrc}
            className="h-full w-full"
            style={{ pointerEvents: "none" }}
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/55 to-transparent p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              {description ? <p className="truncate text-xs text-white/80">{description}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full ring-2 ring-white/70" style={{ backgroundColor: color }} />
              {isActive ? (
                <Badge className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Active
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Button variant="outline" onClick={() => openEditor(id)} disabled={saving}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant={isActive ? "secondary" : "default"}
            onClick={() => {
              setPendingApplyPreset(preset);
              setIsApplyDialogOpen(true);
            }}
            disabled={saving || !id || isActive}
          >
            {isActive ? "Applied" : "Apply"}
          </Button>
          {id ? (
            <Button variant="destructive" onClick={() => void onDelete(id)} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Themes"
        description="Themes for the public website. Edit opens a visual builder, save creates a new theme card, apply switches the live site."
        actions={
          <Button variant="default" onClick={() => openEditor("")} disabled={saving}>
            <Plus className="mr-2 h-4 w-4" />
            New theme
          </Button>
        }
      />

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {renderThemeCard({
          preset: activePreset || { id: "", settings: {} },
          isActive: Boolean(activePreset),
          title: activePreset?.name ? `Live: ${activePreset.name}` : "Live theme",
          description: activePreset ? "Currently applied to the public site." : "Default (no saved theme applied yet).",
          iframeSrc: activePreset?.id ? `/?previewThemeId=${encodeURIComponent(activePreset.id)}` : "/",
        })}

        <Card className="border-dashed border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <LayoutTemplate className="h-5 w-5" />
              Create new theme
            </CardTitle>
            <CardDescription>Opens the visual editor starting from the live theme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => openEditor("")} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Open editor
            </Button>
          </CardContent>
        </Card>

        {presets
          .filter((preset) => preset?.id && preset.id !== activeId)
          .map((preset) =>
            renderThemeCard({
              preset,
              isActive: false,
              title: String(preset?.name || "Theme"),
              description: "Saved theme",
              iframeSrc: `/?previewThemeId=${encodeURIComponent(preset.id)}`,
            })
          )}

        {presets.length === 0 && !loading ? (
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>No themes yet</CardTitle>
              <CardDescription>Create your first theme in the editor.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      <AlertDialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply theme?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingApplyPreset?.name
                ? `Apply "${pendingApplyPreset.name}" to the public website?`
                : "Apply this theme to the public website?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingApplyPreset) return;
                void onApply(pendingApplyPreset);
                setPendingApplyPreset(null);
              }}
            >
              Yes, apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

