"use client";

import React, { useMemo, useState } from "react";
import type { FurnitureCategory, FurnitureLibraryItem } from "@/app/lib/editorTypes";

type Props = {
 items: FurnitureLibraryItem[];
 language?: "zh" | "en";
 onAddItem?: (item: FurnitureLibraryItem) => void;
};

const CATEGORY_ORDER: FurnitureCategory[] = [
 "living",
 "bedroom",
 "dining",
 "kitchen",
 "bathroom",
 "storage",
 "decor",
];

const CATEGORY_LABELS: Record<FurnitureCategory, { zh: string; en: string }> = {
 living: { zh: "客厅", en: "Living" },
 bedroom: { zh: "卧室", en: "Bedroom" },
 dining: { zh: "餐厅", en: "Dining" },
 kitchen: { zh: "厨房", en: "Kitchen" },
 bathroom: { zh: "卫浴", en: "Bathroom" },
 storage: { zh: "收纳", en: "Storage" },
 decor: { zh: "装饰", en: "Decor" },
};

export default function FurnitureLibraryPanel({
 items,
 language = "zh",
 onAddItem,
}: Props) {
 const [activeCategory, setActiveCategory] = useState<FurnitureCategory>("living");

 const filtered = useMemo(
 () => items.filter((item) => item.category === activeCategory),
 [items, activeCategory],
 );

 return (
 <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
 <div className="border-b border-white/10 px-4 py-4">
 <h3 className="text-sm font-semibold text-white">
 {language === "zh" ? "家具 / 构件库" : "Furniture / Components"}
 </h3>
 <p className="mt-1 text-xs leading-6 text-white/55">
 {language === "zh"
 ? "当前先采用“点击加入平面”的方式，后续再升级为真正拖拽入图。"
 : "Items are currently added by click. Drag from library will come next."}
 </p>
 </div>

 <div className="border-b border-white/10 px-4 py-3">
 <div className="flex flex-wrap gap-2">
 {CATEGORY_ORDER.map((category) => {
 const label = CATEGORY_LABELS[category][language];
 const active = activeCategory === category;
 return (
 <button
 key={category}
 type="button"
 onClick={() => setActiveCategory(category)}
 className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
 active
 ? "bg-cyan-400 text-slate-950"
 : "bg-white/8 text-white/80 hover:bg-white/14"
 }`}
 >
 {label}
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-4 py-4">
 <div className="space-y-3">
 {filtered.map((item) => (
 <div
 key={item.id}
 className="rounded-2xl border border-white/10 bg-black/10 p-3"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <h4 className="truncate text-sm font-semibold text-white">
 {language === "zh" ? item.nameZh : item.nameEn}
 </h4>

 <div className="mt-2 space-y-1 text-xs text-white/55">
 <div>
 {language === "zh" ? "编码" : "Code"}：{item.code}
 </div>
 <div>
 {language === "zh" ? "尺寸" : "Size"}：{item.width}m × {item.depth}m
 </div>
 <div>
 {language === "zh" ? "价格" : "Price"}：¥{" "}
 {Math.round(item.price).toLocaleString()}
 </div>
 </div>
 </div>

 <button
 type="button"
 onClick={() => onAddItem?.(item)}
 className="shrink-0 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
 >
 {language === "zh" ? "加入" : "Add"}
 </button>
 </div>
 </div>
 ))}

 {filtered.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/50">
 {language === "zh" ? "该分类暂时没有素材。" : "No items in this category yet."}
 </div>
 ) : null}
 </div>
 </div>
 </div>
 );
}