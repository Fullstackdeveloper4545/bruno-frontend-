import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { adminApi } from "@/lib/adminApi";
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

const hasConnectionDetails = (settings) =>
  Boolean(String(settings?.base_url || "").trim()) &&
  Boolean(String(settings?.api_key || "").trim() || settings?.has_api_key);

const normalizeShopifyShop = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withoutProtocol = raw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/\/+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(withoutProtocol)) {
    return "";
  }

  return withoutProtocol.toLowerCase();
};

export default function Integrations() {
  const [settings, setSettings] = useState({
    base_url: "",
    api_key: "",
    integration_name: "",
    webhook_secret: "",
    is_active: false,
    sync_invoices: true,
    has_api_key: false,
    has_webhook_secret: false,
  });
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [isConnectingShopify, setIsConnectingShopify] = useState(false);

  const formatError = (error) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error?.message) return String(error.message);
    return String(error);
  };

  const load = async () => {
    const [nextSettings, nextLogs] = await Promise.all([
      adminApi.getIntegrationSettings(),
      adminApi.getSyncLogs(),
    ]);
    setSettings((prev) => ({ ...prev, ...nextSettings }));
    setLogs(Array.isArray(nextLogs) ? nextLogs : []);
    notifyIntegrationStatusUpdated();
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    try {
      setMessage("");
      if (isShopifySettings(settings) && String(settings.api_key || "").includes(":")) {
        setMessage("For Shopify, use Connect Shopify or paste the Admin API access token only. Do not use Client ID and Client Secret.");
        return;
      }

      if (settings.is_active && !hasConnectionDetails(settings)) {
        setMessage("Add the integration URL and access token before activating sync.");
        return;
      }

      await adminApi.updateIntegrationSettings(settings);

      if (settings.is_active) {
        await adminApi.manualSync();
        setMessage(
          "Settings saved and sync completed. The storefront now reads the synced catalog from Bruno REST APIs."
        );
      } else {
        setMessage("Settings saved.");
      }

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
      setMessage("Manual sync completed.");
    } catch (error) {
      setMessage(formatError(error));
      await load();
    }
  };

  const handleConnectShopify = async () => {
    const shop = normalizeShopifyShop(settings.base_url);
    if (!shop) {
      setMessage("Enter a valid Shopify shop URL such as https://your-store.myshopify.com before connecting.");
      return;
    }

    try {
      setIsConnectingShopify(true);
      setMessage("");
      const info = await adminApi.getShopifyOAuthInfo(shop);
      if (!info?.shopify_client_id_configured) {
        setMessage("Shopify OAuth is not configured on the backend. Add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET first.");
        return;
      }

      const returnTo = window.location.href;
      const redirectUrl = `/api/integration/shopify/oauth/start?shop=${encodeURIComponent(shop)}&return_to=${encodeURIComponent(returnTo)}`;
      window.location.assign(redirectUrl);
    } catch (error) {
      setMessage(formatError(error));
    } finally {
      setIsConnectingShopify(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const url = new URL(window.location.href);
    if (url.searchParams.get("shopify") === "connected") {
      setMessage("Shopify connected. The store token was saved through OAuth.");
      url.searchParams.delete("shopify");
      window.history.replaceState({}, "", url.toString());
      void load();
    }

    return undefined;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Settings"
        description="Configure external integrations, sync manually, and keep storefront catalog data flowing through Bruno APIs."
      />

      {message ? <p className="text-sm">{message}</p> : null}

      <Card className="rounded-[28px] bg-zinc-100">
        <CardHeader>
          <CardTitle>Catalog Integration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Input
            className="h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0"
            placeholder="API / shop URL (example: https://your-store.myshopify.com)"
            value={settings.base_url || ""}
            onChange={(event) => setSettings((prev) => ({ ...prev, base_url: event.target.value }))}
          />

          <Input
            className="h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0"
            placeholder="Integration name (example: Shopify)"
            value={settings.integration_name || ""}
            onChange={(event) => setSettings((prev) => ({ ...prev, integration_name: event.target.value }))}
          />

          <Input
            className="h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0"
            placeholder="Access token / API key"
            type="password"
            value={settings.api_key || ""}
            onChange={(event) => setSettings((prev) => ({ ...prev, api_key: event.target.value }))}
          />

          <Input
            className="h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0"
            placeholder="Webhook secret"
            value={settings.webhook_secret || ""}
            onChange={(event) => setSettings((prev) => ({ ...prev, webhook_secret: event.target.value }))}
          />

          {settings.has_api_key && !settings.api_key ? (
            <p className="text-xs text-muted-foreground md:col-span-2">
              A token is already saved and hidden. Paste a new one only if you want to replace it.
            </p>
          ) : null}

          {isShopifySettings(settings) ? (
            <p className="text-xs text-muted-foreground md:col-span-2">
              For Shopify, use the Connect Shopify button to authorize Bruno and save the store Admin API token automatically. If you paste a value manually, it must be the Admin API access token only. Required scope:
              {" "}
              <span className="font-medium">read_products</span>.
              {" "}
              When Integration is ON and you save, Bruno syncs Shopify products into its own database and the storefront serves them through REST APIs like
              {" "}
              <span className="font-mono">/api/products</span>.
            </p>
          ) : null}

          <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm">
            <span>Integration active</span>
            <Switch
              checked={Boolean(settings.is_active)}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm">
            <span>Sync invoices</span>
            <Switch
              checked={Boolean(settings.sync_invoices)}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, sync_invoices: checked }))}
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            {isShopifySettings(settings) ? (
              <Button
                className="!h-10 !w-44 !justify-center !rounded-md !bg-emerald-700 !text-white hover:!bg-emerald-800"
                onClick={() => void handleConnectShopify()}
                disabled={isConnectingShopify}
              >
                {isConnectingShopify ? "Connecting..." : "Connect Shopify"}
              </Button>
            ) : null}

            <Button
              className="!h-10 !w-28 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90"
              onClick={() => void handleSave()}
            >
              Save
            </Button>

            <Button
              className="!h-10 !w-44 !justify-center !rounded-md !bg-zinc-500 !text-white hover:!bg-zinc-600"
              onClick={() => void handleManualSync()}
            >
              Manual Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] bg-zinc-100">
        <CardHeader>
          <CardTitle>Sync Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <p key={log.id} className="text-sm">
              {log.created_at} | {log.mode} | {log.status}
              {log.details?.message ? ` | ${log.details.message}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
