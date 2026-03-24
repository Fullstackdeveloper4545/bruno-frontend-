import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { adminApi } from "@/lib/adminApi";
import { toApiUrl } from "@/lib/api";
import { PRESERVE_SESSION_KEY } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
const INTEGRATION_STATUS_EVENT = "admin:integration-settings-updated";
const notifyIntegrationStatusUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INTEGRATION_STATUS_EVENT));
  }
};
const isShopifySettings = (settings) => {
  const baseUrl = String(settings?.base_url || "").toLowerCase();
  const name = String(settings?.integration_name || "").toLowerCase();
  return baseUrl.includes("myshopify.com") || baseUrl.includes("shopify") || name.includes("shopify");
};
const resolveShopifyShop = (baseUrl) => {
  const raw = String(baseUrl || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/\/+$/, "");
  } catch (_) {
    return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }
};
const Integrations = () => {
  const [settings, setSettings] = useState({
    base_url: "",
    api_key: "",
    integration_name: "",
    webhook_secret: "",
    is_active: false,
    sync_invoices: true,
    has_api_key: false,
    has_webhook_secret: false
  });
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const formatError = (error) => {
    if (!error) return "Erro desconhecido";
    if (typeof error === "string") return error;
    if (error?.message) return String(error.message);
    return String(error);
  };
  const load = async () => {
    const [s, l] = await Promise.all([
      adminApi.getIntegrationSettings(),
      adminApi.getSyncLogs()
    ]);
    setSettings((prev) => ({ ...prev, ...s }));
    setLogs(l);
    notifyIntegrationStatusUpdated();
  };
  useEffect(() => {
    void load();
  }, []);
  const handleSave = async () => {
    try {
      setMessage("");
      await adminApi.updateIntegrationSettings(settings);
      setMessage("Settings saved");
      notifyIntegrationStatusUpdated();
      await load();
    } catch (error) {
      setMessage(formatError(error));
      await load();
    }
  };
  const handleManualSync = async () => {
    try {
      setMessage("");
      await adminApi.manualSync();
      await load();
      setMessage("Manual sync completed");
    } catch (error) {
      setMessage(formatError(error));
      await load();
    }
  };
  const handleConnectShopify = () => {
    const shop = resolveShopifyShop(settings.base_url);
    if (!shop) {
      setMessage("Please enter your Shopify shop URL first (example: https://your-store.myshopify.com).");
      return;
    }
    const returnTo = `${window.location.origin}/admin/integrations`;
    const startPath = `/api/integration/shopify/oauth/start?shop=${encodeURIComponent(shop)}&return_to=${encodeURIComponent(returnTo)}`;
    try {
      window.sessionStorage.setItem(PRESERVE_SESSION_KEY, "1");
    } catch (_) {
      // ignore if storage is unavailable
    }
    window.location.href = toApiUrl(startPath);
  };
  return <div className='space-y-6'>
      <PageHeader title='Definições de integração' description='Defina as suas integrações, sincronize manualmente e trabalhe a segurança dos webhooks.' />
      {message ? <p className='text-sm'>{message}</p> : null}

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Integração de stock</CardTitle></CardHeader>
        <CardContent className='grid gap-6 md:grid-cols-2'>
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='URL base da API' value={settings.base_url || ""} onChange={(e) => setSettings((p) => ({ ...p, base_url: e.target.value }))} />
          <Input
    className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0'
    placeholder='Nome da integração (ex.: WordPress)'
    value={settings.integration_name || ""}
    onChange={(e) => setSettings((p) => ({ ...p, integration_name: e.target.value }))}
  />
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Shopify Admin API access token (recommended)' type='password' value={settings.api_key || ""} onChange={(e) => setSettings((p) => ({ ...p, api_key: e.target.value }))} />
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Segredo do webhook' value={settings.webhook_secret || ""} onChange={(e) => setSettings((p) => ({ ...p, webhook_secret: e.target.value }))} />
          {settings.has_api_key && !settings.api_key ? <p className='text-xs text-muted-foreground md:col-span-2'>Chave guardada (oculta). Cole uma nova para substituir.</p> : null}
          {isShopifySettings(settings) ? <p className='text-xs text-muted-foreground md:col-span-2'>For Shopify, paste the Admin API access token from your Shopify app (must include <span className='font-medium'>read_products</span>). Do not paste the API key/secret. Legacy format supported: <span className='font-mono'>api_key:password</span>.</p> : null}
          <div className='flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm'><span>Integração ativa</span><Switch checked={settings.is_active} onCheckedChange={(checked) => setSettings((p) => ({ ...p, is_active: checked }))} /></div>
          <div className='flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm'><span>Sincronizar faturas</span><Switch checked={Boolean(settings.sync_invoices)} onCheckedChange={(checked) => setSettings((p) => ({ ...p, sync_invoices: checked }))} /></div>
          <div className='flex flex-wrap gap-3 md:col-span-2'>
            {isShopifySettings(settings) ? <Button
              className='!h-10 !w-44 !justify-center !rounded-md !bg-emerald-600 !text-white hover:!bg-emerald-700'
              onClick={() => handleConnectShopify()}
            >
              Connect Shopify
            </Button> : null}
            <Button
              className='!h-10 !w-28 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90'
              onClick={() => void handleSave()}
            >
              Guardar
            </Button>
            <Button
              className='!h-10 !w-44 !justify-center !rounded-md !bg-zinc-400 !text-white hover:!bg-zinc-500'
              onClick={() => void handleManualSync()}
            >
              Sincronização manual
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Registos de sincronização</CardTitle></CardHeader>
        <CardContent className='space-y-2'>
          {logs.map((log) => <p key={log.id} className='text-sm'>{log.created_at} | {log.mode} | {log.status}{log.details?.message ? ` | ${log.details.message}` : ""}</p>)}
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Integrations;
export {
  stdin_default as default
};

