import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
const ConfirmDeleteButton = ({
  onConfirm,
  entityName = "este item",
  title,
  description,
  triggerLabel = "Eliminar",
  confirmLabel = "Eliminar",
  size = "sm",
  disabled = false
}) => <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size={size} disabled={disabled}>
        {triggerLabel}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title || `Eliminar ${entityName}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {description || `Esta ação não pode ser anulada. ${entityName} será eliminado permanentemente.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
  onClick={() => void onConfirm()}
>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
export {
  ConfirmDeleteButton
};
