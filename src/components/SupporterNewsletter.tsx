import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getSupporterNewsletter, claimSupporterNewsletter } from "@/lib/supporter-newsletter.functions";
import { useNewsletterAvailability } from "@/components/apply/PlanPicker";
import { isNewsletterDateAvailable, newsletterDateLabel } from "@/lib/newsletter-slots";

export function SupporterNewsletter({ startupId, approved }: { startupId: string; approved: boolean }) {
  const getCredit = useServerFn(getSupporterNewsletter);
  const claim = useServerFn(claimSupporterNewsletter);
  const client = useQueryClient();
  const credit = useQuery({ queryKey: ["supporter-newsletter", startupId], queryFn: () => getCredit({ data: { startupId } }), refetchInterval: 30_000 });
  const availability = useNewsletterAvailability();
  const [selection, setSelection] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ready = availability.isSuccess && !availability.isError;
  async function book() {
    if (!selection || busy) return;
    setBusy(true);
    try {
      await claim({ data: { startupId, sendDate: selection } });
      await Promise.all([client.invalidateQueries({ queryKey: ["supporter-newsletter", startupId] }), client.invalidateQueries({ queryKey: ["newsletter-booked-dates"] })]);
      toast.success("Your complimentary newsletter spot is booked.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Please try again."); void availability.refetch(); }
    finally { setBusy(false); }
  }
  return <section aria-label="Supporter newsletter benefit" className="border-y border-border py-5">
    <div className="flex items-start gap-3">
      <Mail className="mt-1 h-5 w-5 shrink-0 text-foreground" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-foreground">Your complimentary Sunday newsletter</h2>
        <p role="status" className="mt-1 text-sm text-muted-foreground">
          {credit.isError ? "Could not load your spot. Please try again." : credit.isPending ? "Checking your Supporter benefit…" : credit.data?.claimed ? `Booked · ${newsletterDateLabel(credit.data.sendDate ?? undefined)}` : credit.data ? approved ? "One sponsor spot, included with your paid membership. Choose an available Sunday." : "Your spot is unlocked. You can book after your startup is approved." : "One sponsor spot unlocks after your first $999 annual payment clears. Nothing is reserved during your free trial."}
        </p>
        {credit.isError && <Button variant="outline" size="sm" className="mt-3" onClick={() => void credit.refetch()}>Try again</Button>}
        {credit.data && !credit.data.claimed && approved && <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Popover><PopoverTrigger asChild><Button variant="outline" disabled={!ready || busy} onClick={() => void availability.refetch()} className="h-auto min-w-0 justify-between gap-3 whitespace-normal py-3"><span>{newsletterDateLabel(selection)}</span><CalendarDays className="h-4 w-4 shrink-0" /></Button></PopoverTrigger>
            <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start"><Calendar mode="single" selected={selection ? parseISO(selection) : undefined} disabled={(date) => !ready || !isNewsletterDateAvailable(date, availability.data ?? [])} onSelect={(date) => { if (date && isNewsletterDateAvailable(date, availability.data ?? [])) setSelection(format(date, "yyyy-MM-dd")); }} /></PopoverContent>
          </Popover>
          <Button disabled={!ready || !selection || busy || !isNewsletterDateAvailable(parseISO(selection), availability.data ?? [])} onClick={() => void book()} className="h-auto py-3">{busy ? "Booking…" : "Book complimentary spot"}</Button>
          {availability.isError && <Button variant="outline" onClick={() => void availability.refetch()}>Retry availability</Button>}
        </div>}
      </div>
    </div>
  </section>;
}