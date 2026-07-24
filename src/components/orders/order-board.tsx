"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Archive, BellRing, ChefHat, ClipboardList, Keyboard, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { ElapsedTimer } from "@/components/orders/elapsed-timer";
import { useT } from "@/components/i18n/i18n-provider";
import { OrderCard } from "@/components/orders/order-card";
import { useOrderMove } from "@/components/orders/use-order-move";
import { WaiterCalls, type Call } from "@/components/orders/waiter-calls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveDrivers } from "@/lib/hooks/use-live-drivers";
import {
  useRealtimeOrders,
  type LiveOrder,
  type OrderDriver,
} from "@/lib/hooks/use-realtime-orders";
import { interpolate } from "@/lib/i18n";
import { resolveDrop, type LaneKey } from "@/lib/board-drag";
import { isActive, nextStatus, statusLabel, type OrderStatus } from "@/lib/order-status";
import type { PrepThresholds } from "@/lib/order-timing";
import { armAudio, playOrderAlert } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "dijla:orders:sound";

/**
 * The three kanban lanes (ORDERS_DASHBOARD_SPEC §1). `accepted` shares the
 * preparing lane and `out_for_delivery` shares ready, so every active order has
 * exactly one home and the board stays three columns wide.
 */
const BOARD_COLUMNS = [
  { key: "new", statuses: ["new"] },
  { key: "preparing", statuses: ["accepted", "preparing"] },
  { key: "ready", statuses: ["ready", "out_for_delivery"] },
] as const;

/** Oldest first within a lane — act on what has waited longest. */
const byOldest = (a: LiveOrder, b: LiveOrder) =>
  new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();

