import { STARTUP_CATEGORIES } from "@/lib/startup-categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StartupCategorySelect({ value, onChange, id, disabled }: {
  value: string; onChange: (value: string) => void; id?: string; disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label="Startup category" className="h-11 bg-card text-card-foreground shadow-none">
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        {STARTUP_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}