import { useRef, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { launchFireworks } from "@/lib/fireworks";
import { formatTHB, type Selection } from "@/lib/pricing";
import { BOOKING_ENDPOINT, type BookingReceipt, type BookingRequest } from "@/lib/booking";
import { summarize } from "./Ticket";

const holdTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
});

export function BookingDialog({
  selection,
  onClose,
  onAccepted,
  onSlotUnavailable,
}: {
  selection: Selection | null;
  onClose: () => void;
  onAccepted: () => void;
  onSlotUnavailable: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    contact?: string;
    address?: string;
    submit?: string;
  }>({});
  const [done, setDone] = useState<BookingReceipt | null>(null);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const requestKey = useRef<{ body: string; id: string } | null>(null);
  if (!selection) return null;
  const { rows, details, total } = summarize(selection);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Как к вам обращаться?";
    if (contact.trim().length < 4) errs.contact = "Оставьте Telegram или WhatsApp для связи";
    if (address.trim().length < 3) errs.address = "Укажите адрес или название места";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      selection,
      name: name.trim(),
      contact: contact.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };
    const body = JSON.stringify(payload);
    const sendError = "Не удалось получить ответ. Повторите отправку, чтобы проверить заявку.";
    inFlight.current = true;
    setSending(true);
    try {
      if (requestKey.current?.body !== body) requestKey.current = { body, id: crypto.randomUUID() };
      const request: BookingRequest = { ...payload, requestId: requestKey.current.id };
      const response = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await response.json()) as Partial<BookingReceipt> & {
        error?: string;
        code?: string;
      };
      if (response.status === 409 && result.code === "slot_unavailable") {
        requestKey.current = null;
        onSlotUnavailable();
        return;
      }
      if (!response.ok) {
        setErrors({ submit: result.error || sendError });
        return;
      }
      if (
        typeof result.id !== "number" ||
        typeof result.total !== "number" ||
        typeof result.holdUntil !== "number"
      ) {
        throw new Error("Invalid booking receipt");
      }
      setDone({ id: result.id, total: result.total, holdUntil: result.holdUntil });
      onAccepted();
      void launchFireworks(4000).catch(() => undefined);
    } catch {
      setErrors({ submit: sendError });
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const handleOpen = (v: boolean) => {
    if (v || inFlight.current) return;
    onClose();
    setErrors({});
    if (done) {
      setDone(null);
      setName("");
      setContact("");
      setAddress("");
      setNotes("");
      requestKey.current = null;
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpen}>
      <DialogContent className="glass-strong max-h-[92vh] overflow-y-auto rounded-3xl border-gold/30 bg-popover/90 p-0 sm:max-w-lg">
        {!done ? (
          <form onSubmit={submit} className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="font-display text-3xl font-semibold">
                <span className="text-gold">Бронируем чудо</span> ✨
              </DialogTitle>
              <DialogDescription>
                Итого: <span className="font-semibold text-gold">{formatTHB(total)}</span> · оплата
                после праздника
              </DialogDescription>
            </DialogHeader>
            <fieldset className="mt-6 space-y-4" disabled={sending}>
              <div className="space-y-2">
                <Label htmlFor="b-name">Ваше имя</Label>
                <Input
                  id="b-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="choice h-12 rounded-xl"
                  placeholder="Анна"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-contact">Ваш Telegram или WhatsApp</Label>
                <Input
                  id="b-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={80}
                  className="choice h-12 rounded-xl"
                  placeholder="@anna или +66 ..."
                />
                {errors.contact && <p className="text-sm text-destructive">{errors.contact}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-address">Адрес или название виллы / отеля</Label>
                <Input
                  id="b-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={200}
                  className="choice h-12 rounded-xl"
                  placeholder="Название и адрес или ссылка на карту"
                />
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-notes">Возраст детей и пожелания</Label>
                <Textarea
                  id="b-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="choice rounded-xl"
                  placeholder="Двоим детям 5 и 7 лет. Подарки подготовим сами."
                />
              </div>
            </fieldset>
            {errors.submit && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {errors.submit}
              </p>
            )}
            <Button
              type="submit"
              variant="gold"
              size="xl"
              disabled={sending}
              className="mt-6 w-full"
            >
              {sending ? "Отправляем…" : "Отправить заявку"} <Sparkles />
            </Button>
          </form>
        ) : (
          <div className="bg-ticket fade-up">
            <div className="p-6 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-gold">Заявка № {done.id}</p>
              <div className="mt-4 text-6xl">🎅🛷</div>
              <DialogTitle className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                <span className="text-gold">Заявка принята!</span>
              </DialogTitle>
              <DialogDescription className="mt-3">
                {name}, мы свяжемся с вами по контакту {contact} для подтверждения брони. Время
                удерживается до {holdTime.format(done.holdUntil)} по Пхукету.
              </DialogDescription>
            </div>
            <div className="perforation" />
            <div className="p-6 sm:p-8">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {details.map((d) => (
                  <div key={d.k}>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      {d.k}
                    </dt>
                    <dd className="font-medium">{d.v}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-4 space-y-1.5 text-sm">
                {done.total === total &&
                  rows.map((r) => (
                    <li key={r.label} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="tabular-nums">{formatTHB(r.amount)}</span>
                    </li>
                  ))}
              </ul>
              <div className="mt-4 flex items-end justify-between border-t border-gold/20 pt-4">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Итого
                </span>
                <span className="font-display text-4xl font-bold text-gold">
                  {formatTHB(done.total)}
                </span>
              </div>
              <Button
                variant="glass"
                className="mt-6 h-12 w-full"
                onClick={() => handleOpen(false)}
              >
                Чудесно, жду!
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
