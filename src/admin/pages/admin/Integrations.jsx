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
const Integrations = () => {
  const [settings, setSettings] = useState({
    base_url: "",
    integration_name: "",
    webhook_secret: "",
    is_active: false
  });
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
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
          <Input className='h-12 rounded-xl border-slate-400/60 focus:border-slate-500 focus:ring-0' placeholder='Segredo do webhook' value={settings.webhook_secret || ""} onChange={(e) => setSettings((p) => ({ ...p, webhook_secret: e.target.value }))} />
          <div className='flex h-12 items-center gap-3 rounded-xl border border-slate-400/60 bg-white px-4 text-sm'><span>Integração ativa</span><Switch checked={settings.is_active} onCheckedChange={(checked) => setSettings((p) => ({ ...p, is_active: checked }))} /></div>
          <div className='flex flex-wrap gap-3 md:col-span-2'>
            <Button
              className='!h-10 !w-28 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90'
              onClick={() => void adminApi.updateIntegrationSettings(settings).then(() => setMessage("Definições guardadas")).then(() => notifyIntegrationStatusUpdated())}
            >
              Guardar
            </Button>
            <Button
              className='!h-10 !w-44 !justify-center !rounded-md !bg-zinc-400 !text-white hover:!bg-zinc-500'
              onClick={() => void adminApi.manualSync().then(() => load()).then(() => setMessage("Sincronização manual concluída"))}
            >
              Sincronização manual
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Registos de sincronização</CardTitle></CardHeader>
        <CardContent className='space-y-2'>
          {logs.map((log) => <p key={log.id} className='text-sm'>{log.created_at} | {log.mode} | {log.status}</p>)}
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Integrations;
export {
  stdin_default as default
};