export function OrderBoard({
  initialOrders,
  initialCalls,
  drivers: initialDrivers,
  thresholds,
}: {
  initialOrders: LiveOrder[];
  initialCalls: Call[];
  drivers: OrderDriver[];
  thresholds: PrepThresholds;
}) {
  const t = useT();
  const drivers = useLiveDrivers(initialDrivers);
  const {
    orders,
    isLive,
    unseen,
    acknowledge,
    acknowledgeAll,
    setNewOrderHandler,
    setResyncHandler,
  } = useRealtimeOrders(initialOrders);

  const [soundOn, setSoundOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { move } = useOrderMove();

  // A small activation distance means a tap on a card's button is still a click,
  // not a drag — the existing buttons keep working on touch and with gloves (§D.1).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Browsers only start audio from a gesture, so this cannot be restored
  // silently on load — the operator has to press the button once per session.
  const enableSound = useCallback(async () => {
    const ok = await armAudio();
    if (!ok) {
      toast.error(t.orders.soundBlocked);
      return;
    }
    setSoundOn(true);
    try {
      window.localStorage.setItem(SOUND_KEY, "1");
    } catch {
      // Storage is only used to nudge next time; not being able to write is fine.
    }
    playOrderAlert();
  }, [t]);

  useEffect(() => {
    setNewOrderHandler(() => {
      if (soundOn) playOrderAlert();
    });
    return () => setNewOrderHandler(null);
  }, [soundOn, setNewOrderHandler]);

  useEffect(() => {
    setResyncHandler((count) =>
      toast.success(interpolate(t.orders.resynced, { count }))
    );
    return () => setResyncHandler(null);
  }, [setResyncHandler, t]);

  // Re-sound every 20s while orders sit unacknowledged (§4): a single chime is
  // easy to miss over a fryer. Acknowledging clears `unseen` and stops it.
  useEffect(() => {
    if (!soundOn || unseen.size === 0) return;
    const id = setInterval(() => playOrderAlert(), 20_000);
    return () => clearInterval(id);
  }, [soundOn, unseen.size]);

  // Visual fallback that survives a muted tab (§4): a count in the tab title, so
  // a backgrounded board still shows "(2)" next to the name. Cleanup restores
  // the real title, so the prefix never stacks as the count changes.
  useEffect(() => {
    if (unseen.size === 0) return;
    const original = document.title;
    document.title = `(${unseen.size}) ${original}`;
    return () => {
      document.title = original;
    };
  }, [unseen.size]);

  const active = orders.filter((order) => isActive(order.status));

  // Lanes, plus a flat top-to-bottom order for keyboard navigation (§E).
  const lanes = BOARD_COLUMNS.map((column) => ({
    key: column.key,
    cards: active
      .filter((order) => (column.statuses as readonly string[]).includes(order.status))
      .sort(byOldest),
  }));
  const flatCards = lanes.flatMap((lane) => lane.cards);

  // Keyboard shortcuts (§E). Disabled while typing so Arabic input is never
  // intercepted; every action also has a visible button, so nothing is
  // keyboard-only. Navigation is vertical (j/k or up/down), so RTL is moot.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (flatCards.length === 0) return;

      const index = flatCards.findIndex((order) => order.id === selectedId);

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedId(
          flatCards[Math.min((index < 0 ? -1 : index) + 1, flatCards.length - 1)].id
        );
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedId(
          flatCards[Math.max((index < 0 ? flatCards.length : index) - 1, 0)].id
        );
      } else if (event.key === "Enter" && index >= 0) {
        const order = flatCards[index];
        const to = nextStatus(order.status, order.type);
        if (to) move(order.id, order.status as OrderStatus, to);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flatCards, selectedId, move]);

  // Keep the highlighted card in view as the selection moves.
  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`order-${selectedId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  // Drag a card onto a lane to advance it (§D.1). Forward only — a backward drag
  // is refused; the 10-second undo from `move` still guards the forward change.
  function onDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (!over) return;
    const order = active.find((o) => o.id === dragged.id);
    if (!order) return;

    const result = resolveDrop(order.status, over.id as LaneKey);
    if (result.kind === "backward") {
      toast.error(t.orders.dragBackward);
      return;
    }
    if (result.kind === "same") return;
    move(order.id, order.status as OrderStatus, result.to);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isLive
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          )}
        >
          {isLive ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {isLive ? t.orders.live : t.orders.reconnecting}
        </span>

        {/* Visual first: the board must never depend on sound to be noticed. */}
        <Button
          variant={soundOn ? "ghost" : "default"}
          size="sm"
          onClick={soundOn ? () => setSoundOn(false) : enableSound}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
          {soundOn ? t.orders.soundOn : t.orders.soundOff}
        </Button>

        <div className="ms-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.orders.shortcuts.title}
            title={t.orders.shortcuts.title}
            onClick={() => setShortcutsOpen(true)}
          >
            <Keyboard />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/orders/kitchen">
              <ChefHat />
              {t.orders.kitchen}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/orders/archive">
              <Archive />
              {t.orders.archive}
            </Link>
          </Button>
        </div>
      </div>

      <WaiterCalls initialCalls={initialCalls} />

      {unseen.size > 0 && (
        <div className="bg-primary text-primary-foreground flex items-center gap-3 rounded-xl p-3 shadow">
          <BellRing className="size-5 shrink-0 animate-pulse" />
          <span className="flex-1 font-bold">
            {interpolate(t.orders.unseenCount, { count: unseen.size })}
          </span>
          <Button variant="secondary" size="sm" onClick={acknowledgeAll}>
            {t.orders.acknowledgeAll}
          </Button>
        </div>
      )}

      {active.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border py-16 text-center">
          <ClipboardList className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.orders.noOrders}</p>
            <p className="text-sm">{t.orders.noOrdersHint}</p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {lanes.map((lane) => (
              <DroppableLane key={lane.key} laneKey={lane.key}>
                <header className="flex items-center gap-2 border-b pb-2">
                  <h2 className="text-sm font-bold">{statusLabel(t, lane.key)}</h2>
                  {/* Oldest order's age, so a backing-up lane is obvious (§D.3). */}
                  {lane.cards.length > 0 && (
                    <ElapsedTimer
                      createdAt={lane.cards[0].created_at}
                      thresholds={thresholds}
                      className="text-xs"
                    />
                  )}
                  <span className="bg-muted text-muted-foreground ms-auto rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
                    {lane.cards.length}
                  </span>
                </header>
                {lane.cards.length === 0 ? (
                  <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-xs">
                    {t.orders.laneEmpty}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lane.cards.map((order) => (
                      <DraggableCard
                        key={order.id}
                        orderId={order.id}
                        className={cn(
                          "rounded-xl",
                          selectedId === order.id &&
                            "ring-brand ring-offset-background ring-2 ring-offset-2"
                        )}
                      >
                        <OrderCard
                          order={order}
                          drivers={drivers}
                          thresholds={thresholds}
                          isUnseen={unseen.has(order.id)}
                          onAcknowledge={() => acknowledge(order.id)}
                        />
                      </DraggableCard>
                    ))}
                  </div>
                )}
              </DroppableLane>
            ))}
          </div>
        </DndContext>
      )}

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.orders.shortcuts.title}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {[
              { keys: "↑ ↓ / j k", label: t.orders.shortcuts.move },
              { keys: "Enter", label: t.orders.shortcuts.advance },
              { keys: "Esc", label: t.orders.shortcuts.clear },
              { keys: "?", label: t.orders.shortcuts.help },
            ].map((row) => (
              <li key={row.keys} className="flex items-center justify-between gap-3">
                <span>{row.label}</span>
                <kbd className="bg-muted rounded px-2 py-0.5 font-mono text-xs" dir="ltr">
                  {row.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A lane the cards can be dropped into; highlights while a card hovers it. */
function DroppableLane({
  laneKey,
  children,
}: {
  laneKey: LaneKey;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: laneKey });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "space-y-3 rounded-xl transition-colors",
        isOver && "ring-brand/50 bg-brand/5 ring-2"
      )}
    >
      {children}
    </section>
  );
}

/**
 * A draggable order card. Only the pointer listeners are spread (not dnd-kit's
 * a11y attributes) so the wrapper never becomes a role="button" around the
 * card's own buttons — dragging is a mouse/touch shortcut, and the keyboard
 * path stays the board's j/k/Enter shortcuts.
 */
function DraggableCard({
  orderId,
  className,
  children,
}: {
  orderId: string;
  className?: string;
  children: ReactNode;
}) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: orderId,
  });
  return (
    <div
      ref={setNodeRef}
      id={`order-${orderId}`}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              zIndex: 50,
              position: "relative",
            }
          : undefined
      }
      className={cn(className, "touch-manipulation", isDragging && "opacity-60")}
      {...listeners}
    >
      {children}
    </div>
  );
}
