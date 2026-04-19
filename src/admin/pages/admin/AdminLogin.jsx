import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAdminAuth, ADMIN_EMAIL } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/adminApi";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
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

    const result = await login(email.trim(), password.trim(), twoFactorCode.trim());
    if (result?.success) {
      setError("");
      setRequiresTwoFactor(false);
      setTwoFactorCode("");
      void adminApi.createLoginActivity({
        admin_email: email.trim().toLowerCase(),
        status: "success",
        location: guessLocation(),
      });
      navigate("/admin", { replace: true });
      return;
    }

    if (result?.requiresTwoFactor) {
      setRequiresTwoFactor(true);
      setError("Enter the 6-digit code from Google Authenticator.");
      return;
    }

    setRequiresTwoFactor(false);
    setTwoFactorCode("");
    setError(result?.message || "Invalid admin credentials. Redirecting to the store.");
    void adminApi.createLoginActivity({
      admin_email: email.trim().toLowerCase(),
      status: "failed",
      location: guessLocation(),
    });
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.25),_transparent_60%)] px-4">
      <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Admin Login</CardTitle>
          <CardDescription>Use the admin credentials to access the backoffice.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin email</label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin123ecom@gmail.com"
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {requiresTwoFactor ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Google Authenticator code</label>
                <Input
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="w-full" type="submit">
              {requiresTwoFactor ? "Verify 2FA" : "Login"}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              type="button"
              onClick={() => navigate("/", { replace: true })}
            >
              Continue as user
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
