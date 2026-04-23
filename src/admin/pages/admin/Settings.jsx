import { useEffect, useMemo, useState } from "react";
import { Sliders, Loader2 } from "lucide-react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/adminApi";
import { DEFAULT_PRIMARY_COLOR, THEME_UPDATED_EVENT } from "@/lib/theme";

const MODULES_UPDATED_EVENT = "admin:modules-updated";
const moduleItems = [
  { label: "Produtos", key: "product" },
  { label: "Encomendas", key: "order" },
  { label: "Pagamentos", key: "payment" },
  { label: "Descontos", key: "discount" },
  { label: "Envios", key: "shipping" },
  { label: "Faturas", key: "invoice" },
  { label: "Relatórios", key: "report" },
  { label: "Clientes", key: "customers" },
];

const Settings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    site_name: "Backoffice Admin",
    currency: "EUR",
    vat_configuration: "23% VAT",
    email_settings: "notifications@ecom.pt",
  });
  const [initialGeneralSettings, setInitialGeneralSettings] = useState({
    site_name: "Backoffice Admin",
    currency: "EUR",
    vat_configuration: "23% VAT",
    email_settings: "notifications@ecom.pt",
  });
  const [loadingGeneralSettings, setLoadingGeneralSettings] = useState(true);
  const [savingGeneralSettings, setSavingGeneralSettings] = useState(false);
  const [modulesState, setModulesState] = useState({});
  const [loadingModules, setLoadingModules] = useState(true);
  const [themeSettings, setThemeSettings] = useState({
    public_primary_color: DEFAULT_PRIMARY_COLOR,
    public_layout: "classic",
  });
  const [initialThemeSettings, setInitialThemeSettings] = useState({
    public_primary_color: DEFAULT_PRIMARY_COLOR,
    public_layout: "classic",
  });
  const [loadingThemeSettings, setLoadingThemeSettings] = useState(true);
  const [savingThemeSettings, setSavingThemeSettings] = useState(false);
  const [athleteSettings, setAthleteSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  });
  const [initialAthleteSettings, setInitialAthleteSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  });
  const [loadingAthleteSettings, setLoadingAthleteSettings] = useState(true);
  const [savingAthleteSettings, setSavingAthleteSettings] = useState(false);
  const [brandSettings, setBrandSettings] = useState({
    enabled: true,
    brand_ids: [],
  });
  const [initialBrandSettings, setInitialBrandSettings] = useState({
    enabled: true,
    brand_ids: [],
  });
  const [loadingBrandSettings, setLoadingBrandSettings] = useState(true);
  const [savingBrandSettings, setSavingBrandSettings] = useState(false);
  const [performanceSettings, setPerformanceSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  });
  const [initialPerformanceSettings, setInitialPerformanceSettings] = useState({
    enabled: true,
    product_count: 10,
    category_ids: [],
    category_limits: {},
    sort_by: 'sales',
  });
  const [loadingPerformanceSettings, setLoadingPerformanceSettings] = useState(true);
  const [savingPerformanceSettings, setSavingPerformanceSettings] = useState(false);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadGeneralSettings = async () => {
      try {
        setLoadingGeneralSettings(true);
        const payload = await adminApi.getGeneralSettings();
        if (!active) return;
        const normalized = {
          site_name: String(payload?.site_name || "Backoffice Admin"),
          currency: String(payload?.currency || "EUR"),
          vat_configuration: String(payload?.vat_configuration || "23% VAT"),
          email_settings: String(payload?.email_settings || "notifications@ecom.pt"),
        };
        setGeneralSettings(normalized);
        setInitialGeneralSettings(normalized);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load general settings.");
      } finally {
        if (active) setLoadingGeneralSettings(false);
      }
    };

    const loadModules = async () => {
      try {
        setLoadingModules(true);
        setError("");
        const result = await adminApi.getSystemModules();
        if (!active) return;
        const payload = result?.modules && typeof result.modules === "object" ? result.modules : {};
        setModulesState(payload);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load module settings.");
      } finally {
        if (active) setLoadingModules(false);
      }
    };

    const loadThemeSettings = async () => {
      try {
        setLoadingThemeSettings(true);
        const payload = await adminApi.getThemeSettings();
        if (!active) return;
        const normalized = {
          public_primary_color: String(payload?.public_primary_color || payload?.primary_color || DEFAULT_PRIMARY_COLOR),
          public_layout: String(payload?.public_layout || "classic"),
        };
        setThemeSettings(normalized);
        setInitialThemeSettings(normalized);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load theme settings.");
      } finally {
        if (active) setLoadingThemeSettings(false);
      }
    };

    const loadAthleteSettings = async () => {
      try {
        setLoadingAthleteSettings(true);
        const payload = await adminApi.getAthleteSettings();
        if (!active) return;
        const normalized = {
          enabled: typeof payload?.enabled === 'boolean' ? payload.enabled : true,
          product_count: Number.isInteger(payload?.product_count) ? payload.product_count : 10,
          category_ids: Array.isArray(payload?.category_ids) ? payload.category_ids : [],
          category_limits: payload?.category_limits && typeof payload.category_limits === 'object' ? payload.category_limits : {},
          sort_by: payload?.sort_by || 'sales',
        };
        setAthleteSettings(normalized);
        setInitialAthleteSettings(normalized);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load athlete settings.");
      } finally {
        if (active) setLoadingAthleteSettings(false);
      }
    };

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const payload = await adminApi.listCategories();
        if (!active) return;
        setCategories(Array.isArray(payload) ? payload : []);
      } catch (loadError) {
        if (!active) return;
        setCategories([]);
      } finally {
        if (active) setLoadingCategories(false);
      }
    };

    const loadBrandSettings = async () => {
      try {
        setLoadingBrandSettings(true);
        const payload = await adminApi.getBrandSettings();
        if (!active) return;
        const normalized = {
          enabled: typeof payload?.enabled === 'boolean' ? payload.enabled : true,
          brand_ids: Array.isArray(payload?.brand_ids) ? payload.brand_ids : [],
        };
        setBrandSettings(normalized);
        setInitialBrandSettings(normalized);
        setAvailableBrands(Array.isArray(payload?.available_brands) ? payload.available_brands : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load brand settings.");
      } finally {
        if (active) setLoadingBrandSettings(false);
      }
    };

    const loadPerformanceSettings = async () => {
      try {
        setLoadingPerformanceSettings(true);
        const payload = await adminApi.getPerformanceSettings();
        if (!active) return;
        const normalized = {
          enabled: typeof payload?.enabled === 'boolean' ? payload.enabled : true,
          product_count: Number.isInteger(payload?.product_count) ? payload.product_count : 10,
          category_ids: Array.isArray(payload?.category_ids) ? payload.category_ids : [],
          category_limits: payload?.category_limits && typeof payload.category_limits === 'object' && !Array.isArray(payload.category_limits) ? payload.category_limits : {},
          sort_by: ['sales', 'rating', 'newest'].includes(payload?.sort_by) ? payload.sort_by : 'sales',
        };
        setPerformanceSettings(normalized);
        setInitialPerformanceSettings(normalized);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load performance settings.");
      } finally {
        if (active) setLoadingPerformanceSettings(false);
      }
    };

    void loadGeneralSettings();
    void loadModules();
    void loadThemeSettings();
    void loadAthleteSettings();
    void loadCategories();
    void loadBrandSettings();
    void loadPerformanceSettings();
    return () => {
      active = false;
    };
  }, []);

  const visibleModules = useMemo(
    () =>
      moduleItems.map((item) => ({
        ...item,
        enabled: modulesState[item.key] !== false,
      })),
    [modulesState]
  );
  const hasGeneralSettingsChanges = useMemo(
    () =>
      JSON.stringify(generalSettings) !== JSON.stringify(initialGeneralSettings),
    [generalSettings, initialGeneralSettings]
  );
  const hasThemeSettingsChanges = useMemo(
    () =>
      JSON.stringify(themeSettings) !== JSON.stringify(initialThemeSettings),
    [themeSettings, initialThemeSettings]
  );
  const hasAthleteSettingsChanges = useMemo(
    () =>
      JSON.stringify(athleteSettings) !== JSON.stringify(initialAthleteSettings),
    [athleteSettings, initialAthleteSettings]
  );
  const hasBrandSettingsChanges = useMemo(
    () =>
      JSON.stringify(brandSettings) !== JSON.stringify(initialBrandSettings),
    [brandSettings, initialBrandSettings]
  );
  const hasPerformanceSettingsChanges = useMemo(
    () =>
      JSON.stringify(performanceSettings) !== JSON.stringify(initialPerformanceSettings),
    [performanceSettings, initialPerformanceSettings]
  );

  const onSaveGeneralSettings = async () => {
    try {
      setSavingGeneralSettings(true);
      setError("");
      setMessage("");
      const payload = {
        site_name: String(generalSettings.site_name || "").trim(),
        currency: String(generalSettings.currency || "").trim(),
        vat_configuration: String(generalSettings.vat_configuration || "").trim(),
        email_settings: String(generalSettings.email_settings || "").trim(),
      };
      const saved = await adminApi.setGeneralSettings(payload);
      const normalized = {
        site_name: String(saved?.site_name || payload.site_name),
        currency: String(saved?.currency || payload.currency),
        vat_configuration: String(saved?.vat_configuration || payload.vat_configuration),
        email_settings: String(saved?.email_settings || payload.email_settings),
      };
      setGeneralSettings(normalized);
      setInitialGeneralSettings(normalized);
      setMessage("General settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save general settings.");
    } finally {
      setSavingGeneralSettings(false);
    }
  };

  const onToggleModule = async (moduleKey, checked) => {
    const previous = modulesState[moduleKey] !== false;
    setModulesState((prev) => ({ ...prev, [moduleKey]: checked }));
    setSavingKey(moduleKey);
    setMessage("");
    setError("");

    try {
      const result = await adminApi.setSystemModule(moduleKey, checked);
      const nextModules = result?.modules && typeof result.modules === "object" ? result.modules : null;
      if (nextModules) {
        setModulesState(nextModules);
        window.dispatchEvent(new CustomEvent(MODULES_UPDATED_EVENT, { detail: { modules: nextModules } }));
      }
      setMessage(`Módulo ${moduleKey} ${checked ? "ativo" : "inativo"}.`);
    } catch (saveError) {
      setModulesState((prev) => ({ ...prev, [moduleKey]: previous }));
      setError(saveError instanceof Error ? saveError.message : "Falha ao atualizar módulo.");
    } finally {
      setSavingKey("");
    }
  };

  const onSaveThemeSettings = async () => {
    try {
      setSavingThemeSettings(true);
      setError("");
      setMessage("");
      const payload = {
        public_primary_color: String(themeSettings.public_primary_color || "").trim(),
        public_layout: String(themeSettings.public_layout || "classic").trim(),
      };
      const saved = await adminApi.setThemeSettings(payload);
      const normalized = {
        public_primary_color: String(
          saved?.public_primary_color || saved?.primary_color || payload.public_primary_color || DEFAULT_PRIMARY_COLOR
        ),
        public_layout: String(saved?.public_layout || payload.public_layout || "classic"),
      };
      setThemeSettings(normalized);
      setInitialThemeSettings(normalized);
      window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: { settings: normalized } }));
      setMessage("Theme settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save theme settings.");
    } finally {
      setSavingThemeSettings(false);
    }
  };

  const onSaveAthleteSettings = async () => {
    try {
      setSavingAthleteSettings(true);
      setError("");
      setMessage("");
      const payload = {
        enabled: athleteSettings.enabled,
        product_count: athleteSettings.product_count,
        category_ids: athleteSettings.category_ids,
        category_limits: athleteSettings.category_limits,
        sort_by: athleteSettings.sort_by,
      };
      const saved = await adminApi.setAthleteSettings(payload);
      const normalized = {
        enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : true,
        product_count: Number.isInteger(saved?.product_count) ? saved.product_count : 10,
        category_ids: Array.isArray(saved?.category_ids) ? saved.category_ids : [],
        category_limits: saved?.category_limits && typeof saved.category_limits === 'object' ? saved.category_limits : {},
        sort_by: saved?.sort_by || 'sales',
      };
      setAthleteSettings(normalized);
      setInitialAthleteSettings(normalized);
      setMessage("Escolhas dos atletas configuradas.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save athlete settings.");
    } finally {
      setSavingAthleteSettings(false);
    }
  };

  const onSaveBrandSettings = async () => {
    try {
      setSavingBrandSettings(true);
      setError("");
      setMessage("");
      const payload = {
        enabled: brandSettings.enabled,
        brand_ids: brandSettings.brand_ids,
      };
      const saved = await adminApi.setBrandSettings(payload);
      const normalized = {
        enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : true,
        brand_ids: Array.isArray(saved?.brand_ids) ? saved.brand_ids : [],
      };
      setBrandSettings(normalized);
      setInitialBrandSettings(normalized);
      setMessage("Marcas configuradas.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save brand settings.");
    } finally {
      setSavingBrandSettings(false);
    }
  };

  const onSavePerformanceSettings = async () => {
    try {
      setSavingPerformanceSettings(true);
      setError("");
      setMessage("");
      const payload = {
        enabled: performanceSettings.enabled,
        product_count: performanceSettings.product_count,
        category_ids: performanceSettings.category_ids,
        category_limits: performanceSettings.category_limits,
        sort_by: performanceSettings.sort_by,
      };
      const saved = await adminApi.setPerformanceSettings(payload);
      const normalized = {
        enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : true,
        product_count: Number.isInteger(saved?.product_count) ? saved.product_count : 10,
        category_ids: Array.isArray(saved?.category_ids) ? saved.category_ids : [],
        category_limits: saved?.category_limits && typeof saved.category_limits === 'object' ? saved.category_limits : {},
        sort_by: saved?.sort_by || 'sales',
      };
      setPerformanceSettings(normalized);
      setInitialPerformanceSettings(normalized);
      setMessage("Performance comprovada configurada.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save performance settings.");
    } finally {
      setSavingPerformanceSettings(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Definições do sistema"
        description="Configure nome do site, IVA, email e ativação de módulos."
        actions={null /*
          <Button className="hidden"
            variant="outline"
            onClick={() => void onSaveGeneralSettings()}
            disabled={loadingGeneralSettings || savingGeneralSettings || !hasGeneralSettingsChanges}
          >
            <Sliders className="mr-2 h-4 w-4" />
            {savingGeneralSettings ? "A guardar..." : "Guardar definições"}
          </Button>
        */}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Definições gerais</CardTitle>
            <CardDescription>Configuração base da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do site</label>
              <Input
                value={generalSettings.site_name}
                onChange={(event) =>
                  setGeneralSettings((prev) => ({ ...prev, site_name: event.target.value }))
                }
                placeholder="Backoffice Admin"
                disabled={loadingGeneralSettings || savingGeneralSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Moeda</label>
              <Input
                value={generalSettings.currency}
                onChange={(event) =>
                  setGeneralSettings((prev) => ({ ...prev, currency: event.target.value }))
                }
                placeholder="EUR"
                disabled={loadingGeneralSettings || savingGeneralSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Configuração de IVA</label>
              <Input
                value={generalSettings.vat_configuration}
                onChange={(event) =>
                  setGeneralSettings((prev) => ({ ...prev, vat_configuration: event.target.value }))
                }
                placeholder="23% VAT"
                disabled={loadingGeneralSettings || savingGeneralSettings}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Definições de email</label>
              <Input
                value={generalSettings.email_settings}
                onChange={(event) =>
                  setGeneralSettings((prev) => ({ ...prev, email_settings: event.target.value }))
                }
                placeholder="notifications@ecom.pt"
                disabled={loadingGeneralSettings || savingGeneralSettings}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => void onSaveGeneralSettings()}
              disabled={loadingGeneralSettings || savingGeneralSettings || !hasGeneralSettingsChanges}
              className="hidden"
            >
              <Sliders className="mr-2 h-4 w-4" />
              {savingGeneralSettings ? "A guardar..." : "Guardar definiÃ§Ãµes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Tema</CardTitle>
            <CardDescription>Defina a cor principal usada no site pÃºblico.</CardDescription>
            {loadingThemeSettings ? <p className="text-sm text-muted-foreground">A carregar tema...</p> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cor principal</label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="color"
                  value={themeSettings.public_primary_color}
                  onChange={(event) =>
                    setThemeSettings((prev) => ({ ...prev, public_primary_color: event.target.value }))
                  }
                  disabled={loadingThemeSettings || savingThemeSettings}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={themeSettings.public_primary_color}
                  onChange={(event) =>
                    setThemeSettings((prev) => ({ ...prev, public_primary_color: event.target.value }))
                  }
                  placeholder={DEFAULT_PRIMARY_COLOR}
                  disabled={loadingThemeSettings || savingThemeSettings}
                  className="max-w-[220px] font-mono"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Preview:</span>
                  <span
                    className="inline-flex h-6 w-6 rounded-full ring-2 ring-ring"
                    style={{ backgroundColor: themeSettings.public_primary_color || DEFAULT_PRIMARY_COLOR }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Aceita hex (ex: #6C939B).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Layout (Home)</label>
              <select
                value={themeSettings.public_layout}
                onChange={(event) =>
                  setThemeSettings((prev) => ({ ...prev, public_layout: event.target.value }))
                }
                disabled={loadingThemeSettings || savingThemeSettings}
                className="flex h-10 w-full max-w-[320px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="classic">Classic</option>
                <option value="categories-first">Categories first</option>
                <option value="minimal">Minimal</option>
              </select>
              <p className="text-xs text-muted-foreground">Altera a ordem/seÃ§Ãµes da pÃ¡gina inicial.</p>
            </div>

            <Button
              variant="outline"
              onClick={() => void onSaveThemeSettings()}
              disabled={loadingThemeSettings || savingThemeSettings || !hasThemeSettingsChanges}
            >
              {savingThemeSettings ? "A guardar..." : "Guardar tema"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="font-display text-xl">Ativação de módulos</CardTitle>
          <CardDescription>Controle quais módulos ficam ativos.</CardDescription>
          {loadingModules ? <p className="text-sm text-muted-foreground">A carregar módulos...</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {visibleModules.map((module) => (
            <div
              key={module.key}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 p-3"
            >
              <p className="text-sm font-medium">{module.label}</p>
              <Switch
                checked={module.enabled}
                disabled={loadingModules || savingKey === module.key}
                onCheckedChange={(checked) => void onToggleModule(module.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="font-display text-xl">Escolhas dos atletas</CardTitle>
          <CardDescription>Configure os produtos exibidos na seção de escolhas dos atletas.</CardDescription>
          {loadingAthleteSettings || loadingCategories ? <p className="text-sm text-muted-foreground">A carregar configurações...</p> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ativar secção</label>
            <div className="flex items-center gap-3">
              <Switch
                checked={athleteSettings.enabled}
                disabled={loadingAthleteSettings || savingAthleteSettings}
                onCheckedChange={(checked) =>
                  setAthleteSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
              <span className="text-sm text-muted-foreground">
                {athleteSettings.enabled ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Número de produtos</label>
            <Input
              type="number"
              min="1"
              max="50"
              value={athleteSettings.product_count}
              onChange={(event) =>
                setAthleteSettings((prev) => ({
                  ...prev,
                  product_count: parseInt(event.target.value, 10) || 10,
                }))
              }
              disabled={loadingAthleteSettings || savingAthleteSettings}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">Quantos produtos mostrar (máx: 50)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ordenar por</label>
            <select
              value={athleteSettings.sort_by}
              onChange={(event) =>
                setAthleteSettings((prev) => ({ ...prev, sort_by: event.target.value }))
              }
              disabled={loadingAthleteSettings || savingAthleteSettings}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="sales">Mais vendidos</option>
              <option value="rating">Melhor avaliados</option>
              <option value="newest">Mais recentes</option>
            </select>
            <p className="text-xs text-muted-foreground">Critério de ordenação dos produtos</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categorias</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto border border-input rounded-md p-3 bg-background/50">
              {loadingCategories ? (
                <p className="text-sm text-muted-foreground">A carregar categorias...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria disponível</p>
              ) : (
                [...categories].reverse().map((category) => (
                  <div key={category.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={athleteSettings.category_ids.includes(category.id)}
                      onChange={(event) => {
                        setAthleteSettings((prev) => {
                          const categoryIds = [...prev.category_ids];
                          if (event.target.checked) {
                            if (!categoryIds.includes(category.id)) {
                              categoryIds.push(category.id);
                            }
                          } else {
                            const index = categoryIds.indexOf(category.id);
                            if (index > -1) {
                              categoryIds.splice(index, 1);
                            }
                          }
                          return { ...prev, category_ids: categoryIds };
                        });
                      }}
                      disabled={loadingAthleteSettings || savingAthleteSettings}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer flex-1">
                      {category.name_pt || category.name_es || 'Sem nome'}
                    </label>
                    {athleteSettings.category_ids.includes(category.id) && (
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={athleteSettings.category_limits[category.id] || 5}
                        onChange={(event) => {
                          setAthleteSettings((prev) => ({
                            ...prev,
                            category_limits: {
                              ...prev.category_limits,
                              [category.id]: parseInt(event.target.value, 10) || 5,
                            },
                          }));
                        }}
                        disabled={loadingAthleteSettings || savingAthleteSettings}
                        className="h-8 w-16 rounded border border-input bg-background px-2 py-1 text-sm text-right"
                        placeholder="5"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Deixe em branco para mostrar produtos de todas as categorias. Para categorias selecionadas, defina quantos produtos mostrar de cada uma.</p>
          </div>

          <Button
            variant="outline"
            onClick={() => void onSaveAthleteSettings()}
            disabled={loadingAthleteSettings || savingAthleteSettings || !hasAthleteSettingsChanges}
          >
            {savingAthleteSettings ? "A guardar..." : "Guardar configuração"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="font-display text-xl">Marcas</CardTitle>
          <CardDescription>Configure quais marcas mostrar na seção de marcas.</CardDescription>
          {loadingBrandSettings ? <p className="text-sm text-muted-foreground">A carregar marcas...</p> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ativar secção</label>
            <div className="flex items-center gap-3">
              <Switch
                checked={brandSettings.enabled}
                disabled={loadingBrandSettings || savingBrandSettings}
                onCheckedChange={(checked) =>
                  setBrandSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
              <span className="text-sm text-muted-foreground">
                {brandSettings.enabled ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Marcas a exibir</label>
            <div className="space-y-2 max-h-[250px] overflow-y-auto border border-input rounded-md p-3 bg-background/50">
              {loadingBrandSettings ? (
                <p className="text-sm text-muted-foreground">A carregar marcas...</p>
              ) : availableBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma marca disponível</p>
              ) : (
                availableBrands.map((brand) => (
                  <div key={brand.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`brand-${brand.id}`}
                      checked={brandSettings.brand_ids.includes(brand.id)}
                      onChange={(event) => {
                        setBrandSettings((prev) => {
                          const brandIds = [...prev.brand_ids];
                          if (event.target.checked) {
                            if (!brandIds.includes(brand.id)) {
                              brandIds.push(brand.id);
                            }
                          } else {
                            const index = brandIds.indexOf(brand.id);
                            if (index > -1) {
                              brandIds.splice(index, 1);
                            }
                          }
                          return { ...prev, brand_ids: brandIds };
                        });
                      }}
                      disabled={loadingBrandSettings || savingBrandSettings}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor={`brand-${brand.id}`} className="text-sm cursor-pointer">
                      {brand.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Selecione as marcas que deseja mostrar no website</p>
          </div>

          <Button
            variant="outline"
            onClick={() => void onSaveBrandSettings()}
            disabled={loadingBrandSettings || savingBrandSettings || !hasBrandSettingsChanges}
          >
            {savingBrandSettings ? "A guardar..." : "Guardar marcas"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Performance Comprovada</span>
            {loadingPerformanceSettings && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>
            Configure os produtos exibidos na seção "Performance Comprovada".
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Enable */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ativar seção</label>
            <input
              type="checkbox"
              checked={performanceSettings.enabled}
              onChange={(event) =>
                setPerformanceSettings((prev) => ({
                  ...prev,
                  enabled: event.target.checked,
                }))
              }
              disabled={loadingPerformanceSettings || savingPerformanceSettings}
              className="h-4 w-4 rounded border-input"
            />
          </div>

          {/* Product Count */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Número de produtos</label>
            <input
              type="number"
              min="1"
              max="50"
              value={performanceSettings.product_count}
              onChange={(event) =>
                setPerformanceSettings((prev) => ({
                  ...prev,
                  product_count: Math.max(
                    1,
                    Math.min(50, Number(event.target.value) || 10)
                  ),
                }))
              }
              disabled={loadingPerformanceSettings || savingPerformanceSettings}
              className="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Máximo de 50 produtos
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Categorias</label>

            {loadingCategories ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar categorias...
              </div>
            ) : categories.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Sem categorias disponíveis
              </div>
            ) : (
              <div className="space-y-2">
              {categories.map((cat) => {
  const id = String(cat.id);
  const isSelected = performanceSettings.category_ids.includes(id);

  return (
    <div key={cat.id} className="space-y-1">

      {/* Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`perf-cat-${cat.id}`}
          checked={isSelected}
          onChange={(event) => {
            setPerformanceSettings((prev) => {
              const catIds = [...prev.category_ids];

              if (event.target.checked) {
                if (!catIds.includes(id)) catIds.push(id);
              } else {
                const index = catIds.indexOf(id);
                if (index > -1) catIds.splice(index, 1);
              }

              return { ...prev, category_ids: catIds };
            });
          }}
          disabled={loadingPerformanceSettings || savingPerformanceSettings}
          className="h-4 w-4"
        />

        <label
          htmlFor={`perf-cat-${cat.id}`}
          className="text-sm cursor-pointer flex-1"
        >
          {cat.name_pt || cat.name_es || "Sem nome"}
        </label>
      </div>

      {/* 🔥 LIMIT INPUT */}
      {isSelected && (
        <div className="ml-6 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Máx. produtos:
          </span>

          <input
            type="number"
            min="1"
            max="50"
            value={performanceSettings.category_limits[id] || 5}
            onChange={(event) => {
              const value = Math.max(
                1,
                Math.min(50, Number(event.target.value) || 5)
              );

              setPerformanceSettings((prev) => ({
                ...prev,
                category_limits: {
                  ...prev.category_limits,
                  [id]: value,
                },
              }));
            }}
            disabled={loadingPerformanceSettings || savingPerformanceSettings}
            className="w-16 h-8 rounded border border-input px-2 text-sm"
          />
        </div>
      )}
    </div>
  );
})}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Selecione categorias para mostrar produtos aleatórios dessas categorias.
            </p>
          </div>

          {/* Save Button */}
          <Button
            variant="outline"
            onClick={() => void onSavePerformanceSettings()}
            disabled={
              loadingPerformanceSettings ||
              savingPerformanceSettings ||
              !hasPerformanceSettingsChanges
            }
          >
            {savingPerformanceSettings ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </span>
            ) : (
              "Guardar performance"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
