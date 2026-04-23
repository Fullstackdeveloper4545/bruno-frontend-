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
import { CarouselManager } from "./CarouselManager";

function settingsFromDraft(draft) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  return {
    public_primary_color: String(safeDraft.public_primary_color || DEFAULT_PRIMARY_COLOR).trim(),
    public_layout: String(safeDraft.public_layout || "classic").trim(),
    public_logo_url: String(safeDraft.public_logo_url || "").trim(),
    public_radius: String(safeDraft.public_radius || "0.5rem").trim(),
    public_home_hero_image: String(safeDraft.public_home_hero_image || "").trim(),
    public_home_hero_carousel_images: Array.isArray(safeDraft.public_home_hero_carousel_images) ? safeDraft.public_home_hero_carousel_images : [],

    public_home_promo_image: String(safeDraft.public_home_promo_image || "").trim(),
    public_category_card_bg_image: String(safeDraft.public_category_card_bg_image || "").trim(),
    public_home_hero_overlay_color: String(safeDraft.public_home_hero_overlay_color || "#000000").trim(),
    public_home_hero_overlay_opacity: String(safeDraft.public_home_hero_overlay_opacity ?? "0").trim(),
    public_home_promo_overlay_color: String(safeDraft.public_home_promo_overlay_color || "#000000").trim(),
    public_home_promo_overlay_opacity: String(safeDraft.public_home_promo_overlay_opacity ?? "0").trim(),
    public_category_card_overlay_color: String(safeDraft.public_category_card_overlay_color || "#000000").trim(),
    public_category_card_overlay_opacity: String(safeDraft.public_category_card_overlay_opacity ?? "0").trim(),
    public_home_sections: Array.isArray(safeDraft.public_home_sections) ? safeDraft.public_home_sections : [],
    public_home_content: safeDraft.public_home_content && typeof safeDraft.public_home_content === "object" ? safeDraft.public_home_content : {},
    public_home_custom_sections:
      safeDraft.public_home_custom_sections && typeof safeDraft.public_home_custom_sections === "object"
        ? safeDraft.public_home_custom_sections
        : {},
    public_content_overrides:
      safeDraft.public_content_overrides && typeof safeDraft.public_content_overrides === "object" ? safeDraft.public_content_overrides : {},
    public_layout_overrides:
      safeDraft.public_layout_overrides && typeof safeDraft.public_layout_overrides === "object" ? safeDraft.public_layout_overrides : {},
  };
}

function snapshotFromDraft(draft) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  return JSON.stringify({
    id: String(safeDraft.id || ""),
    name: String(safeDraft.name || "").trim() || "Theme",
    settings: settingsFromDraft(safeDraft),
  });
}

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
    public_home_hero_carousel_images: Array.isArray(settings?.public_home_hero_carousel_images) ? settings.public_home_hero_carousel_images : [],
    public_home_promo_image: String(settings?.public_home_promo_image || "").trim(),
    public_category_card_bg_image: String(settings?.public_category_card_bg_image || "").trim(),
    public_home_hero_overlay_color: String(settings?.public_home_hero_overlay_color || "#000000").trim(),
    public_home_hero_overlay_opacity: String(settings?.public_home_hero_overlay_opacity ?? "0").trim(),
    public_home_promo_overlay_color: String(settings?.public_home_promo_overlay_color || "#000000").trim(),
    public_home_promo_overlay_opacity: String(settings?.public_home_promo_overlay_opacity ?? "0").trim(),
    public_category_card_overlay_color: String(settings?.public_category_card_overlay_color || "#000000").trim(),
    public_category_card_overlay_opacity: String(settings?.public_category_card_overlay_opacity ?? "0").trim(),
    public_home_sections: Array.isArray(settings?.public_home_sections) ? settings.public_home_sections : [],
    public_home_content: settings?.public_home_content && typeof settings.public_home_content === "object" ? settings.public_home_content : {},
    public_home_custom_sections:
      settings?.public_home_custom_sections && typeof settings.public_home_custom_sections === "object"
        ? settings.public_home_custom_sections
        : {},
    public_content_overrides:
      settings?.public_content_overrides && typeof settings.public_content_overrides === "object" ? settings.public_content_overrides : {},
    public_layout_overrides:
      settings?.public_layout_overrides && typeof settings.public_layout_overrides === "object" ? settings.public_layout_overrides : {},
  };
}

