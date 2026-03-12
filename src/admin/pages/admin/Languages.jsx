import { useEffect, useState } from "react";
import { PageHeader } from "@/admin/components/admin/PageHeader";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
const Languages = () => {
  const [selected, setSelected] = useState(["pt", "es"]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void adminApi.getLanguages().then((data) => setSelected(data.languages || ["pt", "es"]));
  }, []);
  const toggle = (lang) => {
    setSelected((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);
  };
  return <div className='space-y-6'>
      <PageHeader title='Gestão de idiomas' description='Ativar PT/ES para loja e backoffice.' />
      {message ? <p className='text-sm'>{message}</p> : null}
      <Card className='rounded-[28px] bg-zinc-100'>
        <CardHeader><CardTitle>Idiomas ativos</CardTitle></CardHeader>
        <CardContent className='space-y-3'>
          {["pt", "es"].map((lang) => <label key={lang} className='flex items-center gap-2 text-sm'>
              <Checkbox checked={selected.includes(lang)} onCheckedChange={() => toggle(lang)} />
              {lang.toUpperCase()}
            </label>)}
          <Button className='!h-10 !w-28 !justify-center !rounded-md !bg-black !text-white hover:!bg-black/90' onClick={() => void adminApi.setLanguages(selected).then(() => setMessage("Configuração de idiomas guardada"))}>Guardar</Button>
        </CardContent>
      </Card>
    </div>;
};
var stdin_default = Languages;
export {
  stdin_default as default
};
