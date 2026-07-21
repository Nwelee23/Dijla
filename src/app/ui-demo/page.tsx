"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/utils";

const sampleItems = [
  { name: "قيمة بغدادية", category: "الأطباق الرئيسية", price: 9000 },
  { name: "كباب عراقي", category: "المشاوي", price: 15000 },
  { name: "تشريب لحم", category: "الأطباق الرئيسية", price: 12000 },
  { name: "عصير رقي", category: "المشروبات", price: 3000 },
];

export default function UiDemoPage() {
  const [soldOut, setSoldOut] = useState(false);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">دجلة — معاينة نظام التصميم</h1>
        <p className="text-muted-foreground text-sm">
          صفحة تجريبية للتأكد من عمل مكوّنات shadcn/ui بالعربية واتجاه RTL.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>الأزرار</CardTitle>
          <CardDescription>الأنماط الأساسية بلون العلامة.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success("تم حفظ التغييرات")}>
            حفظ
          </Button>
          <Button variant="secondary">ثانوي</Button>
          <Button variant="outline">مُحدَّد</Button>
          <Button variant="ghost">شفاف</Button>
          <Button
            variant="destructive"
            onClick={() => toast.error("تعذّر حذف الصنف")}
          >
            حذف
          </Button>
        </CardContent>
        <CardFooter className="text-muted-foreground text-sm">
          اضغط «حفظ» أو «حذف» للتأكد من ظهور التنبيه (Toast) في الأعلى.
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الحقول</CardTitle>
          <CardDescription>
            لاحظ محاذاة النص والعناصر إلى اليمين.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="demo-name">اسم المطعم</Label>
            <Input id="demo-name" placeholder="مطعم دجلة" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-phone">رقم الهاتف</Label>
            <Input id="demo-phone" type="tel" placeholder="0770 000 0000" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-area">المنطقة</Label>
            <Select>
              <SelectTrigger id="demo-area" className="w-full">
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="najaf">النجف</SelectItem>
                <SelectItem value="kufa">الكوفة</SelectItem>
                <SelectItem value="karbala">كربلاء</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 sm:pt-7">
            <Label htmlFor="demo-soldout">نفد الصنف</Label>
            <Switch
              id="demo-soldout"
              checked={soldOut}
              onCheckedChange={setSoldOut}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>القوائم والتبويبات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="menu">
            <TabsList>
              <TabsTrigger value="menu">القائمة</TabsTrigger>
              <TabsTrigger value="orders">الطلبات</TabsTrigger>
            </TabsList>
            <TabsContent value="menu" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصنف</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleItems.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.category}
                      </TableCell>
                      <TableCell>{formatMoney(item.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="orders" className="text-muted-foreground pt-4 text-sm">
              الطلبات المباشرة تُبنى في المرحلة الثانية.
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">قائمة منسدلة</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>تعديل</DropdownMenuItem>
                <DropdownMenuItem>نسخ الرابط</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">حذف</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">نافذة حوار</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>حذف الصنف؟</DialogTitle>
                  <DialogDescription>
                    لا يمكن التراجع عن هذا الإجراء. الطلبات السابقة تحتفظ بنسخة
                    من الاسم والسعر.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">إلغاء</Button>
                  <Button variant="destructive">حذف</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
