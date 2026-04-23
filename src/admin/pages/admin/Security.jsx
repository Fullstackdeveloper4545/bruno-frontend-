import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/adminApi";
import { useAdminAuth, ADMIN_EMAIL } from "@/contexts/AdminAuthContext";

function formatLoginDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildQrUrl(value) {
  if (!value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(value)}`;
}

export default function Security() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const [loginActivity, setLoginActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [adminEmail, setAdminEmail] = useState(ADMIN_EMAIL);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sessionTime, setSessionTime] = useState("30 minutos");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSuccess, setTwoFactorSuccess] = useState("");
  const [settingUpTwoFactor, setSettingUpTwoFactor] = useState(false);
  const [disablingTwoFactor, setDisablingTwoFactor] = useState(false);

  const qrUrl = useMemo(() => buildQrUrl(twoFactorOtpAuthUrl), [twoFactorOtpAuthUrl]);

  const loadLoginActivity = async () => {
    try {
      setLoadingActivity(true);
      setActivityError("");
      const result = await adminApi.listLoginActivity();
      const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      setLoginActivity(rows);
    } catch (e) {
      setActivityError(e instanceof Error ? e.message : "Falha ao carregar atividades de login");
      setLoginActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadTwoFactorStatus = async () => {
    try {
      setTwoFactorLoading(true);
      setTwoFactorError("");
      const result = await adminApi.getAdminTwoFactorStatus();
      setTwoFactorEnabled(Boolean(result?.enabled));
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Falha ao carregar estado de 2FA");
      setTwoFactorEnabled(false);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  useEffect(() => {
    void loadLoginActivity();
    void loadTwoFactorStatus();

    if (typeof window !== "undefined") {
      const storedEmail = window.localStorage.getItem("admin:email") || window.sessionStorage.getItem("admin:email");
      if (storedEmail && storedEmail.includes("@")) {
        setAdminEmail(storedEmail);
      } else {
        setAdminEmail(ADMIN_EMAIL);
      }
    }
  }, []);

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordError("Preencha a palavra-passe atual e a nova palavra-passe.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordError("A nova palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setSavingPassword(true);
      await adminApi.changeAdminPassword({
        email: adminEmail.trim(),
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess("Palavra-passe atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao atualizar a palavra-passe";
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleTwoFactor = async (checked) => {
    setTwoFactorError("");
    setTwoFactorSuccess("");

    if (checked) {
      if (!currentPassword.trim()) {
        setTwoFactorError("Introduza a palavra-passe atual para iniciar o 2FA.");
        return;
      }
      try {
        setSettingUpTwoFactor(true);
        const result = await adminApi.setupAdminTwoFactor({
          current_password: currentPassword,
        });
        setTwoFactorSecret(String(result?.secret || ""));
        setTwoFactorOtpAuthUrl(String(result?.otpauth_url || ""));
        setTwoFactorSuccess("Abra o Google Authenticator, adicione a chave e confirme com o codigo de 6 digitos.");
      } catch (e) {
        setTwoFactorError(e instanceof Error ? e.message : "Falha ao iniciar a configuracao do 2FA.");
      } finally {
        setSettingUpTwoFactor(false);
      }
      return;
    }

    if (!currentPassword.trim()) {
      setTwoFactorError("Introduza a palavra-passe atual para desativar o 2FA.");
      return;
    }
    if (twoFactorCode.trim().length !== 6) {
      setTwoFactorError("Introduza o codigo atual de 6 digitos para desativar o 2FA.");
      return;
    }

    try {
      setDisablingTwoFactor(true);
      await adminApi.disableAdminTwoFactor({
        current_password: currentPassword,
        totp_code: twoFactorCode.trim(),
      });
      setTwoFactorEnabled(false);
      setTwoFactorSecret("");
      setTwoFactorOtpAuthUrl("");
      setTwoFactorCode("");
      setTwoFactorSuccess("Two-factor authentication disabled.");
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Falha ao desativar o 2FA.");
    } finally {
      setDisablingTwoFactor(false);
    }
  };

  const handleConfirmTwoFactor = async () => {
    if (twoFactorCode.trim().length !== 6) {
      setTwoFactorError("Introduza o codigo de 6 digitos do Google Authenticator.");
      return;
    }

    try {
      setSettingUpTwoFactor(true);
      await adminApi.enableAdminTwoFactor({ totp_code: twoFactorCode.trim() });
      setTwoFactorEnabled(true);
      setTwoFactorSecret("");
      setTwoFactorOtpAuthUrl("");
      setTwoFactorCode("");
      setTwoFactorSuccess("Two-factor authentication enabled.");
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Falha ao confirmar o 2FA.");
    } finally {
      setSettingUpTwoFactor(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Seguranca do Admin"
        description="Gira autenticacao, sessoes e controlos de acesso."
        actions={
          <Button
            className="!h-10 !w-28 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90"
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
          >
            Logout
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Alterar palavra-passe</CardTitle>
            <CardDescription>Atualize as credenciais do admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Login do Admin</p>
              <p className="text-sm font-medium">{adminEmail}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palavra-passe atual</label>
              <Input
                type="password"
                placeholder="********"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova palavra-passe</label>
              <Input
                type="password"
                placeholder="********"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tempo de sessao</label>
              <Input placeholder="30 minutos" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} />
            </div>
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            {passwordSuccess ? <p className="text-sm text-emerald-600">{passwordSuccess}</p> : null}
            <Button
              className="!h-10 !w-56 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90"
              disabled={savingPassword}
              onClick={() => void handleChangePassword()}
            >
              {savingPassword ? "A guardar..." : "Guardar palavra-passe"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle className="font-display text-xl">Security improvements</CardTitle>
            <CardDescription>Optional protections ready for admin login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 p-3">
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Google Authenticator compatible TOTP</p>
              </div>
              <Switch
                checked={twoFactorEnabled || Boolean(twoFactorOtpAuthUrl)}
                disabled={twoFactorLoading || settingUpTwoFactor || disablingTwoFactor}
                onCheckedChange={(checked) => void handleToggleTwoFactor(Boolean(checked))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 p-3">
              <div>
                <p className="text-sm font-medium">Profile system (future)</p>
                <p className="text-xs text-muted-foreground">Prepare multi-admin access</p>
              </div>
              <Switch disabled />
            </div>

            {twoFactorError ? <p className="text-sm text-destructive">{twoFactorError}</p> : null}
            {twoFactorSuccess ? <p className="text-sm text-emerald-600">{twoFactorSuccess}</p> : null}

            {twoFactorOtpAuthUrl ? (
              <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium">Scan with Google Authenticator</p>
                {qrUrl ? <img src={qrUrl} alt="2FA QR code" className="h-44 w-44 rounded-md border border-border/60 bg-white p-2" /> : null}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>If the QR does not load, add the key manually in Google Authenticator:</p>
                  <p className="break-all font-mono text-[11px] text-foreground">{twoFactorSecret}</p>
                </div>
                <Input
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                />
                <Button
                  className="!h-10 !w-full !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90"
                  disabled={settingUpTwoFactor}
                  onClick={() => void handleConfirmTwoFactor()}
                >
                  {settingUpTwoFactor ? "Confirming..." : "Confirm Google Authenticator"}
                </Button>
              </div>
            ) : null}

            {twoFactorEnabled && !twoFactorOtpAuthUrl ? (
              <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-medium">2FA is enabled</p>
                <p className="text-xs text-muted-foreground">
                  To disable it, enter the current 6-digit code from Google Authenticator and switch it off.
                </p>
                <Input
                  placeholder="Current 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
            ) : null}

            <Button className="!h-10 !w-full !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90">
              Review policies
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="font-display text-xl">Registo de atividade de login</CardTitle>
          <CardDescription>Entradas recentes do admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Localizacao</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingActivity ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    A carregar atividade de login...
                  </TableCell>
                </TableRow>
              ) : activityError ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-destructive">
                    {activityError}
                  </TableCell>
                </TableRow>
              ) : loginActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Nenhuma atividade de login encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                loginActivity.map((entry, index) => {
                  const displayDate = formatLoginDate(entry.date || entry.created_at || entry.logged_at || entry.timestamp);
                  const location = entry.location || entry.city || entry.store_name || entry.store || "-";
                  const statusValue = (entry.status || entry.result || entry.outcome || "Desconhecido").toString();

                  return (
                    <TableRow key={entry.id ?? index}>
                      <TableCell>{displayDate}</TableCell>
                      <TableCell>{location}</TableCell>
                      <TableCell>
                        <StatusBadge status={statusValue} label={entry.status_label || statusValue} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