function applyLayoutOverride(prev, { route, parentXPath, order, hidden }) {
  const safeRoute = String(route || "/").trim() || "/";
  const nextOrder = Array.isArray(order) ? order.map((value) => String(value || "").trim()).filter(Boolean) : [];
  const safeRootId = String(parentXPath || "").trim();
  const nextHidden = Array.isArray(hidden) ? hidden.map((value) => String(value || "").trim()).filter(Boolean) : [];
  if (!safeRootId) return prev;

  const overrides =
    prev.public_layout_overrides && typeof prev.public_layout_overrides === "object" ? prev.public_layout_overrides : {};

  return {
    ...prev,
    public_layout_overrides: {
      ...overrides,
      [safeRoute]: {
        root_id: safeRootId,
        order: nextOrder,
        hidden: nextHidden,
      },
    },
  };
}

function applyHomeSectionsOrder(prev, orderKeys) {
  const nextKeys = Array.isArray(orderKeys) ? orderKeys.map((key) => String(key || "").trim()).filter(Boolean) : [];
  if (nextKeys.length === 0) return prev;

  const current = Array.isArray(prev.public_home_sections) ? prev.public_home_sections : [];
  const enabledMap = new Map(
    current
      .map((row) => ({
        key: String(row?.key || row || "").trim(),
        enabled: typeof row === "object" && row ? row.enabled !== false : true,
      }))
      .filter((row) => row.key)
      .map((row) => [row.key, row.enabled])
  );

  const seen = new Set();
  const next = [];
  for (const key of nextKeys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push({ key, enabled: enabledMap.get(key) !== false });
  }

  for (const row of current) {
    const key = String(row?.key || row || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push({ key, enabled: enabledMap.get(key) !== false });
  }

  return { ...prev, public_home_sections: next };
}

function applyNestedDraftChange(prev, key, value) {
  const path = String(key || "").trim();
  if (!path) return prev;
  const parts = path.split(".").map((p) => String(p || "").trim()).filter(Boolean);
  const root = parts[0] || "";
  const leaf = parts[1] || "";
  if (parts.length === 1) {
    return { ...prev, [root]: value };
  }
  if (root === "public_home_content" && leaf) {
    return {
      ...prev,
      public_home_content: {
        ...(prev.public_home_content && typeof prev.public_home_content === "object" ? prev.public_home_content : {}),
        [leaf]: value,
      },
    };
  }
  if (root === "public_home_custom_sections") {
    const sectionId = leaf;
    const field = parts[2] || "";
    if (!sectionId || !field) return prev;
    const existing =
      prev.public_home_custom_sections && typeof prev.public_home_custom_sections === "object" ? prev.public_home_custom_sections : {};
    const currentSection = existing[sectionId] && typeof existing[sectionId] === "object" ? existing[sectionId] : {};
    return {
      ...prev,
      public_home_custom_sections: {
        ...existing,
        [sectionId]: {
          ...currentSection,
          [field]: value,
        },
      },
    };
  }
  return prev;
}

function resolveDraftValueByPath(draft, path) {
  const safe = String(path || "").trim();
  if (!safe) return "";
  const parts = safe.split(".").map((p) => String(p || "").trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return String(draft?.[parts[0]] ?? "");

  if (parts[0] === "public_home_content" && parts[1]) {
    return String(draft?.public_home_content?.[parts[1]] ?? "");
  }
  if (parts[0] === "public_home_custom_sections" && parts[1] && parts[2]) {
    return String(draft?.public_home_custom_sections?.[parts[1]]?.[parts[2]] ?? "");
  }
  return "";
}

function applyXPathOverride(prev, { route, xpath, attr, value }) {
  const safeRoute = String(route || "/").trim() || "/";
  const safeXPath = String(xpath || "").trim();
  const safeAttr = String(attr || "").trim();
  if (!safeXPath) return prev;

  const overrides =
    prev.public_content_overrides && typeof prev.public_content_overrides === "object" ? prev.public_content_overrides : {};
  const existingList = Array.isArray(overrides[safeRoute]) ? overrides[safeRoute].slice() : [];
  const index = existingList.findIndex(
    (item) => String(item?.xpath || "").trim() === safeXPath && String(item?.attr || "").trim() === safeAttr
  );

  const nextItem = safeAttr ? { xpath: safeXPath, attr: safeAttr, value: String(value ?? "") } : { xpath: safeXPath, value: String(value ?? "") };
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

function removeXPathOverride(prev, { route, xpath, attr }) {
  const safeRoute = String(route || "/").trim() || "/";
  const safeXPath = String(xpath || "").trim();
  const safeAttr = String(attr || "").trim();
  if (!safeXPath) return prev;

  const overrides =
    prev.public_content_overrides && typeof prev.public_content_overrides === "object" ? prev.public_content_overrides : {};
  const existingList = Array.isArray(overrides[safeRoute]) ? overrides[safeRoute] : [];
  if (existingList.length === 0) return prev;

  const nextList = existingList.filter(
    (item) => !(String(item?.xpath || "").trim() === safeXPath && String(item?.attr || "").trim() === safeAttr)
  );

  if (nextList.length === existingList.length) return prev;

  return {
    ...prev,
    public_content_overrides: {
      ...overrides,
      [safeRoute]: nextList,
    },
  };
}

function applyXPathStyles(prev, { route, xpath, styles }) {
  const safeRoute = String(route || "/").trim() || "/";
  const safeXPath = String(xpath || "").trim();
  if (!safeXPath) return prev;

  const nextStyles = styles && typeof styles === "object" && !Array.isArray(styles) ? styles : {};

  const overrides =
    prev.public_content_overrides && typeof prev.public_content_overrides === "object" ? prev.public_content_overrides : {};
  const existingList = Array.isArray(overrides[safeRoute]) ? overrides[safeRoute].slice() : [];
  const index = existingList.findIndex((item) => String(item?.xpath || "").trim() === safeXPath && !String(item?.attr || "").trim());

  if (index >= 0) {
    const current = existingList[index] && typeof existingList[index] === "object" ? existingList[index] : { xpath: safeXPath };
    const merged = {
      ...current,
      xpath: safeXPath,
      styles: {
        ...(current.styles && typeof current.styles === "object" && !Array.isArray(current.styles) ? current.styles : {}),
        ...nextStyles,
      },
    };
    existingList[index] = merged;
  } else {
    existingList.push({ xpath: safeXPath, styles: { ...nextStyles } });
  }

  return {
    ...prev,
    public_content_overrides: {
      ...overrides,
      [safeRoute]: existingList,
    },
  };
}

function removeXPathStyles(prev, { route, xpath }) {
  const safeRoute = String(route || "/").trim() || "/";
  const safeXPath = String(xpath || "").trim();
  if (!safeXPath) return prev;

  const overrides =
    prev.public_content_overrides && typeof prev.public_content_overrides === "object" ? prev.public_content_overrides : {};
  const existingList = Array.isArray(overrides[safeRoute]) ? overrides[safeRoute].slice() : [];
  const index = existingList.findIndex((item) => String(item?.xpath || "").trim() === safeXPath && !String(item?.attr || "").trim());
  if (index < 0) return prev;

  const current = existingList[index] && typeof existingList[index] === "object" ? existingList[index] : null;
  if (!current || !current.styles) return prev;

  const next = { ...current };
  delete next.styles;
  existingList[index] = next;

  return {
    ...prev,
    public_content_overrides: {
      ...overrides,
      [safeRoute]: existingList,
    },
  };
}

function cssColorToHex(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("#")) return raw;

  const rgbMatch = raw.match(/rgba?\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!rgbMatch) return "";
  const r = Math.min(255, Math.max(0, Number(rgbMatch[1])));
  const g = Math.min(255, Math.max(0, Number(rgbMatch[2])));
  const b = Math.min(255, Math.max(0, Number(rgbMatch[3])));
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export default function ThemeEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const themeId = String(searchParams.get("id") || "").trim();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState("edit"); // edit | layout | navigate
  const [routePath, setRoutePath] = useState("/");
  const [newHomeSectionType, setNewHomeSectionType] = useState("text");
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
      public_category_card_bg_image: "",
      public_home_hero_overlay_color: "#000000",
      public_home_hero_overlay_opacity: "0",
      public_home_promo_overlay_color: "#000000",
      public_home_promo_overlay_opacity: "0",
      public_category_card_overlay_color: "#000000",
      public_category_card_overlay_opacity: "0",
      public_home_sections: [],
      public_home_content: {},
      public_home_custom_sections: {},
      public_layout_overrides: {},
    })
  );

  const lastSavedSnapshotRef = useRef("");
  const [savedVersion, setSavedVersion] = useState(0);

  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [imageDialog, setImageDialog] = useState({
    open: false,
    kind: "",
    label: "",
    key: "",
    route: "",
    xpath: "",
    attr: "",
    current: "",
  });
  const [selectedText, setSelectedText] = useState(null);
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

  const draftSettings = useMemo(() => settingsFromDraft(draft), [draft]);
  const currentSnapshot = useMemo(() => snapshotFromDraft(draft), [draft]);
  const isDirty = useMemo(() => Boolean(lastSavedSnapshotRef.current) && currentSnapshot !== lastSavedSnapshotRef.current, [currentSnapshot, savedVersion]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");
        setPreviewReady(false);
        lastSavedSnapshotRef.current = "";
        setSavedVersion((v) => v + 1);

        if (themeId) {
          const result = await adminApi.getPublicTheme(themeId);
          if (!active) return;
          const preset = result?.preset || null;
          if (!preset) throw new Error("Theme not found.");
          const nextDraft = normalizeDraft({ id: preset.id, name: preset.name, settings: preset.settings });
          lastSavedSnapshotRef.current = snapshotFromDraft(nextDraft);
          setSavedVersion((v) => v + 1);
          setDraft(nextDraft);
          return;
        }

        const settings = await adminApi.getThemeSettings();
        if (!active) return;
        const nextDraft = normalizeDraft({ id: "", name: "Theme", settings });
        lastSavedSnapshotRef.current = snapshotFromDraft(nextDraft);
        setSavedVersion((v) => v + 1);
        setDraft(nextDraft);
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

      if (data.type === "theme-editor:select") {
        const mode = String(data.mode || "").trim();
        const route = String(data.route || "/").trim() || "/";
        const xpath = String(data.xpath || "").trim();
        const key = String(data.key || "").trim();
        const tag = String(data.tag || "").trim();
        const value = typeof data.value === "string" ? data.value : String(data.value ?? "");
        const styles = data.styles && typeof data.styles === "object" && !Array.isArray(data.styles) ? data.styles : null;
        if (mode === "key" || mode === "xpath") {
          setSelectedText({ mode, route, xpath, key, tag, value, styles });
        }
        return;
      }

      if (data.type === "theme-editor:image") {
        const mode = String(data.mode || "").trim();
        if (mode === "key") {
          const key = String(data.key || "").trim();
          if (!key) return;
          setImageDialog({
            open: true,
            kind: "key",
            label: String(data.label || key).trim() || key,
            key,
            route: "",
            xpath: "",
            attr: "",
            current: "",
          });
        } else if (mode === "xpath") {
          const route = String(data.route || "/").trim() || "/";
          const xpath = String(data.xpath || "").trim();
          const attr = String(data.attr || "src").trim() || "src";
          if (!xpath) return;
          setImageDialog({
            open: true,
            kind: "xpath",
            label: attr === "icon" ? "Icon" : "Image",
            key: "",
            route,
            xpath,
            attr,
            current: String(data.value || ""),
          });
        }
        return;
      }

      if (data.type === "theme-editor:layout") {
        const route = String(data.route || "/").trim() || "/";
        const parentXPath = String(data.root_id || data.rootId || "").trim();
        const order = Array.isArray(data.order) ? data.order : [];
        const hidden = Array.isArray(data.hidden) ? data.hidden : [];
        if (!parentXPath) return;
        setDraft((prev) => applyLayoutOverride(prev, { route, parentXPath, order, hidden }));
        return;
      }

      if (data.type === "theme-editor:home-sections-order") {
        const order = Array.isArray(data.order) ? data.order : [];
        if (order.length === 0) return;
        setDraft((prev) => applyHomeSectionsOrder(prev, order));
        return;
      }

      if (data.type === "theme-editor:home-sections-toggle") {
        const key = String(data.key || "").trim();
        const enabled = data.enabled !== false;
        if (!key) return;
        setDraft((prev) => {
          const current = Array.isArray(prev.public_home_sections) ? prev.public_home_sections : [];
          if (current.length === 0) return prev;
          const next = current.map((row) => {
            const rowKey = String(row?.key || row || "").trim();
            if (rowKey !== key) return row;
            if (typeof row === "object" && row) return { ...row, key: rowKey, enabled };
            return { key: rowKey, enabled };
          });
          return { ...prev, public_home_sections: next };
        });
        return;
      }

      if (data.type === "theme-editor:home-custom-delete") {
        const key = String(data.key || "").trim();
        if (!key.startsWith("custom:")) return;
        const id = key.slice("custom:".length).trim();
        if (!id) return;
        setDraft((prev) => {
          const nextSections = Array.isArray(prev.public_home_sections)
            ? prev.public_home_sections.filter((row) => String(row?.key || row || "").trim() !== key)
            : prev.public_home_sections;
          const existing =
            prev.public_home_custom_sections && typeof prev.public_home_custom_sections === "object"
              ? prev.public_home_custom_sections
              : {};
          const nextCustom = { ...existing };
          delete nextCustom[id];
          return { ...prev, public_home_sections: nextSections, public_home_custom_sections: nextCustom };
        });
        return;
      }

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

  const resolveDialogValue = () => {
    if (!imageDialog.open) return "";
    if (imageDialog.kind === "key") {
      return String(resolveDraftValueByPath(draft, imageDialog.key) || "").trim();
    }
    if (imageDialog.kind === "xpath") {
      const overrides =
        draft.public_content_overrides && typeof draft.public_content_overrides === "object" ? draft.public_content_overrides : {};
      const list = Array.isArray(overrides[imageDialog.route]) ? overrides[imageDialog.route] : [];
      const existing = list.find(
        (item) => String(item?.xpath || "").trim() === imageDialog.xpath && String(item?.attr || "").trim() === String(imageDialog.attr || "").trim()
      );
      return String(existing?.value || imageDialog.current || "").trim();
    }
    return "";
  };

  const overlayConfigForKey = (key) => {
    const safeKey = String(key || "").trim();
    if (safeKey === "public_home_hero_image") {
      return {
        label: "Hero overlay",
        colorKey: "public_home_hero_overlay_color",
        opacityKey: "public_home_hero_overlay_opacity",
      };
    }
    if (safeKey === "public_home_promo_image") {
      return {
        label: "Promo overlay",
        colorKey: "public_home_promo_overlay_color",
        opacityKey: "public_home_promo_overlay_opacity",
      };
    }
    if (safeKey === "public_category_card_bg_image") {
      return {
        label: "Category overlay",
        colorKey: "public_category_card_overlay_color",
        opacityKey: "public_category_card_overlay_opacity",
      };
    }
    return null;
  };

  useEffect(() => {
    if (!previewReady) return;
    const iframe = iframeRef.current;
    const target = iframe?.contentWindow;
    if (!target) return;
    try {
      target.postMessage({ type: "theme-preview", settings: draftSettings }, window.location.origin);
      target.postMessage({ type: "theme-editor:setMode", mode: editorMode }, window.location.origin);
    } catch {
      // Ignore preview postMessage failures.
    }
  }, [draftSettings, previewReady, editorMode]);

  // editorMode is already posted alongside theme settings above.

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
      lastSavedSnapshotRef.current = currentSnapshot;
      setSavedVersion((v) => v + 1);
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
      lastSavedSnapshotRef.current = currentSnapshot;
      setSavedVersion((v) => v + 1);
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
                Preview{" "}
              {saving ? (
                <Badge variant="secondary">Saving</Badge>
              ) : isDirty ? (
                <Badge variant="outline">Unsaved</Badge>
              ) : draft.id ? (
                <Badge variant="secondary">Saved</Badge>
              ) : (
                <Badge variant="outline">Live</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {editorMode === "edit"
                ? "Edit mode: click text/buttons to edit. Press Enter to commit."
                : editorMode === "layout"
                  ? "Layout mode: drag the section handles (≡) to reorder the page."
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
                variant={editorMode === "layout" ? "default" : "outline"}
                onClick={() => setEditorMode("layout")}
                disabled={saving || loading}
              >
                Layout mode
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

            {editorMode === "layout" && String(routePath || "").trim() === "/" ? (
              <div className="mb-3 rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm font-medium">Home custom sections</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={newHomeSectionType}
                    onChange={(e) => setNewHomeSectionType(e.target.value)}
                    disabled={saving || loading}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="cta">Button</option>
                  </select>
                  <Button
                    variant="outline"
                    disabled={saving || loading}
                    onClick={() => {
                      const type = String(newHomeSectionType || "text").trim() || "text";
                      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
                      const key = `custom:${id}`;
                      const defaults =
                        type === "image"
                          ? { type, title: "New image section", body: "Click to edit text.", image_url: "" }
                          : type === "cta"
                            ? { type, title: "New section", body: "Click to edit text.", button_label: "Shop now", button_href: "/products" }
                            : { type, title: "New section", body: "Click to edit text." };

                      setDraft((prev) => {
                        const existingCustom =
                          prev.public_home_custom_sections && typeof prev.public_home_custom_sections === "object"
                            ? prev.public_home_custom_sections
                            : {};
                        const existingSections = Array.isArray(prev.public_home_sections) ? prev.public_home_sections : [];
                        return {
                          ...prev,
                          public_home_custom_sections: { ...existingCustom, [id]: defaults },
                          public_home_sections: [...existingSections, { key, enabled: true }],
                        };
                      });
                    }}
                  >
                    Add section
                  </Button>
                </div>

                {draft.public_home_custom_sections && Object.keys(draft.public_home_custom_sections).length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {Object.entries(draft.public_home_custom_sections).map(([id, section]) => {
                      const safeId = String(id || "").trim();
                      if (!safeId) return null;
                      const type = String(section?.type || "text").trim() || "text";
                      const hrefKey = `public_home_custom_sections.${safeId}.button_href`;
                      const hrefValue = resolveDraftValueByPath(draft, hrefKey);
                      return (
                        <div key={safeId} className="rounded-md border border-border/60 bg-background p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="m-0 text-xs text-muted-foreground">
                              {type.toUpperCase()} • {safeId.slice(0, 8)}
                            </p>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={saving || loading}
                              onClick={() => {
                                const key = `custom:${safeId}`;
                                setDraft((prev) => {
                                  const existingCustom =
                                    prev.public_home_custom_sections && typeof prev.public_home_custom_sections === "object"
                                      ? prev.public_home_custom_sections
                                      : {};
                                  const nextCustom = { ...existingCustom };
                                  delete nextCustom[safeId];
                                  const nextSections = Array.isArray(prev.public_home_sections)
                                    ? prev.public_home_sections.filter((row) => String(row?.key || row || "").trim() !== key)
                                    : prev.public_home_sections;
                                  return { ...prev, public_home_custom_sections: nextCustom, public_home_sections: nextSections };
                                });
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                          {type === "cta" ? (
                            <div className="mt-3 grid gap-2">
                              <label className="text-xs text-muted-foreground">Button URL</label>
                              <Input
                                value={String(hrefValue || "").trim()}
                                onChange={(e) => setDraft((prev) => applyNestedDraftChange(prev, hrefKey, e.target.value))}
                                disabled={saving || loading}
                                placeholder="/products"
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No custom sections yet.</p>
                )}
              </div>
            ) : null}

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
              <CarouselManager
                images={draft.public_home_hero_carousel_images}
                onImagesChange={(images) => setDraft((p) => ({ ...p, public_home_hero_carousel_images: images }))}
                disabled={saving}
        />
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Edit images in the preview</p>
                <p className="mt-1">
                  In <span className="font-medium">Edit mode</span>, click any image in the preview to upload/reset it.
                  For layout backgrounds, click the hero/promo background area or the logo.
                </p>
              </div>

              {selectedText?.xpath ? (
                <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="text-sm font-medium">Selected element</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{selectedText.key ? selectedText.key : selectedText.xpath}</p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Color</label>
                      <Input
                        type="color"
                        value={cssColorToHex(selectedText.styles?.color) || "#000000"}
                        onChange={(e) => {
                          const hex = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { color: hex },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), color: hex } } : prev));
                        }}
                        disabled={saving}
                        className="h-10 w-20 p-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Font size</label>
                      <select
                        value={String(selectedText.styles?.fontSize || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { fontSize: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), fontSize: next } } : prev));
                        }}
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">(keep)</option>
                        <option value="12px">12</option>
                        <option value="14px">14</option>
                        <option value="16px">16</option>
                        <option value="18px">18</option>
                        <option value="24px">24</option>
                        <option value="32px">32</option>
                        <option value="40px">40</option>
                        <option value="48px">48</option>
                        <option value="56px">56</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Font weight</label>
                      <select
                        value={String(selectedText.styles?.fontWeight || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { fontWeight: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), fontWeight: next } } : prev));
                        }}
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">(keep)</option>
                        <option value="400">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Align</label>
                      <select
                        value={String(selectedText.styles?.textAlign || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { textAlign: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), textAlign: next } } : prev));
                        }}
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">(keep)</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Font family</label>
                      <select
                        value={String(selectedText.styles?.fontFamily || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { fontFamily: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), fontFamily: next } } : prev));
                        }}
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">(keep)</option>
                        <option value="inherit">Inherit</option>
                        <option value="system-ui">System</option>
                        <option value="Inter, sans-serif">Inter</option>
                        <option value="Poppins, sans-serif">Poppins</option>
                        <option value="Montserrat, sans-serif">Montserrat</option>
                        <option value="serif">Serif</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Transform</label>
                      <select
                        value={String(selectedText.styles?.textTransform || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { textTransform: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), textTransform: next } } : prev));
                        }}
                        disabled={saving}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">(keep)</option>
                        <option value="none">None</option>
                        <option value="uppercase">Uppercase</option>
                        <option value="lowercase">Lowercase</option>
                        <option value="capitalize">Capitalize</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Width</label>
                      <Input
                        value={String(selectedText.styles?.width || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { width: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), width: next } } : prev));
                        }}
                        disabled={saving}
                        placeholder="(keep) e.g. 100% / 320px"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Height</label>
                      <Input
                        value={String(selectedText.styles?.height || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { height: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), height: next } } : prev));
                        }}
                        disabled={saving}
                        placeholder="(keep) e.g. auto / 64px"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Padding</label>
                      <Input
                        value={String(selectedText.styles?.padding || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { padding: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), padding: next } } : prev));
                        }}
                        disabled={saving}
                        placeholder="(keep) e.g. 12px 20px"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Border radius</label>
                      <Input
                        value={String(selectedText.styles?.borderRadius || "").trim()}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDraft((prev) =>
                            applyXPathStyles(prev, {
                              route: selectedText.route,
                              xpath: selectedText.xpath,
                              styles: { borderRadius: next },
                            })
                          );
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), borderRadius: next } } : prev));
                        }}
                        disabled={saving}
                        placeholder="(keep) e.g. 9999px"
                        className="h-10"
                      />
                    </div>
                  </div>

                  {["button", "a"].includes(String(selectedText.tag || "").toLowerCase()) ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const styles = { backgroundColor: "#000000", color: "#FFFFFF", borderWidth: "0px" };
                          setDraft((prev) => applyXPathStyles(prev, { route: selectedText.route, xpath: selectedText.xpath, styles }));
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), ...styles } } : prev));
                        }}
                        disabled={saving}
                      >
                        Filled
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const styles = { backgroundColor: "transparent", color: "#000000", borderWidth: "1px", borderColor: "#000000" };
                          setDraft((prev) => applyXPathStyles(prev, { route: selectedText.route, xpath: selectedText.xpath, styles }));
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), ...styles } } : prev));
                        }}
                        disabled={saving}
                      >
                        Outline
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const styles = { borderRadius: "9999px" };
                          setDraft((prev) => applyXPathStyles(prev, { route: selectedText.route, xpath: selectedText.xpath, styles }));
                          setSelectedText((prev) => (prev ? { ...prev, styles: { ...(prev.styles || {}), ...styles } } : prev));
                        }}
                        disabled={saving}
                      >
                        Pill
                      </Button>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraft((prev) => removeXPathStyles(prev, { route: selectedText.route, xpath: selectedText.xpath }));
                      }}
                      disabled={saving}
                    >
                      Reset styles
                    </Button>
                  </div>
                </div>
              ) : null}

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

      <AlertDialog
        open={imageDialog.open}
        onOpenChange={(next) => setImageDialog((prev) => ({ ...prev, open: next }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{imageDialog.label ? `Edit ${imageDialog.label}` : "Edit image"}</AlertDialogTitle>
            <AlertDialogDescription>Upload a new image or reset/remove it.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              {resolveDialogValue() && resolveDialogValue() !== "__none__" ? (
                <img
                  src={resolveAssetUrl(resolveDialogValue()) || ""}
                  alt="Selected preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "";
                  }}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {resolveDialogValue() === "__none__" ? "No image (deleted)" : imageDialog.kind === "key" ? "Using default image" : "No image selected"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="theme-image-upload"
                onChange={async (event) => {
                  const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                  event.target.value = "";
                  if (!file) return;
                  try {
                    setSaving(true);
                    setError("");
                    const uploaded = await uploadFile(file);
                    const url = String(uploaded?.url || uploaded?.path || "").trim();
                    if (!url) throw new Error("Upload failed.");

                    if (imageDialog.kind === "key" && imageDialog.key) {
                      setDraft((prev) => applyNestedDraftChange(prev, imageDialog.key, url));
                    } else if (imageDialog.kind === "xpath" && imageDialog.xpath) {
                      setDraft((prev) =>
                        applyXPathOverride(prev, {
                          route: imageDialog.route,
                          xpath: imageDialog.xpath,
                          attr: imageDialog.attr || "src",
                          value: url,
                        })
                      );
                    }

                    setMessage("Image uploaded.");
                    setImageDialog((prev) => ({ ...prev, open: false }));
                  } catch (uploadError) {
                    setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
              <Button
                variant="default"
                onClick={() => {
                  const input = document.getElementById("theme-image-upload");
                  if (input && input instanceof HTMLInputElement) input.click();
                }}
                disabled={saving}
              >
                Upload image
              </Button>
              {imageDialog.kind === "key" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!imageDialog.key) return;
                      setDraft((prev) => applyNestedDraftChange(prev, imageDialog.key, ""));
                      setImageDialog((prev) => ({ ...prev, open: false }));
                    }}
                    disabled={saving || resolveDialogValue() === ""}
                  >
                    Use default
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!imageDialog.key) return;
                      setDraft((prev) => applyNestedDraftChange(prev, imageDialog.key, "__none__"));
                      setImageDialog((prev) => ({ ...prev, open: false }));
                    }}
                    disabled={saving || resolveDialogValue() === "__none__"}
                  >
                    Delete image
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!imageDialog.xpath) return;
                      setDraft((prev) =>
                        removeXPathOverride(prev, {
                          route: imageDialog.route,
                          xpath: imageDialog.xpath,
                          attr: imageDialog.attr || "src",
                        })
                      );
                      setImageDialog((prev) => ({ ...prev, open: false }));
                    }}
                    disabled={saving}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!imageDialog.xpath) return;
                      setDraft((prev) =>
                        applyXPathOverride(prev, {
                          route: imageDialog.route,
                          xpath: imageDialog.xpath,
                          attr: imageDialog.attr || "src",
                          value: "",
                        })
                      );
                      setImageDialog((prev) => ({ ...prev, open: false }));
                    }}
                    disabled={saving}
                  >
                    Delete image
                  </Button>
                </>
              )}
            </div>

            {imageDialog.kind === "key" ? (
              (() => {
                const overlay = overlayConfigForKey(imageDialog.key);
                if (!overlay) return null;
                const color = String(draft?.[overlay.colorKey] || "#000000").trim();
                const opacity = Number(draft?.[overlay.opacityKey] ?? 0);
                return (
                  <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="text-sm font-medium">{overlay.label}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Color</label>
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => setDraft((p) => ({ ...p, [overlay.colorKey]: e.target.value }))}
                          disabled={saving}
                          className="h-10 w-20 p-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Opacity ({Math.round(opacity * 100)}%)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={Number.isFinite(opacity) ? Math.round(opacity * 100) : 0}
                          disabled={saving}
                          onChange={(e) => {
                            const next = Math.min(Math.max(Number(e.target.value) / 100, 0), 1);
                            setDraft((p) => ({ ...p, [overlay.opacityKey]: String(next) }));
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
