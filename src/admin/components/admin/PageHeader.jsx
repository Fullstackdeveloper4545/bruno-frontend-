import { cn } from "@/lib/utils";
const PageHeader = ({ title, description, actions, className }) => <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Backoffice</p>
      <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
      {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>;
export {
  PageHeader
};
