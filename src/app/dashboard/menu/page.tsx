import { Plus, UtensilsCrossed } from "lucide-react";

import { CategoryDialog } from "@/components/menu/category-dialog";
import { CategoryList } from "@/components/menu/category-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "القائمة | دجلة",
};

export default async function MenuPage() {
  const supabase = await createClient();

  // RLS scopes this to the signed-in restaurant; no filter needed.
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id, name, is_active, sort_order")
    .order("sort_order", { ascending: true });

  const list = categories ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">القائمة</h1>
          <p className="text-muted-foreground text-sm">
            نظّم قائمتك بالتصنيفات — الترتيب هنا هو ما يراه الزبون.
          </p>
        </div>

        <CategoryDialog
          trigger={
            <Button>
              <Plus />
              تصنيف
            </Button>
          }
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
            <UtensilsCrossed className="size-10 opacity-40" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">لا توجد تصنيفات بعد</p>
              <p className="text-sm">
                ابدأ بتصنيف مثل «المشاوي» أو «المشروبات»، ثم أضف الأصناف داخله.
              </p>
            </div>
            <CategoryDialog
              trigger={
                <Button variant="outline">
                  <Plus />
                  أضف أول تصنيف
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <CategoryList categories={list} />
      )}
    </div>
  );
}
