import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/adminApi";
import { resolveAssetUrl, uploadFile } from "@/lib/api";
import { DEFAULT_PRIMARY_COLOR, THEME_UPDATED_EVENT } from "@/lib/theme";

function normalizeDraft(payload) {
  const settings = payload?.settings && typeof payload.settings === "object" ? payload.settings : payload;
  return {
    id: String(payload?.id || ""),
    name: String(payload?.name || "").trim() || "Theme",
    public_primary_color: String(settings?.public_primary_color || settings?.primary_color || DEFAULT_PRIMARY_COLOR),
    public_layout: String(settings?.public_layout || "classic"),
    public_logo_url: String(settings?.public_logo_url || "").trim(),
    public_radius: String(settings?.public_radius || "0.5rem").trim(),
    public_home_hero_image: String(settings?.public_home_hero_image || "").trim(),
    public_home_promo_image: String(settings?.public_home_promo_image || "").trim(),
    public_home_sections: Array.isArray(settings?.public_home_sections) ? settings.public_home_sections : [],
    public_home_content: settings?.public_home_content && typeof settings.public_home_content === "object" ? settings.public_home_content : {},
    public_content_overrides:
      settings?.public_content_overrides && typeof settings.public_content_overrides === "object" ? settings.public_content_overrides : {},
  };
}

function applyNestedDraftChange(prev, key, value) {
  const path = String(key || "").trim();
  if (!path) return prev;
  const [root, leaf] = path.split(".", 2);
  if (root === "public_home_content" && leaf) {
    return {
      ...prev,
      public_home_content: {
        ...(prev.public_home_content && typeof prev.public_home_content === "object" ? prev.public_home_content : {}),
        [leaf]: value,
      },
    };
  }
  return prev;
}

function applyXPathOverride(prev, { route, xpath, value }) {
  const safeRoute = String(route || "/").trim() || "/";
  const safeXPath = String(xpath || "").trim();
  if (!safeXPath) return prev;

  const overrides =
    prev.public_content_overrides && typeof prev.public_content_overrides === "object" ? prev.public_content_overrides : {};
  const existingList = Array.isArray(overrides[safeRoute]) ? overrides[safeRoute].slice() : [];
  const index = existingList.findIndex((item) => String(item?.xpath || "").trim() === safeXPath);

  const nextItem = { xpath: safeXPath, value: String(value ?? "") };
  if (index >= 0) existingList[index] = { ...existingList[index], ...nextItem };
  else existingList.push(nextItem);

  return {
    ...prev,
    public_content_overrides: {
      ...overrides,
      [safeRoute]: existingList,
    },
  };
}

