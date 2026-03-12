import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/adminApi";
const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const guessLocation = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz.includes("/")) {
        const [, city] = tz.split("/");
        return city?.replace(/_/g, " ");
      }
      return tz || null;
    } catch {
      return null;
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = login(email.trim(), password.trim());
    if (success) {
      setError("");
      // Fire-and-forget audit log; ignore errors so login flow is not blocked.
      void adminApi.createLoginActivity({
        admin_email: email.trim().toLowerCase(),
        status: "success",
        location: guessLocation()
      });
      navigate("/admin", { replace: true });
      return;
    }
    setError("Credenciais de administrador inválidas. A redirecionar para a loja.");
    void adminApi.createLoginActivity({
      admin_email: email.trim().toLowerCase(),
      status: "failed",
      location: guessLocation()
    });
    navigate("/", { replace: true });
  };
  return <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_60%)] px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Login de Administrador</CardTitle>
          <CardDescription>Introduza as credenciais de admin para aceder ao painel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email do administrador</label>
              <Input
    value={email}
    onChange={(event) => setEmail(event.target.value)}
    placeholder="username@gmail.com"
    type="email"
    required
  />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palavra-passe</label>
              <div className="relative">
                <Input
    value={password}
    onChange={(event) => setPassword(event.target.value)}
    placeholder="********"
    type={showPassword ? "text" : "password"}
    className="pr-10"
    required
  />
                <button
    type="button"
    onClick={() => setShowPassword((prev) => !prev)}
    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
    aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
  >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit">
              Entrar
            </Button>
            <Button
    className="w-full"
    variant="outline"
    type="button"
    onClick={() => navigate("/", { replace: true })}
  >
              Continuar como utilizador
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = AdminLogin;
export {
  stdin_default as default
};
