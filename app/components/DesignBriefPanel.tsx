"use client";

import React, { useMemo } from "react";
import type {
 BudgetLevel,
 HouseDesignBrief,
 RoofType,
} from "@/app/lib/designTypes";

type KitchenType = "open" | "semi-open" | "closed";

type Props = {
 value: HouseDesignBrief;
 onChange: (next: HouseDesignBrief) => void;
 onGenerate: () => void;
 generating?: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
 return (
 <div className="mb-3 mt-6 border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
 {children}
 </div>
 );
}

function Label({ children }: { children: React.ReactNode }) {
 return <label className="mb-1 block text-xs text-white/70">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
 return (
 <input
 {...props}
 className={`w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/60 focus:bg-white/10 ${
 props.className || ""
 }`}
 />
 );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
 return (
 <select
 {...props}
 className={`w-full rounded-2xl border border-white/10 bg-[#161a22] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 ${
 props.className || ""
 }`}
 />
 );
}

function Check({
 checked,
 onChange,
 label,
}: {
 checked: boolean;
 onChange: (next: boolean) => void;
 label: string;
}) {
 return (
 <button
 type="button"
 onClick={() => onChange(!checked)}
 className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
 checked
 ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
 : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
 }`}
 >
 <span>{label}</span>
 <span
 className={`h-5 w-5 rounded-full border ${
 checked ? "border-cyan-300 bg-cyan-300/80" : "border-white/20"
 }`}
 />
 </button>
 );
}

function normalizeBrief(value: HouseDesignBrief): HouseDesignBrief {
 const v = (value ?? {}) as any;

 return {
 ...v,
 projectName: v.projectName ?? "DreamBuilder Design Studio",
 language: v.language ?? "zh",
 site: {
 country: "",
 city: "",
 plotArea: 0,
 buildAreaTarget: 120,
 floors: 1,
 orientation: "south",
 terrain: "plain",
 ...(v.site ?? {}),
 },
 requirements: {
 projectUse: "self_use",
 residents: 3,
 bedrooms: 3,
 livingRooms: 1,
 bathrooms: 2,
 showerRooms: 1,
 bathtubBathrooms: 1,
 walkInClosets: 0,
 homeTheaters: 0,
 kitchenType: "open",
 needDiningRoom: true,
 needStudy: false,
 needLaundry: true,
 needStorage: true,
 needGarage: false,
 needTerrace: false,
 needBalcony: false,
 needGarden: false,
 needPool: false,
 childFriendly: false,
 elderlyFriendly: false,
 barrierFree: false,
 ...(v.requirements ?? {}),
 },
 style: {
 architecturalStyle: "modern_minimal",
 roofType: "gable",
 windowStyle: "large_glass_modern",
 tone: "warm_gray",
 facadeMaterials: [],
 ...(v.style ?? {}),
 },
 preferences: {
 budgetLevel: "standard",
 totalBudget: 0,
 currency: "EUR",
 prioritizeCostControl: false,
 prioritizeView: false,
 prioritizePrivacy: false,
 prioritizeDaylight: true,
 needSolar: false,
 needFloorHeating: false,
 needFreshAirSystem: false,
 needSmartHome: false,
 ...(v.preferences ?? {}),
 },
 } as HouseDesignBrief;
}

export default function DesignBriefPanel({
 value,
 onChange,
 onGenerate,
 generating,
}: Props) {
 const safeValue = useMemo(() => normalizeBrief(value), [value]);

 const update = (patch: Partial<HouseDesignBrief>) => {
 onChange({
 ...safeValue,
 ...patch,
 });
 };

 const updateSite = (patch: Record<string, unknown>) => {
 onChange({
 ...safeValue,
 site: {
 ...(safeValue as any).site,
 ...patch,
 },
 } as HouseDesignBrief);
 };

 const updateReq = (patch: Record<string, unknown>) => {
 onChange({
 ...safeValue,
 requirements: {
 ...(safeValue as any).requirements,
 ...patch,
 },
 } as HouseDesignBrief);
 };

 const updateStyle = (patch: Record<string, unknown>) => {
 onChange({
 ...safeValue,
 style: {
 ...(safeValue as any).style,
 ...patch,
 },
 } as HouseDesignBrief);
 };

 const updatePref = (patch: Record<string, unknown>) => {
 onChange({
 ...safeValue,
 preferences: {
 ...(safeValue as any).preferences,
 ...patch,
 },
 } as HouseDesignBrief);
 };

 const toggleFacadeMaterial = (material: string) => {
 const current = Array.isArray((safeValue as any).style?.facadeMaterials)
 ? (safeValue as any).style.facadeMaterials
 : [];

 const has = current.includes(material);
 const next = has
 ? current.filter((m: string) => m !== material)
 : [...current, material];

 updateStyle({ facadeMaterials: next });
 };

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="flex items-start justify-between gap-4">
 <div>
 <h2 className="text-xl font-semibold text-white">
 Professional Design Brief
 </h2>
 <p className="mt-1 text-sm text-white/55">
 填写专业建房需求，生成方案、图纸、建材和预算概算
 </p>
 </div>
 <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
 V2 Studio
 </div>
 </div>

 <SectionTitle>Basic Info</SectionTitle>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <Label>项目名称</Label>
 <Input
 value={(safeValue as any).projectName ?? ""}
 onChange={(e) => update({ projectName: e.target.value })}
 placeholder="例如：Lisbon Family Courtyard House"
 />
 </div>

 <div>
 <Label>语言</Label>
 <Select
 value={(safeValue as any).language ?? "zh"}
 onChange={(e) => update({ language: e.target.value as "zh" | "en" })}
 >
 <option value="zh">中文</option>
 <option value="en">English</option>
 </Select>
 </div>

 <div>
 <Label>国家</Label>
 <Input
 value={(safeValue as any).site?.country ?? ""}
 onChange={(e) => updateSite({ country: e.target.value })}
 />
 </div>

 <div>
 <Label>城市</Label>
 <Input
 value={(safeValue as any).site?.city ?? ""}
 onChange={(e) => updateSite({ city: e.target.value })}
 />
 </div>

 <div>
 <Label>用地面积（㎡）</Label>
 <Input
 type="number"
 value={Number((safeValue as any).site?.plotArea ?? 0)}
 onChange={(e) => updateSite({ plotArea: Number(e.target.value || 0) })}
 />
 </div>

 <div>
 <Label>目标建筑面积（㎡）</Label>
 <Input
 type="number"
 value={Number((safeValue as any).site?.buildAreaTarget ?? 0)}
 onChange={(e) =>
 updateSite({ buildAreaTarget: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>层数</Label>
 <Input
 type="number"
 min={1}
 max={5}
 value={Number((safeValue as any).site?.floors ?? 1)}
 onChange={(e) => updateSite({ floors: Number(e.target.value || 1) })}
 />
 </div>

 <div>
 <Label>朝向</Label>
 <Select
 value={(safeValue as any).site?.orientation ?? "south"}
 onChange={(e) => updateSite({ orientation: e.target.value })}
 >
 <option value="south">朝南 / South</option>
 <option value="east">朝东 / East</option>
 <option value="west">朝西 / West</option>
 <option value="north">朝北 / North</option>
 <option value="south_east">东南 / South-East</option>
 <option value="south_west">西南 / South-West</option>
 </Select>
 </div>

 <div>
 <Label>地形</Label>
 <Select
 value={(safeValue as any).site?.terrain ?? "plain"}
 onChange={(e) => updateSite({ terrain: e.target.value })}
 >
 <option value="plain">平地 / Plain</option>
 <option value="slope">坡地 / Slope</option>
 <option value="cliff">悬崖 / Cliff</option>
 <option value="forest_edge">林地边缘 / Forest Edge</option>
 <option value="coastal">海边 / Coastal</option>
 </Select>
 </div>

 <div>
 <Label>项目用途</Label>
 <Select
 value={(safeValue as any).requirements?.projectUse ?? "self_use"}
 onChange={(e) => updateReq({ projectUse: e.target.value })}
 >
 <option value="self_use">自住</option>
 <option value="rental">出租</option>
 <option value="homestay">民宿</option>
 <option value="investment">投资</option>
 </Select>
 </div>
 </div>

 <SectionTitle>Family & Space Program</SectionTitle>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <Label>常住人数</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.residents ?? 0)}
 onChange={(e) => updateReq({ residents: Number(e.target.value || 0) })}
 />
 </div>

 <div>
 <Label>卧室数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.bedrooms ?? 0)}
 onChange={(e) => updateReq({ bedrooms: Number(e.target.value || 0) })}
 />
 </div>

 <div>
 <Label>客厅数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.livingRooms ?? 0)}
 onChange={(e) =>
 updateReq({ livingRooms: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>卫生间总数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.bathrooms ?? 0)}
 onChange={(e) => updateReq({ bathrooms: Number(e.target.value || 0) })}
 />
 </div>

 <div>
 <Label>淋浴间数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.showerRooms ?? 0)}
 onChange={(e) =>
 updateReq({ showerRooms: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>带浴缸的卫生间数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.bathtubBathrooms ?? 0)}
 onChange={(e) =>
 updateReq({ bathtubBathrooms: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>衣帽间数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.walkInClosets ?? 0)}
 onChange={(e) =>
 updateReq({ walkInClosets: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>家庭影院数量</Label>
 <Input
 type="number"
 value={Number((safeValue as any).requirements?.homeTheaters ?? 0)}
 onChange={(e) =>
 updateReq({ homeTheaters: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>厨房形式</Label>
 <Select
 value={(safeValue as any).requirements?.kitchenType ?? "open"}
 onChange={(e) =>
 updateReq({ kitchenType: e.target.value as KitchenType })
 }
 >
 <option value="open">开放式</option>
 <option value="semi-open">半开放式</option>
 <option value="closed">封闭式</option>
 </Select>
 </div>
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <Check
 checked={Boolean((safeValue as any).requirements?.needDiningRoom)}
 onChange={(next) => updateReq({ needDiningRoom: next })}
 label="独立餐厅"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needStudy)}
 onChange={(next) => updateReq({ needStudy: next })}
 label="书房"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needLaundry)}
 onChange={(next) => updateReq({ needLaundry: next })}
 label="洗衣房"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needStorage)}
 onChange={(next) => updateReq({ needStorage: next })}
 label="储藏间"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needGarage)}
 onChange={(next) => updateReq({ needGarage: next })}
 label="车库"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needTerrace)}
 onChange={(next) => updateReq({ needTerrace: next })}
 label="露台"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needBalcony)}
 onChange={(next) => updateReq({ needBalcony: next })}
 label="阳台"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needGarden)}
 onChange={(next) => updateReq({ needGarden: next })}
 label="庭院"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.needPool)}
 onChange={(next) => updateReq({ needPool: next })}
 label="泳池"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.childFriendly)}
 onChange={(next) => updateReq({ childFriendly: next })}
 label="儿童友好"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.elderlyFriendly)}
 onChange={(next) => updateReq({ elderlyFriendly: next })}
 label="老人友好"
 />
 <Check
 checked={Boolean((safeValue as any).requirements?.barrierFree)}
 onChange={(next) => updateReq({ barrierFree: next })}
 label="无障碍"
 />
 </div>

 <SectionTitle>Style & Material</SectionTitle>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <Label>建筑风格</Label>
 <Select
 value={(safeValue as any).style?.architecturalStyle ?? "modern_minimal"}
 onChange={(e) => updateStyle({ architecturalStyle: e.target.value })}
 >
 <option value="modern_minimal">现代极简</option>
 <option value="contemporary_luxury">现代轻奢</option>
 <option value="nordic">北欧</option>
 <option value="mediterranean">地中海</option>
 <option value="new_chinese">新中式</option>
 <option value="japanese">日式</option>
 <option value="classic_european">欧式经典</option>
 </Select>
 </div>

 <div>
 <Label>屋顶类型</Label>
 <Select
 value={(safeValue as any).style?.roofType ?? "gable"}
 onChange={(e) => updateStyle({ roofType: e.target.value as RoofType })}
 >
 <option value="flat">平屋顶</option>
 <option value="gable">双坡屋顶</option>
 <option value="hip">四坡屋顶</option>
 <option value="mixed">混合屋顶</option>
 </Select>
 </div>

 <div>
 <Label>窗体风格</Label>
 <Select
 value={(safeValue as any).style?.windowStyle ?? "large_glass_modern"}
 onChange={(e) => updateStyle({ windowStyle: e.target.value })}
 >
 <option value="large_glass_modern">大玻璃现代窗</option>
 <option value="framed_classic">分格经典窗</option>
 <option value="slim_dark_frame">窄边深色窗</option>
 <option value="warm_wood_frame">暖木色窗框</option>
 </Select>
 </div>

 <div>
 <Label>主色调</Label>
 <Select
 value={(safeValue as any).style?.tone ?? "warm_gray"}
 onChange={(e) => updateStyle({ tone: e.target.value })}
 >
 <option value="warm_gray">暖灰</option>
 <option value="cool_gray">冷灰</option>
 <option value="beige_white">米白</option>
 <option value="wood_earth">木质大地色</option>
 <option value="black_white">黑白极简</option>
 </Select>
 </div>
 </div>

 <div className="mt-4">
 <Label>外立面材料（可多选）</Label>
 <div className="grid gap-3 md:grid-cols-3">
 {[
 ["stone_paint", "真石漆"],
 ["stone_panel", "石材挂板"],
 ["wood_finish", "木饰面"],
 ["face_brick", "清水砖/面砖"],
 ["aluminum_panel", "铝板"],
 ["micro_cement", "微水泥"],
 ].map(([key, label]) => {
 const materials = Array.isArray((safeValue as any).style?.facadeMaterials)
 ? (safeValue as any).style.facadeMaterials
 : [];
 const checked = materials.includes(key);

 return (
 <button
 key={key}
 type="button"
 onClick={() => toggleFacadeMaterial(key)}
 className={`rounded-2xl border px-4 py-3 text-sm transition ${
 checked
 ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
 : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
 }`}
 >
 {label}
 </button>
 );
 })}
 </div>
 </div>

 <SectionTitle>Budget & Building Systems</SectionTitle>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <Label>预算档次</Label>
 <Select
 value={(safeValue as any).preferences?.budgetLevel ?? "standard"}
 onChange={(e) =>
 updatePref({ budgetLevel: e.target.value as BudgetLevel })
 }
 >
 <option value="economy">经济型</option>
 <option value="standard">标准型</option>
 <option value="premium">高端型</option>
 </Select>
 </div>

 <div>
 <Label>总预算</Label>
 <Input
 type="number"
 value={Number((safeValue as any).preferences?.totalBudget ?? 0)}
 onChange={(e) =>
 updatePref({ totalBudget: Number(e.target.value || 0) })
 }
 />
 </div>

 <div>
 <Label>预算币种</Label>
 <Select
 value={(safeValue as any).preferences?.currency ?? "EUR"}
 onChange={(e) => updatePref({ currency: e.target.value })}
 >
 <option value="EUR">EUR</option>
 <option value="USD">USD</option>
 <option value="CNY">CNY</option>
 </Select>
 </div>
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <Check
 checked={Boolean((safeValue as any).preferences?.prioritizeCostControl)}
 onChange={(next) => updatePref({ prioritizeCostControl: next })}
 label="优先控制成本"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.prioritizeView)}
 onChange={(next) => updatePref({ prioritizeView: next })}
 label="优先观景"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.prioritizePrivacy)}
 onChange={(next) => updatePref({ prioritizePrivacy: next })}
 label="优先隐私"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.prioritizeDaylight)}
 onChange={(next) => updatePref({ prioritizeDaylight: next })}
 label="优先采光"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.needSolar)}
 onChange={(next) => updatePref({ needSolar: next })}
 label="光伏系统"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.needFloorHeating)}
 onChange={(next) => updatePref({ needFloorHeating: next })}
 label="地暖"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.needFreshAirSystem)}
 onChange={(next) => updatePref({ needFreshAirSystem: next })}
 label="新风系统"
 />
 <Check
 checked={Boolean((safeValue as any).preferences?.needSmartHome)}
 onChange={(next) => updatePref({ needSmartHome: next })}
 label="智能家居"
 />
 </div>

 <div className="mt-8">
 <button
 type="button"
 onClick={onGenerate}
 disabled={generating}
 className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-4 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
 >
 {generating ? "生成中..." : "生成专业方案"}
 </button>
 </div>
 </div>
 );
}