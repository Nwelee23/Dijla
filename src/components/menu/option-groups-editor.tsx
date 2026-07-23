"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addOption,
  addOptionGroup,
  deleteOption,
  deleteOptionGroup,
  updateOption,
  updateOptionGroup,
} from "@/app/dashboard/menu/option-actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/app/dashboard/menu/actions";

type OptionRow = { id: string; name: string; price_delta: number | null };
type GroupRow = {
  id: string;
  name: string;
  is_required: boolean | null;
  max_select: number | null;
  options: OptionRow[];
};

/** Big multi = "any number", stored as a large max_select the customer UI reads as multi. */
const MULTI_MAX = 99;

/**
 * Manage an item's option groups and options (MENU_BUILDER_SPEC §4). Only shown
 * once the item exists (name + price is enough to save first), then edits
 * persist immediately — this is configuration, not a form to submit. Fields are
 * uncontrolled and commit on blur; structural changes refetch to pick up ids.
 */
export function OptionGroupsEditor({ itemId }: { itemId: string }) {
  const t = useT();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [isPending, startTransition] = useTransition();

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("option_groups")
      .select("id, name, is_required, max_select, options(id, name, price_delta)")
      .eq("item_id", itemId)
      .order("id", { ascending: true });
    setGroups(((data as GroupRow[] | null) ?? []).map((g) => ({
      ...g,
      options: [...(g.options ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    })));
  }, [itemId]);

  useEffect(() => {
    // Load the item's groups once on open. setGroups runs after the await inside
    // refetch, not synchronously here, so the cascading-render concern does not
    // apply; the rule can't see through the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  const run = useCallback(
    (fn: () => Promise<ActionResult>, refresh = true) => {
      startTransition(async () => {
        const result = await fn();
        if (!result.ok) toast.error(result.error);
        if (refresh) await refetch();
      });
    },
    [refetch]
  );

  if (groups === null) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        {t.common.loading}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Label>{t.menu.optionGroups}</Label>

      {groups.map((group) => (
        <GroupCard key={group.id} group={group} run={run} disabled={isPending} />
      ))}

      <div className="flex gap-2">
        <Input
          placeholder={t.menu.groupNamePlaceholder}
          value={newGroup}
          onChange={(event) => setNewGroup(event.target.value)}
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isPending || !newGroup.trim()}
          onClick={() => {
            const name = newGroup.trim();
            setNewGroup("");
            run(() => addOptionGroup(itemId, name));
          }}
        >
          <Plus />
          {t.menu.addGroup}
        </Button>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  run,
  disabled,
}: {
  group: GroupRow;
  run: (fn: () => Promise<ActionResult>, refresh?: boolean) => void;
  disabled: boolean;
}) {
  const t = useT();
  const [required, setRequired] = useState(group.is_required ?? false);
  const [multi, setMulti] = useState((group.max_select ?? 1) > 1);
  const [optName, setOptName] = useState("");
  const [optPrice, setOptPrice] = useState("");

  function commitGroup(next: { name?: string; required?: boolean; multi?: boolean }) {
    run(
      () =>
        updateOptionGroup(group.id, {
          name: next.name ?? group.name,
          isRequired: next.required ?? required,
          maxSelect: (next.multi ?? multi) ? MULTI_MAX : 1,
        }),
      false
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Input
          defaultValue={group.name}
          disabled={disabled}
          aria-label={t.menu.groupName}
          onBlur={(event) => {
            const name = event.target.value.trim();
            if (name && name !== group.name) commitGroup({ name });
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive shrink-0"
          aria-label={t.menu.deleteGroup}
          disabled={disabled}
          onClick={() => run(() => deleteOptionGroup(group.id))}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={required}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setRequired(checked);
              commitGroup({ required: checked });
            }}
          />
          {t.menu.groupRequired}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={multi}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setMulti(checked);
              commitGroup({ multi: checked });
            }}
          />
          {t.menu.groupMulti}
        </label>
      </div>

      <ul className="space-y-1.5">
        {group.options.map((option) => (
          <li key={option.id} className="flex items-center gap-2">
            <Input
              className="flex-1"
              defaultValue={option.name}
              disabled={disabled}
              aria-label={t.menu.optionName}
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name && name !== option.name) {
                  run(() => updateOption(option.id, { name, priceDelta: Number(option.price_delta) }), false);
                }
              }}
            />
            <Input
              className="w-28"
              type="number"
              inputMode="numeric"
              step={250}
              dir="ltr"
              defaultValue={String(option.price_delta ?? 0)}
              disabled={disabled}
              aria-label={t.menu.priceDelta}
              onBlur={(event) => {
                const priceDelta = Number(event.target.value);
                if (priceDelta !== Number(option.price_delta)) {
                  run(() => updateOption(option.id, { name: option.name, priceDelta }), false);
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              aria-label={t.common.delete}
              disabled={disabled}
              onClick={() => run(() => deleteOption(option.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={t.menu.optionNamePlaceholder}
          value={optName}
          onChange={(event) => setOptName(event.target.value)}
          disabled={disabled}
        />
        <Input
          className="w-28"
          type="number"
          inputMode="numeric"
          step={250}
          dir="ltr"
          placeholder="+0"
          value={optPrice}
          onChange={(event) => setOptPrice(event.target.value)}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={t.menu.addOption}
          disabled={disabled || !optName.trim()}
          onClick={() => {
            const name = optName.trim();
            const price = Number(optPrice) || 0;
            setOptName("");
            setOptPrice("");
            run(() => addOption(group.id, name, price));
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
