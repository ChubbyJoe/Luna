import { toast } from "sonner";

// The only way feature code shows a toast (spec 0003). Toasts are for errors
// from background work and undoable actions, never for visible success.
export const notify = {
  error: (message: string) => toast.error(message, { duration: 8000 }),
  info: (message: string) => toast(message),
  undoable: (message: string, onUndo: () => void) =>
    toast(message, {
      duration: Infinity,
      action: { label: "Undo", onClick: onUndo },
    }),
};
