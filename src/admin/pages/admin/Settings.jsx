import { useEffect, useMemo, useState } from "react";
import { Sliders } from "lucide-react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/adminApi";

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

    void loadGeneralSettings();
    void loadModules();
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Definições do sistema"
        description="Configure nome do site, IVA, email e ativação de módulos."
        actions={
          <Button
            variant="outline"
            onClick={() => void onSaveGeneralSettings()}
            disabled={loadingGeneralSettings || savingGeneralSettings || !hasGeneralSettingsChanges}
          >
            <Sliders className="mr-2 h-4 w-4" />
            {savingGeneralSettings ? "A guardar..." : "Guardar definições"}
          </Button>
        }
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
    </div>
  );
};

export default Settings;