export default function ThemeEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const themeId = String(searchParams.get("id") || "").trim();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState("edit"); // edit | navigate
  const [routePath, setRoutePath] = useState("/");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState(() =>
    normalizeDraft({
      id: "",
      name: "Theme",
      public_primary_color: DEFAULT_PRIMARY_COLOR,
      public_layout: "classic",
      public_logo_url: "",
      public_radius: "0.5rem",
      public_home_hero_image: "",
      public_home_promo_image: "",
      public_home_sections: [],
      public_home_content: {},
    })
  );

  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const quickRoutes = useMemo(
    () => [
      { label: "Home", path: "/" },
      { label: "Products", path: "/products" },
      { label: "Cart", path: "/cart" },
      { label: "Checkout", path: "/checkout" },
      { label: "Blog", path: "/blog" },
      { label: "About us", path: "/about-us" },
      { label: "Contact", path: "/contact" },
    ],
    []
  );

  const draftSettings = useMemo(
    () => ({
      public_primary_color: String(draft.public_primary_color || DEFAULT_PRIMARY_COLOR).trim(),
      public_layout: String(draft.public_layout || "classic").trim(),
      public_logo_url: String(draft.public_logo_url || "").trim(),
      public_radius: String(draft.public_radius || "0.5rem").trim(),
      public_home_hero_image: String(draft.public_home_hero_image || "").trim(),
      public_home_promo_image: String(draft.public_home_promo_image || "").trim(),
      public_home_sections: Array.isArray(draft.public_home_sections) ? draft.public_home_sections : [],
      public_home_content: draft.public_home_content && typeof draft.public_home_content === "object" ? draft.public_home_content : {},
      public_content_overrides:
        draft.public_content_overrides && typeof draft.public_content_overrides === "object" ? draft.public_content_overrides : {},
    }),
    [draft]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");
        setPreviewReady(false);

        if (themeId) {
          const result = await adminApi.getPublicTheme(themeId);
          if (!active) return;
          const preset = result?.preset || null;
          if (!preset) throw new Error("Theme not found.");
          setDraft(normalizeDraft({ id: preset.id, name: preset.name, settings: preset.settings }));
          return;
        }

        const settings = await adminApi.getThemeSettings();
        if (!active) return;
        setDraft(normalizeDraft({ id: "", name: "Theme", settings }));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load theme.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [themeId]);

  useEffect(() => {
    const onMessage = (event) => {
      const origin = String(window?.location?.origin || "");
      if (origin && event?.origin && event.origin !== origin) return;
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "theme-editor:change") return;
      const mode = String(data.mode || "key").trim();
      const value = typeof data.value === "string" ? data.value : String(data.value ?? "");
      if (mode === "xpath") {
        const route = String(data.route || "/").trim() || "/";
        const xpath = String(data.xpath || "").trim();
        if (!xpath) return;
        setDraft((prev) => applyXPathOverride(prev, { route, xpath, value }));
        return;
      }

      const key = String(data.key || "").trim();
      if (!key) return;
      setDraft((prev) => applyNestedDraftChange(prev, key, value));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!previewReady) return;
    const iframe = iframeRef.current;
    const target = iframe?.contentWindow;
    if (!target) return;

    const timer = window.setTimeout(() => {
      try {
        target.postMessage({ type: "theme-preview", settings: draftSettings }, window.location.origin);
        target.postMessage({ type: "theme-editor:setMode", mode: editorMode }, window.location.origin);
      } catch {
        // Ignore preview postMessage failures.
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [draftSettings, previewReady, editorMode]);

  useEffect(() => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    try {
      target.postMessage({ type: "theme-editor:setMode", mode: editorMode }, window.location.origin);
    } catch {
      // ignore
    }
  }, [editorMode]);

  const buildEditorSrc = (path) => {
    const raw = String(path || "/").trim() || "/";
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    return `${normalized}${normalized.includes("?") ? "&" : "?"}editor=1`;
  };

  const openRoute = () => {
    setPreviewReady(false);
    const iframe = iframeRef.current;
    const target = iframe?.contentWindow;
    if (!target) return;
    try {
      target.location.href = buildEditorSrc(routePath);
    } catch {
      // ignore
    }
  };

  const buildPayload = () => ({
    name: String(draft.name || "").trim() || "Theme",
    settings: { ...draftSettings },
  });

  const createNewTheme = async () => {
    const result = await adminApi.createPublicTheme(buildPayload());
    const presets = Array.isArray(result?.presets) ? result.presets : [];
    const created = presets[0] || null;
    if (!created?.id) throw new Error("Failed to create theme.");
    navigate(`/admin/theme-editor?id=${encodeURIComponent(created.id)}`, { replace: true });
    return created.id;
  };

  const saveCurrentTheme = async () => {
    if (!draft.id) return createNewTheme();
    await adminApi.updatePublicTheme(draft.id, buildPayload());
    return draft.id;
  };

  const onSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const id = await saveCurrentTheme();
      setMessage(id === draft.id && draft.id ? "Theme updated." : "Theme created.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveAsNew = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await createNewTheme();
      setMessage("Theme saved as new.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const onApply = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const id = await saveCurrentTheme();
      await adminApi.applyPublicTheme(id);
      window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: { settings: draftSettings } }));
      setMessage("Theme applied.");
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to apply theme.");
    } finally {
      setSaving(false);
      setIsApplyDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theme editor"
        description="Click text/buttons in the preview to edit. Save updates the current theme; Save as new creates a new theme card."
        actions={
          <Button variant="outline" onClick={() => navigate("/admin/layouts")} disabled={saving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              Preview {draft.id ? <Badge variant="secondary">Saved</Badge> : <Badge variant="outline">Live</Badge>}
            </CardTitle>
            <CardDescription>
              {editorMode === "edit"
                ? "Edit mode: click text/buttons to edit. Press Enter to commit."
                : "Navigate mode: use the website normally (click links, open pages)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                variant={editorMode === "edit" ? "default" : "outline"}
                onClick={() => setEditorMode("edit")}
                disabled={saving || loading}
              >
                Edit mode
              </Button>
              <Button
                variant={editorMode === "navigate" ? "default" : "outline"}
                onClick={() => setEditorMode("navigate")}
                disabled={saving || loading}
              >
                Navigate mode
              </Button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <select
                  value={routePath}
                  onChange={(e) => setRoutePath(e.target.value)}
                  disabled={saving || loading}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {quickRoutes.map((route) => (
                    <option key={route.path} value={route.path}>
                      {route.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={routePath}
                  onChange={(e) => setRoutePath(e.target.value)}
                  disabled={saving || loading}
                  placeholder="/products"
                  className="w-[220px]"
                />
                <Button variant="outline" onClick={openRoute} disabled={saving || loading}>
                  Go
                </Button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              title="Theme editor preview"
              src={buildEditorSrc(routePath)}
              onLoad={() => setPreviewReady(true)}
              className="h-[78vh] w-full rounded-xl border border-border/60 bg-white"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="font-display text-xl">Theme</CardTitle>
              <CardDescription>Basic settings (colors/logo). Text is edited inside the preview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} disabled={saving} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Main color</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={draft.public_primary_color}
                    onChange={(e) => setDraft((p) => ({ ...p, public_primary_color: e.target.value }))}
                    disabled={saving}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={draft.public_primary_color}
                    onChange={(e) => setDraft((p) => ({ ...p, public_primary_color: e.target.value }))}
                    disabled={saving}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Home layout</label>
                  <select
                    value={draft.public_layout}
                    onChange={(e) => setDraft((p) => ({ ...p, public_layout: e.target.value }))}
                    disabled={saving}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="classic">Classic</option>
                    <option value="categories-first">Categories first</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Button radius</label>
                  <select
                    value={draft.public_radius}
                    onChange={(e) => setDraft((p) => ({ ...p, public_radius: e.target.value }))}
                    disabled={saving}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="0.25rem">Small</option>
                    <option value="0.5rem">Medium</option>
                    <option value="0.75rem">Large</option>
                    <option value="1rem">XL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Logo URL</label>
                <Input
                  value={draft.public_logo_url}
                  onChange={(e) => setDraft((p) => ({ ...p, public_logo_url: e.target.value }))}
                  placeholder="uploads/... or https://..."
                  disabled={saving}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={saving}
                    onChange={async (event) => {
                      const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                      event.target.value = "";
                      if (!file) return;
                      try {
                        setSaving(true);
                        setError("");
                        const uploaded = await uploadFile(file);
                        const url = uploaded?.url || uploaded?.path || "";
                        setDraft((p) => ({ ...p, public_logo_url: String(url || "").trim() }));
                        setMessage("Logo uploaded.");
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload logo.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Preview:</span>
                    <img
                      src={resolveAssetUrl(draft.public_logo_url) || ""}
                      alt="Logo preview"
                      className="h-8 w-auto rounded bg-white p-1"
                      onError={(e) => {
                        e.currentTarget.src = "";
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hero image URL</label>
                  <Input
                    value={draft.public_home_hero_image}
                    onChange={(e) => setDraft((p) => ({ ...p, public_home_hero_image: e.target.value }))}
                    placeholder="uploads/... or https://..."
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promo image URL</label>
                  <Input
                    value={draft.public_home_promo_image}
                    onChange={(e) => setDraft((p) => ({ ...p, public_home_promo_image: e.target.value }))}
                    placeholder="uploads/... or https://..."
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void onSave()} disabled={saving || loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="secondary" onClick={() => void onSaveAsNew()} disabled={saving || loading}>
                  Save as new
                </Button>
                <Button
                  variant="default"
                  onClick={() => setIsApplyDialogOpen(true)}
                  disabled={saving || loading}
                >
                  Apply
                </Button>
              </div>

              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your changes (update current theme, or create a new one if needed) and apply it to the public website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onApply()}>Yes, apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
