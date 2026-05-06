"use client";

import React from "react";
import type {
 AxisLine,
 BudgetBreakdownItem,
 HouseDesignPackage,
 MaterialItem,
 RoomItem,
} from "@/app/lib/designTypes";
import PrintableFloorplanSheet from "@/app/components/PrintableFloorplanSheet";
import PrintableElevationSheet from "@/app/components/PrintableElevationSheet";
import PrintableSectionSheet from "@/app/components/PrintableSectionSheet";
import { buildDoorWindowSchedule } from "@/app/lib/drawingSchedule";

type Props = {
 result: HouseDesignPackage;
};

const PAGE_WIDTH = 1120;
const PAGE_MIN_HEIGHT = 1480;
const PAGE_INNER_PADDING = 28;
const REPORT_NAME = "DreamBuilder Professional Report";

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

function text(value: unknown, fallback = "-") {
 const s = String(value ?? "").trim();
 return s || fallback;
}

function joinText(
 values: Array<unknown> | undefined,
 separator = " / ",
 fallback = "-",
) {
 if (!Array.isArray(values) || values.length === 0) return fallback;
 const items = values.map((item) => String(item ?? "").trim()).filter(Boolean);
 return items.length > 0 ? items.join(separator) : fallback;
}

function sumMaterial(items: MaterialItem[] | undefined) {
 return (items ?? []).reduce((sum, item) => sum + num(item.totalPrice), 0);
}

function paginateRows<T>(rows: T[], pageSize: number) {
 const safeRows = Array.isArray(rows) ? rows : [];
 const safePageSize = Math.max(1, pageSize);
 const pages: T[][] = [];

 for (let i = 0; i < safeRows.length; i += safePageSize) {
 pages.push(safeRows.slice(i, i + safePageSize));
 }

 return pages.length ? pages : [[]];
}

function getMaxBudgetItem(
 items: BudgetBreakdownItem[] | undefined,
): BudgetBreakdownItem | null {
 const safeItems = Array.isArray(items) ? items : [];
 if (safeItems.length === 0) return null;

 return safeItems.reduce((max, item) => {
 return item.value > max.value ? item : max;
 });
}

function Money({
 value,
 currency,
}: {
 value: number;
 currency: "EUR" | "USD" | "CNY";
}) {
 return (
 <span>
 {currency} {Math.round(num(value)).toLocaleString()}
 </span>
 );
}

function HeaderBar({
 projectName,
 chapter,
}: {
 projectName: string;
 chapter?: string;
}) {
 return (
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 alignItems: "flex-start",
 gap: 16,
 paddingBottom: 10,
 borderBottom: "1px solid #dbe4ee",
 marginBottom: 18,
 }}
 >
 <div>
 <div
 style={{
 fontSize: 11,
 fontWeight: 700,
 color: "#0369a1",
 letterSpacing: 0.8,
 textTransform: "uppercase",
 }}
 >
 {REPORT_NAME}
 </div>
 <div
 style={{
 marginTop: 6,
 fontSize: 20,
 fontWeight: 800,
 color: "#0f172a",
 lineHeight: 1.2,
 }}
 >
 {projectName}
 </div>
 </div>

 <div
 style={{
 textAlign: "right",
 minWidth: 220,
 }}
 >
 <div
 style={{
 fontSize: 11,
 color: "#64748b",
 letterSpacing: 0.6,
 textTransform: "uppercase",
 }}
 >
 Document Chapter
 </div>
 <div
 style={{
 marginTop: 6,
 fontSize: 15,
 fontWeight: 700,
 color: "#0f172a",
 lineHeight: 1.35,
 }}
 >
 {chapter || "Concept Design"}
 </div>
 </div>
 </div>
 );
}

function FooterBar({
 pageNo,
 date,
 projectName,
}: {
 pageNo: number;
 date: string;
 projectName: string;
}) {
 return (
 <div
 style={{
 marginTop: 20,
 paddingTop: 12,
 borderTop: "1px solid #dbe4ee",
 display: "grid",
 gridTemplateColumns: "1.2fr 1fr 0.7fr",
 gap: 12,
 alignItems: "center",
 fontSize: 11,
 color: "#64748b",
 }}
 >
 <div>{projectName}</div>
 <div style={{ textAlign: "center" }}>Generated on {date}</div>
 <div style={{ textAlign: "right", fontWeight: 700 }}>Page {pageNo}</div>
 </div>
 );
}

function SheetTitleBlock({
 drawingTitle,
 drawingCode,
 scale = "1:100",
 pageNo,
 date,
 projectName,
 discipline = "Architecture",
 stage = "Concept Design",
 designedBy = "DreamBuilder AI",
 checkedBy = "Design Studio",
 projectCode = "DB-DS-2026",
}: {
 drawingTitle: string;
 drawingCode: string;
 scale?: string;
 pageNo: number;
 date: string;
 projectName: string;
 discipline?: string;
 stage?: string;
 designedBy?: string;
 checkedBy?: string;
 projectCode?: string;
}) {
 return (
 <div
 style={{
 marginTop: 14,
 border: "1px solid #94a3b8",
 borderRadius: 12,
 overflow: "hidden",
 background: "#fff",
 }}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.7fr 0.9fr 0.7fr 0.95fr 0.75fr",
 background: "#f8fafc",
 borderBottom: "1px solid #cbd5e1",
 fontSize: 10,
 fontWeight: 700,
 color: "#334155",
 }}
 >
 {["图名 Drawing Title", "图号 Code", "比例 Scale", "日期 Date", "页码 Page"].map(
 (cell, index) => (
 <div
 key={cell}
 style={{
 padding: "8px 10px",
 borderRight: index === 4 ? "none" : "1px solid #dbe4ee",
 }}
 >
 {cell}
 </div>
 ),
 )}
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.7fr 0.9fr 0.7fr 0.95fr 0.75fr",
 fontSize: 12,
 color: "#0f172a",
 borderBottom: "1px solid #e2e8f0",
 }}
 >
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7", fontWeight: 700 }}>
 {drawingTitle}
 </div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{drawingCode}</div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{scale}</div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{date}</div>
 <div style={{ padding: "10px" }}>{pageNo}</div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.35fr 0.8fr 0.9fr 0.8fr 0.8fr 0.8fr",
 background: "#ffffff",
 borderBottom: "1px solid #e2e8f0",
 fontSize: 10,
 fontWeight: 700,
 color: "#475569",
 }}
 >
 {["项目 Project", "项目编号", "专业 Discipline", "阶段 Stage", "设计 Designed", "审核 Checked"].map(
 (cell, index) => (
 <div
 key={cell}
 style={{
 padding: "7px 10px",
 borderRight: index === 5 ? "none" : "1px solid #eef2f7",
 }}
 >
 {cell}
 </div>
 ),
 )}
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.35fr 0.8fr 0.9fr 0.8fr 0.8fr 0.8fr",
 fontSize: 11,
 color: "#0f172a",
 }}
 >
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {projectName}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {projectCode}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {discipline}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {stage}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {designedBy}
 </div>
 <div style={{ padding: "9px 10px" }}>{checkedBy}</div>
 </div>
 </div>
 );
}

function DocumentInfoBar({
 title,
 code,
 pageNo,
 date,
 projectName,
 chapter = "Schedules",
 stage = "Concept Design",
 preparedBy = "DreamBuilder AI",
 reviewedBy = "Design Studio",
}: {
 title: string;
 code: string;
 pageNo: number;
 date: string;
 projectName: string;
 chapter?: string;
 stage?: string;
 preparedBy?: string;
 reviewedBy?: string;
}) {
 return (
 <div
 style={{
 marginTop: 14,
 border: "1px solid #94a3b8",
 borderRadius: 12,
 overflow: "hidden",
 background: "#fff",
 }}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.7fr 0.9fr 0.9fr 0.9fr 0.7fr",
 background: "#f8fafc",
 borderBottom: "1px solid #cbd5e1",
 fontSize: 10,
 fontWeight: 700,
 color: "#334155",
 }}
 >
 {["标题 Title", "编号 Code", "章节 Chapter", "日期 Date", "页码 Page"].map(
 (cell, index) => (
 <div
 key={cell}
 style={{
 padding: "8px 10px",
 borderRight: index === 4 ? "none" : "1px solid #dbe4ee",
 }}
 >
 {cell}
 </div>
 ),
 )}
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.7fr 0.9fr 0.9fr 0.9fr 0.7fr",
 fontSize: 12,
 color: "#0f172a",
 borderBottom: "1px solid #e2e8f0",
 }}
 >
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7", fontWeight: 700 }}>
 {title}
 </div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{code}</div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{chapter}</div>
 <div style={{ padding: "10px", borderRight: "1px solid #eef2f7" }}>{date}</div>
 <div style={{ padding: "10px" }}>{pageNo}</div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.5fr 0.9fr 0.9fr 0.9fr",
 background: "#ffffff",
 borderBottom: "1px solid #e2e8f0",
 fontSize: 10,
 fontWeight: 700,
 color: "#475569",
 }}
 >
 {["项目 Project", "阶段 Stage", "编制 Prepared", "复核 Reviewed"].map(
 (cell, index) => (
 <div
 key={cell}
 style={{
 padding: "7px 10px",
 borderRight: index === 3 ? "none" : "1px solid #eef2f7",
 }}
 >
 {cell}
 </div>
 ),
 )}
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.5fr 0.9fr 0.9fr 0.9fr",
 fontSize: 11,
 color: "#0f172a",
 }}
 >
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {projectName}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {stage}
 </div>
 <div style={{ padding: "9px 10px", borderRight: "1px solid #eef2f7" }}>
 {preparedBy}
 </div>
 <div style={{ padding: "9px 10px" }}>{reviewedBy}</div>
 </div>
 </div>
 );
}

function CoverMetaCard({
 label,
 value,
}: {
 label: string;
 value: React.ReactNode;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "rgba(255,255,255,0.92)",
 padding: "14px 16px",
 minHeight: 86,
 boxSizing: "border-box",
 }}
 >
 <div
 style={{
 fontSize: 11,
 color: "#64748b",
 letterSpacing: 0.3,
 marginBottom: 8,
 }}
 >
 {label}
 </div>
 <div
 style={{
 fontSize: 17,
 fontWeight: 800,
 color: "#0f172a",
 lineHeight: 1.45,
 wordBreak: "break-word",
 }}
 >
 {value}
 </div>
 </div>
 );
}

function SummaryPill({
 label,
 value,
}: {
 label: string;
 value: React.ReactNode;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 999,
 padding: "10px 14px",
 background: "#ffffff",
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
 gap: 12,
 }}
 >
 <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
 <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{value}</div>
 </div>
 );
}

function ExecutivePoint({
 title,
 text,
}: {
 title: string;
 text: string;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 16,
 background: "#fff",
 padding: 16,
 }}
 >
 <div
 style={{
 fontSize: 13,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 8,
 }}
 >
 {title}
 </div>
 <div
 style={{
 fontSize: 12,
 lineHeight: 1.85,
 color: "#475569",
 }}
 >
 {text}
 </div>
 </div>
 );
}

function IntroFeature({
 title,
 text,
}: {
 title: string;
 text: string;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 }}
 >
 <div
 style={{
 fontSize: 13,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 8,
 }}
 >
 {title}
 </div>
 <div
 style={{
 fontSize: 12,
 lineHeight: 1.85,
 color: "#475569",
 }}
 >
 {text}
 </div>
 </div>
 );
}

function InsightCard({
 title,
 value,
 note,
}: {
 title: string;
 value: React.ReactNode;
 note?: string;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 16,
 background: "#ffffff",
 padding: 16,
 }}
 >
 <div
 style={{
 fontSize: 11,
 color: "#64748b",
 marginBottom: 8,
 }}
 >
 {title}
 </div>
 <div
 style={{
 fontSize: 22,
 fontWeight: 900,
 color: "#0f172a",
 lineHeight: 1.25,
 }}
 >
 {value}
 </div>
 {note ? (
 <div
 style={{
 marginTop: 8,
 fontSize: 11,
 lineHeight: 1.7,
 color: "#64748b",
 }}
 >
 {note}
 </div>
 ) : null}
 </div>
 );
}

function StrategyNote({
 title,
 text,
}: {
 title: string;
 text: string;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 14,
 }}
 >
 <div
 style={{
 fontSize: 13,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 8,
 }}
 >
 {title}
 </div>
 <div
 style={{
 fontSize: 12,
 lineHeight: 1.85,
 color: "#475569",
 }}
 >
 {text}
 </div>
 </div>
 );
}

function MiniBarRow({
 label,
 value,
 total,
 color = "#0ea5e9",
 suffix = "",
}: {
 label: string;
 value: number;
 total: number;
 color?: string;
 suffix?: string;
}) {
 const ratio = total > 0 ? (value / total) * 100 : 0;

 return (
 <div style={{ marginBottom: 12 }}>
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 gap: 12,
 marginBottom: 6,
 fontSize: 12,
 color: "#334155",
 }}
 >
 <span>{label}</span>
 <span>
 {Math.round(value).toLocaleString()}
 {suffix} · {ratio.toFixed(0)}%
 </span>
 </div>

 <div
 style={{
 height: 10,
 borderRadius: 999,
 background: "#e2e8f0",
 overflow: "hidden",
 }}
 >
 <div
 style={{
 width: `${Math.max(4, ratio)}%`,
 height: "100%",
 background: color,
 }}
 />
 </div>
 </div>
 );
}

function StatDonut({
 value,
 total,
 title,
 subtitle,
 color = "#0ea5e9",
}: {
 value: number;
 total: number;
 title: string;
 subtitle?: string;
 color?: string;
}) {
 const ratio = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
 const angle = (ratio / 100) * 360;

 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "#fff",
 padding: 16,
 }}
 >
 <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{title}</div>

 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 16,
 }}
 >
 <div
 style={{
 width: 92,
 height: 92,
 borderRadius: "50%",
 background: `conic-gradient(${color} 0deg ${angle}deg, #e2e8f0 ${angle}deg 360deg)`,
 display: "grid",
 placeItems: "center",
 flexShrink: 0,
 }}
 >
 <div
 style={{
 width: 58,
 height: 58,
 borderRadius: "50%",
 background: "#fff",
 display: "grid",
 placeItems: "center",
 fontSize: 14,
 fontWeight: 900,
 color: "#0f172a",
 }}
 >
 {ratio.toFixed(0)}%
 </div>
 </div>

 <div style={{ minWidth: 0 }}>
 <div
 style={{
 fontSize: 22,
 fontWeight: 900,
 color: "#0f172a",
 lineHeight: 1.2,
 }}
 >
 {Math.round(value).toLocaleString()}
 </div>
 {subtitle ? (
 <div
 style={{
 marginTop: 6,
 fontSize: 11,
 lineHeight: 1.7,
 color: "#64748b",
 }}
 >
 {subtitle}
 </div>
 ) : null}
 </div>
 </div>
 </div>
 );
}

function HighlightList({
 title,
 items,
}: {
 title: string;
 items: Array<{ label: string; value: React.ReactNode }>;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "#fff",
 padding: 18,
 }}
 >
 <div
 style={{
 fontSize: 14,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 12,
 }}
 >
 {title}
 </div>

 <div style={{ display: "grid", gap: 10 }}>
 {items.map((item, index) => (
 <div
 key={`${item.label}-${index}`}
 style={{
 display: "flex",
 justifyContent: "space-between",
 gap: 12,
 paddingBottom: 10,
 borderBottom: index === items.length - 1 ? "none" : "1px solid #eef2f7",
 fontSize: 12,
 color: "#334155",
 }}
 >
 <span style={{ color: "#64748b" }}>{item.label}</span>
 <span style={{ fontWeight: 800, color: "#0f172a", textAlign: "right" }}>
 {item.value}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
}

function Page({
 pageNo,
 title,
 chapter,
 children,
 projectName,
 date,
 compact = false,
}: {
 pageNo: number;
 title?: string;
 chapter?: string;
 children: React.ReactNode;
 projectName: string;
 date: string;
 compact?: boolean;
}) {
 return (
 <section
 data-report-page="true"
 style={{
 width: PAGE_WIDTH,
 minHeight: PAGE_MIN_HEIGHT,
 background: "#ffffff",
 color: "#0f172a",
 padding: PAGE_INNER_PADDING,
 border: "1px solid #dbe4ee",
 borderRadius: 20,
 boxSizing: "border-box",
 display: "flex",
 flexDirection: "column",
 justifyContent: "space-between",
 pageBreakAfter: "always",
 breakAfter: "page",
 marginBottom: 24,
 }}
 >
 <div>
 <HeaderBar projectName={projectName} chapter={chapter} />

 {title ? (
 <div
 style={{
 display: "flex",
 alignItems: "flex-end",
 justifyContent: "space-between",
 gap: 16,
 marginBottom: compact ? 14 : 18,
 paddingBottom: 8,
 borderBottom: "2px solid #dbe4ee",
 }}
 >
 <div
 style={{
 fontSize: 22,
 fontWeight: 800,
 color: "#0f172a",
 letterSpacing: 0.2,
 }}
 >
 {title}
 </div>

 <div
 style={{
 fontSize: 11,
 fontWeight: 700,
 color: "#64748b",
 letterSpacing: 1,
 textTransform: "uppercase",
 }}
 >
 {String(pageNo).padStart(2, "0")}
 </div>
 </div>
 ) : null}

 {children}
 </div>

 <FooterBar pageNo={pageNo} date={date} projectName={projectName} />
 </section>
 );
}

function BlockTitle({
 children,
 noMargin = false,
}: {
 children: React.ReactNode;
 noMargin?: boolean;
}) {
 return (
 <div
 style={{
 fontSize: 14,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 12,
 marginTop: noMargin ? 0 : 4,
 }}
 >
 {children}
 </div>
 );
}

function SmallCard({
 label,
 value,
}: {
 label: string;
 value: React.ReactNode;
}) {
 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 12,
 padding: "12px 14px",
 background: "#ffffff",
 }}
 >
 <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
 <div
 style={{
 marginTop: 6,
 fontSize: 16,
 fontWeight: 700,
 color: "#0f172a",
 lineHeight: 1.4,
 }}
 >
 {value}
 </div>
 </div>
 );
}

function RoomStats(result: HouseDesignPackage) {
 const rooms = result.floorPlans.flatMap((floor) => floor.rooms);
 const total = rooms.reduce((sum, room) => sum + room.area, 0) || 1;

 const groups = [
 {
 label: "起居公共",
 area: rooms
 .filter(
 (room) =>
 room.nameZh.includes("客厅") ||
 room.nameZh.includes("家庭厅") ||
 room.nameZh.includes("餐厅") ||
 room.nameZh.includes("玄关"),
 )
 .reduce((sum, room) => sum + room.area, 0),
 },
 {
 label: "卧室套房",
 area: rooms
 .filter((room) => room.nameZh.includes("卧") || room.nameZh.includes("套房"))
 .reduce((sum, room) => sum + room.area, 0),
 },
 {
 label: "厨卫洗衣",
 area: rooms
 .filter(
 (room) =>
 room.nameZh.includes("厨房") ||
 room.nameZh.includes("卫") ||
 room.nameZh.includes("淋浴") ||
 room.nameZh.includes("洗衣"),
 )
 .reduce((sum, room) => sum + room.area, 0),
 },
 {
 label: "专项功能",
 area: rooms
 .filter(
 (room) =>
 room.nameZh.includes("书房") ||
 room.nameZh.includes("衣帽间") ||
 room.nameZh.includes("家庭影院") ||
 room.nameZh.includes("影音"),
 )
 .reduce((sum, room) => sum + room.area, 0),
 },
 ];

 return { total, groups };
}

function normalizeAxis(axis: AxisLine[] | undefined) {
 return (axis ?? [])
 .map((item, index) => ({
 id: item.id ?? `axis_${index + 1}`,
 label: item.label || `${index + 1}`,
 value: num(item.value, 0),
 }))
 .sort((a, b) => a.value - b.value);
}

function findAxisBoundaryLabels(
 start: number,
 end: number,
 axis: Array<{ label: string; value: number }>,
) {
 if (!axis.length) {
 return { startLabel: "-", endLabel: "-" };
 }

 let startIndex = 0;
 for (let i = 0; i < axis.length; i += 1) {
 if (axis[i].value <= start) {
 startIndex = i;
 }
 }

 let endIndex = axis.length - 1;
 for (let i = 0; i < axis.length - 1; i += 1) {
 if (end > axis[i].value && end <= axis[i + 1].value) {
 endIndex = i + 1;
 break;
 }
 }

 if (end <= axis[0].value) endIndex = 0;
 if (end > axis[axis.length - 1].value) endIndex = axis.length - 1;

 startIndex = Math.max(0, Math.min(startIndex, axis.length - 1));
 endIndex = Math.max(0, Math.min(endIndex, axis.length - 1));

 return {
 startLabel: axis[startIndex]?.label || "-",
 endLabel: axis[endIndex]?.label || "-",
 };
}

function getRoomGridLocation(
 room: RoomItem,
 axisX: AxisLine[] | undefined,
 axisY: AxisLine[] | undefined,
) {
 const bounds = room.geometry?.bounds;
 if (!bounds) return "-";

 const safeAxisX = normalizeAxis(axisX);
 const safeAxisY = normalizeAxis(axisY);

 const xStart = num(bounds.x);
 const xEnd = num(bounds.x) + num(bounds.width);
 const yStart = num(bounds.y);
 const yEnd = num(bounds.y) + num(bounds.height);

 const xRange = findAxisBoundaryLabels(xStart, xEnd, safeAxisX);
 const yRange = findAxisBoundaryLabels(yStart, yEnd, safeAxisY);

 return `${xRange.startLabel}-${xRange.endLabel} / ${yRange.startLabel}-${yRange.endLabel}`;
}

function buildRoomSchedule(result: HouseDesignPackage) {
 const floors = result.floorplans ?? [];

 return floors.flatMap((floor) => {
 return (floor.rooms ?? []).map((room, index) => ({
 floor: floor.titleZh || `第${floor.floor}层`,
 code: room.code || `R${String(index + 1).padStart(2, "0")}`,
 nameZh: room.nameZh,
 nameEn: room.nameEn,
 area: room.area,
 axisRef: getRoomGridLocation(room, floor.axisX, floor.axisY),
 }));
 });
}

function MaterialSimpleTable({
 title,
 items,
 currency,
}: {
 title: string;
 items: MaterialItem[];
 currency: "EUR" | "USD" | "CNY";
}) {
 const safeItems = items ?? [];

 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 12,
 overflow: "hidden",
 background: "#fff",
 }}
 >
 <div
 style={{
 background: "#f8fafc",
 padding: "10px 14px",
 fontWeight: 700,
 fontSize: 13,
 color: "#0f172a",
 borderBottom: "1px solid #dbe4ee",
 }}
 >
 {title}
 </div>
 <div>
 {safeItems.map((item, index) => (
 <div
 key={`${item.name}-${index}`}
 style={{
 padding: "10px 14px",
 borderBottom:
 index === safeItems.length - 1 ? "none" : "1px solid #eef2f7",
 }}
 >
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 gap: 12,
 alignItems: "flex-start",
 }}
 >
 <div>
 <div
 style={{
 fontSize: 13,
 fontWeight: 600,
 color: "#0f172a",
 }}
 >
 {item.name}
 </div>
 <div
 style={{
 marginTop: 4,
 fontSize: 11,
 color: "#64748b",
 }}
 >
 {item.specification}
 </div>
 </div>
 <div
 style={{
 fontSize: 12,
 color: "#334155",
 textAlign: "right",
 whiteSpace: "nowrap",
 }}
 >
 {currency} {Math.round(num(item.totalPrice)).toLocaleString()}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function DoorWindowSchedule({
 rows,
}: {
 rows: ReturnType<typeof buildDoorWindowSchedule>;
}) {
 const safeRows = rows ?? [];

 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 overflow: "hidden",
 background: "#fff",
 }}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "110px 1.2fr 1.1fr 90px 1.4fr",
 background: "#f8fafc",
 borderBottom: "1px solid #dbe4ee",
 fontSize: 12,
 fontWeight: 700,
 color: "#0f172a",
 }}
 >
 {["编号", "类别", "估算尺寸", "数量", "备注"].map((cell) => (
 <div key={cell} style={{ padding: "12px 14px" }}>
 {cell}
 </div>
 ))}
 </div>

 {safeRows.map((row, index) => (
 <div
 key={`${row.kind}-${row.code}-${index}`}
 style={{
 display: "grid",
 gridTemplateColumns: "110px 1.2fr 1.1fr 90px 1.4fr",
 borderBottom: index === safeRows.length - 1 ? "none" : "1px solid #eef2f7",
 fontSize: 12,
 color: "#334155",
 }}
 >
 <div style={{ padding: "12px 14px", fontWeight: 700, color: "#0369a1" }}>
 {row.code}
 </div>
 <div style={{ padding: "12px 14px" }}>{row.type}</div>
 <div style={{ padding: "12px 14px" }}>{row.size}</div>
 <div style={{ padding: "12px 14px" }}>{row.qty}</div>
 <div style={{ padding: "12px 14px" }}>{row.note}</div>
 </div>
 ))}
 </div>
 );
}

function RoomScheduleTable({
 rows,
}: {
 rows: ReturnType<typeof buildRoomSchedule>;
}) {
 const safeRows = rows ?? [];

 return (
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 overflow: "hidden",
 background: "#fff",
 }}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "120px 120px 1.25fr 1.25fr 90px 150px",
 background: "#f8fafc",
 borderBottom: "1px solid #dbe4ee",
 fontSize: 12,
 fontWeight: 700,
 color: "#0f172a",
 }}
 >
 {["楼层", "房间编号", "中文名", "English", "面积", "轴网定位"].map((cell) => (
 <div key={cell} style={{ padding: "12px 14px" }}>
 {cell}
 </div>
 ))}
 </div>

 {safeRows.map((row, index) => (
 <div
 key={`${row.floor}-${row.code}-${index}`}
 style={{
 display: "grid",
 gridTemplateColumns: "120px 120px 1.25fr 1.25fr 90px 150px",
 borderBottom: index === safeRows.length - 1 ? "none" : "1px solid #eef2f7",
 fontSize: 12,
 color: "#334155",
 }}
 >
 <div style={{ padding: "12px 14px" }}>{row.floor}</div>
 <div style={{ padding: "12px 14px", fontWeight: 700, color: "#0369a1" }}>
 {row.code}
 </div>
 <div style={{ padding: "12px 14px" }}>{row.nameZh}</div>
 <div style={{ padding: "12px 14px" }}>{row.nameEn}</div>
 <div style={{ padding: "12px 14px" }}>{row.area}㎡</div>
 <div style={{ padding: "12px 14px", fontWeight: 700 }}>{row.axisRef}</div>
 </div>
 ))}
 </div>
 );
}

export default function PrintableDesignReport({ result }: Props) {
 const today = new Date().toISOString().slice(0, 10);
 const roomStats = RoomStats(result);
 const floorPages = result.floorplans ?? [];
 const roomRows = buildRoomSchedule(result);
 const doorWindowRows = buildDoorWindowSchedule(result);

 const reportVersion = "V1.0";
 const reportStage = "Concept Design";
 const projectCode = `DB-${today.replace(/-/g, "")}-${String(
 Math.round(num(result.site.buildAreaTarget)),
 ).padStart(3, "0")}`;
 const preparedBy = "DreamBuilder Design Studio";

 const ROOM_ROWS_PER_PAGE = 18;
 const DOOR_WINDOW_ROWS_PER_PAGE = 20;

 const roomRowPages = paginateRows(roomRows, ROOM_ROWS_PER_PAGE);
 const doorWindowRowPages = paginateRows(
 doorWindowRows,
 DOOR_WINDOW_ROWS_PER_PAGE,
 );

 const targetBudget = num(result.preferences.totalBudget);
 const actualBudget = num(result.budget.totalCost);
 const budgetGap = actualBudget - targetBudget;
 const budgetGapAbs = Math.abs(budgetGap);
 const budgetGapRatio =
 targetBudget > 0 ? Math.round((budgetGap / targetBudget) * 100) : 0;

 const maxBudgetItem = getMaxBudgetItem(result.budget.breakdown);

 const materialTotals = {
 structure: sumMaterial(result.materials.structure),
 facade: sumMaterial(result.materials.facade),
 roof: sumMaterial(result.materials.roof),
 doorsWindows: sumMaterial(result.materials.doorsWindows),
 interior: sumMaterial(result.materials.interior),
 mep: sumMaterial(result.materials.mep),
 };

 const totalMaterialValue =
 materialTotals.structure +
 materialTotals.facade +
 materialTotals.roof +
 materialTotals.doorsWindows +
 materialTotals.interior +
 materialTotals.mep;

 let pageNo = 1;
 const coverPageNo = pageNo++;
 const summaryPageNo = pageNo++;

 return (
 <div
 id="design-report-print-root"
 style={{
 width: PAGE_WIDTH,
 background: "#ffffff",
 color: "#0f172a",
 fontFamily:
 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
 }}
 >
 <Page
 pageNo={coverPageNo}
 projectName={result.projectName}
 date={today}
 chapter="Cover"
 >
 <div
 style={{
 minHeight: PAGE_MIN_HEIGHT - PAGE_INNER_PADDING * 2 - 120,
 display: "grid",
 gridTemplateRows: "auto auto 1fr auto",
 gap: 26,
 padding: 8,
 boxSizing: "border-box",
 background:
 "linear-gradient(180deg, #ffffff 0%, #f8fbff 48%, #eef7ff 100%)",
 borderRadius: 16,
 }}
 >
 <div>
 <div
 style={{
 display: "inline-flex",
 alignItems: "center",
 gap: 10,
 padding: "7px 14px",
 fontSize: 12,
 fontWeight: 700,
 color: "#0369a1",
 background: "#e0f2fe",
 borderRadius: 999,
 }}
 >
 <span>DreamBuilder Professional Report</span>
 <span
 style={{
 display: "inline-block",
 width: 4,
 height: 4,
 borderRadius: 999,
 background: "#38bdf8",
 }}
 />
 <span>{reportStage}</span>
 </div>

 <div
 style={{
 marginTop: 34,
 maxWidth: 820,
 }}
 >
 <div
 style={{
 fontSize: 14,
 fontWeight: 700,
 color: "#64748b",
 letterSpacing: 1.2,
 textTransform: "uppercase",
 }}
 >
 Residential Concept Package
 </div>

 <div
 style={{
 marginTop: 16,
 fontSize: 48,
 lineHeight: 1.12,
 fontWeight: 900,
 color: "#0f172a",
 letterSpacing: -0.8,
 }}
 >
 {result.projectName}
 </div>

 <div
 style={{
 marginTop: 20,
 fontSize: 18,
 color: "#475569",
 lineHeight: 1.85,
 maxWidth: 860,
 }}
 >
 专业住宅方案书 · 含平面布局、立面设计、剖面关系、房间编号表、门窗编号联动表、
 预算概算与材料建议，用于概念方案展示、客户沟通及后续深化设计前期准备。
 </div>
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
 gap: 14,
 }}
 >
 <CoverMetaCard label="项目编号 Project Code" value={projectCode} />
 <CoverMetaCard label="版本 Version" value={reportVersion} />
 <CoverMetaCard label="报告阶段 Stage" value={reportStage} />
 <CoverMetaCard label="报告日期 Date" value={today} />
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.25fr 1fr",
 gap: 20,
 alignItems: "stretch",
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "rgba(255,255,255,0.94)",
 padding: 22,
 }}
 >
 <div
 style={{
 fontSize: 15,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 14,
 }}
 >
 项目概览 Project Overview
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
 gap: 14,
 }}
 >
 <CoverMetaCard
 label="项目地点 Location"
 value={`${text(result.site.city)}, ${text(result.site.country)}`}
 />
 <CoverMetaCard
 label="目标建面 Gross Floor Area"
 value={`${Math.round(num(result.site.buildAreaTarget))}㎡`}
 />
 <CoverMetaCard
 label="建筑层数 Floors"
 value={`${Math.round(num(result.site.floors))} 层`}
 />
 <CoverMetaCard
 label="用地面积 Plot Area"
 value={`${Math.round(num(result.site.plotArea))}㎡`}
 />
 <CoverMetaCard
 label="建筑风格 Style"
 value={text(result.style.architecturalStyle)}
 />
 <CoverMetaCard
 label="屋顶形式 Roof Type"
 value={text(result.style.roofType)}
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateRows: "1fr auto",
 gap: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "rgba(255,255,255,0.94)",
 padding: 22,
 }}
 >
 <div
 style={{
 fontSize: 15,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 12,
 }}
 >
 文件说明 Document Notes
 </div>
 <div
 style={{
 fontSize: 13,
 lineHeight: 1.95,
 color: "#475569",
 }}
 >
 本文件为住宅概念设计方案书，当前版本以空间组织、风格控制、
 平立剖联动、门窗编号联动、预算与材料策略为主，适用于前期方案比选、
 客户沟通和设计任务书编制。
 </div>
 </div>

 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "rgba(255,255,255,0.94)",
 padding: 22,
 }}
 >
 <div
 style={{
 fontSize: 15,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 12,
 }}
 >
 签发信息 Issue Information
 </div>

 <div
 style={{
 display: "grid",
 gap: 10,
 }}
 >
 <div style={{ fontSize: 12, color: "#64748b" }}>
 编制 Prepared by
 </div>
 <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
 {preparedBy}
 </div>

 <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
 文件性质 Document Type
 </div>
 <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
 Concept Residential Report
 </div>
 </div>
 </div>
 </div>
 </div>

 <div
 style={{
 fontSize: 12,
 color: "#64748b",
 display: "flex",
 justifyContent: "space-between",
 alignItems: "center",
 }}
 >
 <span>Prepared by {preparedBy}</span>
 <span>
 Project Code: {projectCode} · Version: {reportVersion}
 </span>
 </div>
 </div>
 </Page>

 <Page
 pageNo={summaryPageNo}
 title="1. 执行摘要 Executive Summary"
 chapter="Summary"
 projectName={result.projectName}
 date={today}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.15fr 0.85fr",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "#fff",
 padding: 20,
 }}
 >
 <BlockTitle noMargin>摘要概述 Summary Narrative</BlockTitle>
 <div
 style={{
 marginTop: 8,
 fontSize: 13,
 lineHeight: 1.95,
 color: "#334155",
 }}
 >
 {result.summaryZh}
 </div>

 <div
 style={{
 marginTop: 18,
 paddingTop: 16,
 borderTop: "1px solid #e2e8f0",
 }}
 >
 <div
 style={{
 fontSize: 13,
 fontWeight: 800,
 color: "#0f172a",
 marginBottom: 8,
 }}
 >
 English Executive Summary
 </div>
 <div
 style={{
 fontSize: 13,
 lineHeight: 1.95,
 color: "#475569",
 }}
 >
 {result.summaryEn}
 </div>
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gap: 14,
 }}
 >
 <InsightCard
 title="目标建面 Gross Floor Area"
 value={`${Math.round(num(result.site.buildAreaTarget))}㎡`}
 note="用于平面组织、预算估算与材料策略的基础控制指标。"
 />
 <InsightCard
 title="建筑层数 Floors"
 value={`${Math.round(num(result.site.floors))} 层`}
 note="影响平面组织、立面体量、剖面关系与机电系统配置。"
 />
 <InsightCard
 title="预算等级 Budget Level"
 value={text(result.preferences.budgetLevel)}
 note="决定材料系统与构造建议的基础配置级别。"
 />
 <InsightCard
 title="目标预算 Target Budget"
 value={
 <Money
 value={num(result.preferences.totalBudget)}
 currency={result.preferences.currency}
 />
 }
 note="作为当前方案概算控制与后续优化判断的参考基线。"
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
 gap: 12,
 marginBottom: 18,
 }}
 >
 <SummaryPill
 label="项目地点 Location"
 value={`${text(result.site.city)}, ${text(result.site.country)}`}
 />
 <SummaryPill
 label="常住人数 Residents"
 value={`${Math.round(num(result.requirements.residents))} 人`}
 />
 <SummaryPill
 label="建筑风格 Style"
 value={text(result.style.architecturalStyle)}
 />
 <SummaryPill
 label="屋顶形式 Roof Type"
 value={text(result.style.roofType)}
 />
 <SummaryPill
 label="卧室 Bedrooms"
 value={Math.round(num(result.requirements.bedrooms))}
 />
 <SummaryPill
 label="卫生间 Bathrooms"
 value={Math.round(num(result.requirements.bathrooms))}
 />
 <SummaryPill
 label="书房 Study"
 value={result.requirements.needStudy ? "有" : "无"}
 />
 <SummaryPill
 label="车库 Garage"
 value={result.requirements.needGarage ? "有" : "无"}
 />
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
 gap: 16,
 marginBottom: 18,
 }}
 >
 <ExecutivePoint
 title="核心判断 Key Observation"
 text="本方案以居住功能完整性、空间组织清晰度与预算可控性为核心，已建立平、立、剖及表格联动的完整概念设计输出框架。"
 />
 <ExecutivePoint
 title="设计策略 Design Direction"
 text={`方案围绕 ${text(result.style.architecturalStyle)} 风格展开，结合 ${text(result.site.terrain)} 地形和 ${text(result.site.orientation)} 朝向，对采光、私密性与动线效率进行了平衡处理。`}
 />
 <ExecutivePoint
 title="实施建议 Implementation"
 text="建议下一阶段进一步深化平面逻辑、墙体系统、门窗附着关系与构件级造价逻辑，使当前概念方案逐步过渡到更接近施工图和工程量清单的体系。"
 />
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1fr 1fr",
 gap: 16,
 }}
 >
 <ExecutivePoint
 title="功能需求快照 Requirement Snapshot"
 text={`当前需求包含卧室 ${Math.round(num(result.requirements.bedrooms))} 间、卫生间 ${Math.round(num(result.requirements.bathrooms))} 间、淋浴间 ${Math.round(num(result.requirements.showerRooms))} 间、浴缸卫浴 ${Math.round(num(result.requirements.bathtubBathrooms))} 间，另包含衣帽间 ${Math.round(num(result.requirements.walkInClosets))} 个、家庭影院 ${Math.round(num(result.requirements.homeTheaters))} 个。`}
 />
 <ExecutivePoint
 title="系统预留与舒适性 Systems & Comfort"
 text={`太阳能：${result.preferences.needSolar ? "是" : "否"}；地暖：${result.preferences.needFloorHeating ? "是" : "否"}；新风：${result.preferences.needFreshAirSystem ? "是" : "否"}；智能家居：${result.preferences.needSmartHome ? "是" : "否"}。`}
 />
 </div>

 <DocumentInfoBar
 title="执行摘要 Executive Summary"
 code="SUM-01"
 chapter="Summary"
 pageNo={summaryPageNo}
 date={today}
 projectName={result.projectName}
 stage="Concept Design"
 preparedBy="DreamBuilder AI"
 reviewedBy="Design Studio"
 />
 </Page>

 {floorPages.map((floor) => {
 const currentPageNo = pageNo++;
 return (
 <Page
 key={`floor-page-${floor.floor}`}
 pageNo={currentPageNo}
 title={`${text(
 floor.titleZh,
 `第${Math.round(num(floor.floor))}层平面图`,
 )}${floor.titleEn ? ` · ${floor.titleEn}` : ""}`}
 chapter="Drawings"
 projectName={result.projectName}
 date={today}
 compact
 >
 <PrintableFloorplanSheet
 floor={floor}
 language={result.language}
 drawingTitle={text(floor.titleZh, "平面图 Floor Plan")}
 />

 <SheetTitleBlock
 drawingTitle={text(floor.titleZh, "平面图 Floor Plan")}
 drawingCode={`A-${String(Math.round(num(floor.floor))).padStart(2, "0")}`}
 scale="1:100"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 discipline="Architecture"
 stage="Concept Design"
 designedBy="DreamBuilder AI"
 checkedBy="Design Studio"
 projectCode={`DB-PLAN-${String(Math.round(num(floor.floor))).padStart(2, "0")}`}
 />
 </Page>
 );
 })}

 {(() => {
 const currentPageNo = pageNo++;
 return (
 <Page
 pageNo={currentPageNo}
 title="3. 立面图 Elevation"
 chapter="Drawings"
 projectName={result.projectName}
 date={today}
 compact
 >
 <PrintableElevationSheet
 result={result}
 drawingTitle="建筑立面图 Elevation"
 />

 <SheetTitleBlock
 drawingTitle="建筑立面图 Elevation"
 drawingCode="E-01"
 scale="1:100"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 discipline="Architecture"
 stage="Concept Design"
 designedBy="DreamBuilder AI"
 checkedBy="Design Studio"
 projectCode="DB-ELEV-01"
 />
 </Page>
 );
 })()}

 {(() => {
 const currentPageNo = pageNo++;
 return (
 <Page
 pageNo={currentPageNo}
 title="4. 剖面图 Section"
 chapter="Drawings"
 projectName={result.projectName}
 date={today}
 compact
 >
 <PrintableSectionSheet
 result={result}
 drawingTitle="建筑剖面图 Section"
 />

 <SheetTitleBlock
 drawingTitle="建筑剖面图 Section"
 drawingCode="S-01"
 scale="1:100"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 discipline="Architecture"
 stage="Concept Design"
 designedBy="DreamBuilder AI"
 checkedBy="Design Studio"
 projectCode="DB-SECT-01"
 />
 </Page>
 );
 })()}

 {roomRowPages.map((pageRows, pageIndex) => {
 const currentPageNo = pageNo++;
 return (
 <Page
 key={`room-schedule-page-${pageIndex}`}
 pageNo={currentPageNo}
 title={
 pageIndex === 0
 ? "5. 房间编号表 Room Schedule"
 : "5. 房间编号表 Room Schedule（续）"
 }
 chapter="Schedules"
 projectName={result.projectName}
 date={today}
 >
 {pageIndex === 0 ? (
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1fr 280px",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 }}
 >
 <BlockTitle noMargin>表格说明</BlockTitle>
 <div style={{ fontSize: 12, lineHeight: 1.85, color: "#475569" }}>
 本表列示所有楼层房间编号、面积与轴网定位。轴网定位根据房间真实几何边界与平面图轴网坐标自动计算，可与图面中的房间编号和房间位置对应校核。
 </div>
 </div>

 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 }}
 >
 <BlockTitle noMargin>统计摘要</BlockTitle>
 <div style={{ display: "grid", gap: 10 }}>
 <SmallCard label="总房间数" value={roomRows.length} />
 <SmallCard label="楼层数" value={floorPages.length} />
 <SmallCard label="本页行数" value={pageRows.length} />
 </div>
 </div>
 </div>
 ) : (
 <div
 style={{
 marginBottom: 18,
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 fontSize: 12,
 color: "#475569",
 }}
 >
 房间编号表续页 · 当前为第 {pageIndex + 1} 页，共{" "}
 {roomRowPages.length} 页。
 </div>
 )}

 <>
 <RoomScheduleTable rows={pageRows} />
 <DocumentInfoBar
 title={
 pageIndex === 0
 ? "房间编号表 Room Schedule"
 : "房间编号表续页 Room Schedule Continued"
 }
 code={`SCH-R-${String(pageIndex + 1).padStart(2, "0")}`}
 chapter="Schedules"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 stage="Concept Design"
 preparedBy="DreamBuilder AI"
 reviewedBy="Design Studio"
 />
 </>
 </Page>
 );
 })}

 {doorWindowRowPages.map((pageRows, pageIndex) => {
 const currentPageNo = pageNo++;
 return (
 <Page
 key={`door-window-schedule-page-${pageIndex}`}
 pageNo={currentPageNo}
 title={
 pageIndex === 0
 ? "6. 门窗表 Door & Window Schedule"
 : "6. 门窗表 Door & Window Schedule（续）"
 }
 chapter="Schedules"
 projectName={result.projectName}
 date={today}
 >
 {pageIndex === 0 ? (
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1fr 280px",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 }}
 >
 <BlockTitle noMargin>表格说明</BlockTitle>
 <div style={{ fontSize: 12, lineHeight: 1.85, color: "#475569" }}>
 本表用于汇总门窗编号、类别、估算尺寸与备注说明，和对应平面图、立面图、剖面图中的门窗编号相互联动。
 </div>
 </div>

 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 }}
 >
 <BlockTitle noMargin>统计摘要</BlockTitle>
 <div style={{ display: "grid", gap: 10 }}>
 <SmallCard label="总门窗数" value={doorWindowRows.length} />
 <SmallCard
 label="门数量"
 value={
 doorWindowRows.filter((item) => item.kind === "door")
 .length
 }
 />
 <SmallCard
 label="窗数量"
 value={
 doorWindowRows.filter((item) => item.kind === "window")
 .length
 }
 />
 <SmallCard label="本页行数" value={pageRows.length} />
 </div>
 </div>
 </div>
 ) : (
 <div
 style={{
 marginBottom: 18,
 border: "1px solid #dbe4ee",
 borderRadius: 14,
 background: "#fff",
 padding: 16,
 fontSize: 12,
 color: "#475569",
 }}
 >
 门窗表续页 · 当前为第 {pageIndex + 1} 页，共{" "}
 {doorWindowRowPages.length} 页。
 </div>
 )}

 <>
 <DoorWindowSchedule rows={pageRows} />
 <DocumentInfoBar
 title={
 pageIndex === 0
 ? "门窗表 Door & Window Schedule"
 : "门窗表续页 Door & Window Schedule Continued"
 }
 code={`SCH-DW-${String(pageIndex + 1).padStart(2, "0")}`}
 chapter="Schedules"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 stage="Concept Design"
 preparedBy="DreamBuilder AI"
 reviewedBy="Design Studio"
 />
 </>
 </Page>
 );
 })}

 {(() => {
 const currentPageNo = pageNo++;
 return (
 <Page
 pageNo={currentPageNo}
 title="7. 面积分析与预算 Area Analysis & Budget"
 chapter="Cost Analysis"
 projectName={result.projectName}
 date={today}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.2fr 0.8fr",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 padding: 18,
 background: "#fff",
 }}
 >
 <BlockTitle noMargin>面积占比 Area Distribution</BlockTitle>
 <div
 style={{
 marginTop: 8,
 fontSize: 12,
 lineHeight: 1.8,
 color: "#64748b",
 marginBottom: 14,
 }}
 >
 基于当前房间面积统计，对公共起居、卧室套房、厨卫洗衣与专项功能空间进行面积结构分析。
 </div>

 {roomStats.groups.map((item) => (
 <MiniBarRow
 key={item.label}
 label={item.label}
 value={item.area}
 total={roomStats.total}
 color="#0ea5e9"
 suffix="㎡"
 />
 ))}
 </div>

 <div
 style={{
 display: "grid",
 gap: 14,
 }}
 >
 <InsightCard
 title="总预算 Total Budget"
 value={
 <Money value={actualBudget} currency={result.budget.currency} />
 }
 note="当前概算为系统基于面积、风格、地形与机电配置的综合估算。"
 />

 <InsightCard
 title="目标预算 Target Budget"
 value={
 <Money
 value={targetBudget}
 currency={result.preferences.currency}
 />
 }
 note="用户输入的目标预算，用于与当前概算进行偏差比较。"
 />

 <InsightCard
 title="预算偏差 Budget Gap"
 value={
 <>
 {budgetGap >= 0 ? "+" : "-"}
 {result.budget.currency}{" "}
 {Math.round(budgetGapAbs).toLocaleString()}
 </>
 }
 note={`相对目标预算偏差约 ${Math.abs(budgetGapRatio)}%`}
 />

 <InsightCard
 title="最高占比项 Top Cost Driver"
 value={maxBudgetItem ? maxBudgetItem.labelZh : "-"}
 note={
 maxBudgetItem
 ? `${result.budget.currency} ${Math.round(num(maxBudgetItem.value)).toLocaleString()}`
 : undefined
 }
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1fr 320px",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 padding: 18,
 background: "#fff",
 }}
 >
 <BlockTitle noMargin>预算分项 Budget Breakdown</BlockTitle>
 <div
 style={{
 marginTop: 8,
 fontSize: 12,
 lineHeight: 1.8,
 color: "#64748b",
 marginBottom: 14,
 }}
 >
 下列预算构成为当前概念阶段参考值，可作为方案比选、配置调整及后续深化估算的依据。
 </div>

 {(result.budget.breakdown ?? []).map((item, index) => {
 const palette = [
 "#0ea5e9",
 "#22c55e",
 "#f59e0b",
 "#8b5cf6",
 "#ef4444",
 "#14b8a6",
 "#64748b",
 ];
 return (
 <MiniBarRow
 key={item.key}
 label={item.labelZh}
 value={item.value}
 total={actualBudget}
 color={palette[index % palette.length]}
 />
 );
 })}
 </div>

 <div
 style={{
 display: "grid",
 gap: 14,
 }}
 >
 <StatDonut
 title="预算占目标比 Budget vs Target"
 value={actualBudget}
 total={targetBudget || actualBudget}
 color={budgetGap > 0 ? "#ef4444" : "#22c55e"}
 subtitle="当前概算相对于目标预算的占比情况"
 />

 <HighlightList
 title="关键指标 Key Figures"
 items={[
 {
 label: "单方造价 Cost per sqm",
 value: (
 <>
 <Money
 value={result.budget.costPerSqm}
 currency={result.budget.currency}
 />{" "}
 /㎡
 </>
 ),
 },
 {
 label: "预算等级 Budget Level",
 value: text(result.preferences.budgetLevel),
 },
 {
 label: "建筑面积 GFA",
 value: `${Math.round(num(result.site.buildAreaTarget))}㎡`,
 },
 {
 label: "常住人数 Residents",
 value: `${Math.round(num(result.requirements.residents))} 人`,
 },
 ]}
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
 gap: 16,
 }}
 >
 <StrategyNote
 title="造价判断"
 text={
 budgetGap > 0
 ? `当前概算高于目标预算，建议优先优化高占比分项，重点关注 ${maxBudgetItem?.labelZh ?? "主要成本项"}、门窗标准及机电配置。`
 : `当前概算未超过目标预算，说明现阶段方案在预算控制上较为稳健，可进一步提升局部材料等级或改善专项功能品质。`
 }
 />
 <StrategyNote
 title="优化建议"
 text="若需控制总造价，建议优先优化外立面材料组合、门窗系统等级、智能家居与舒适性设备配置，并控制非核心专项功能面积。"
 />
 <StrategyNote
 title="后续深化"
 text="进入深化设计后，可基于墙体、门窗、饰面、设备与构件清单形成更接近 BIM/工程量清单逻辑的分项精算。"
 />
 </div>

 <DocumentInfoBar
 title="面积分析与预算 Area Analysis & Budget"
 code="COST-01"
 chapter="Cost Analysis"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 stage="Concept Design"
 preparedBy="DreamBuilder AI"
 reviewedBy="Design Studio"
 />
 </Page>
 );
 })()}

 {(() => {
 const currentPageNo = pageNo++;
 return (
 <Page
 pageNo={currentPageNo}
 title="8. 材料建议 Material Recommendation"
 chapter="Material System"
 projectName={result.projectName}
 date={today}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1.1fr 0.9fr",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <div
 style={{
 border: "1px solid #dbe4ee",
 borderRadius: 18,
 background: "#fff",
 padding: 18,
 }}
 >
 <BlockTitle noMargin>材料系统总览 Material System Overview</BlockTitle>
 <div
 style={{
 marginTop: 8,
 fontSize: 12,
 lineHeight: 1.85,
 color: "#64748b",
 }}
 >
 本页汇总当前概念阶段的结构、围护、屋面、门窗、室内与机电系统材料建议，
 重点用于表达材料策略方向，而非施工采购级清单。
 </div>

 <div style={{ marginTop: 16 }}>
 <MiniBarRow
 label="结构系统 Structure"
 value={materialTotals.structure}
 total={totalMaterialValue}
 color="#0ea5e9"
 />
 <MiniBarRow
 label="外立面系统 Facade"
 value={materialTotals.facade}
 total={totalMaterialValue}
 color="#22c55e"
 />
 <MiniBarRow
 label="屋面系统 Roof"
 value={materialTotals.roof}
 total={totalMaterialValue}
 color="#f59e0b"
 />
 <MiniBarRow
 label="门窗系统 Doors & Windows"
 value={materialTotals.doorsWindows}
 total={totalMaterialValue}
 color="#8b5cf6"
 />
 <MiniBarRow
 label="室内系统 Interior"
 value={materialTotals.interior}
 total={totalMaterialValue}
 color="#ef4444"
 />
 <MiniBarRow
 label="机电系统 MEP"
 value={materialTotals.mep}
 total={totalMaterialValue}
 color="#14b8a6"
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gap: 14,
 }}
 >
 <InsightCard
 title="立面风格 Facade Style"
 value={text(result.style.architecturalStyle)}
 note="与屋顶形式、门窗风格和外墙材料共同构成整体外观表达。"
 />
 <InsightCard
 title="屋顶形式 Roof Type"
 value={text(result.style.roofType)}
 note="影响体量轮廓、排水逻辑与屋面材料系统选择。"
 />
 <InsightCard
 title="预算等级 Budget Level"
 value={text(result.preferences.budgetLevel)}
 note="决定材料系统建议的基础配置级别与价格带。"
 />
 <InsightCard
 title="外墙材料 Facade Materials"
 value={joinText(result.style.facadeMaterials)}
 note="当前外墙策略依据风格与预算等级给出组合建议。"
 />
 </div>
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <MaterialSimpleTable
 title="结构材料"
 items={result.materials.structure ?? []}
 currency={result.budget.currency}
 />
 <MaterialSimpleTable
 title="外立面材料"
 items={result.materials.facade ?? []}
 currency={result.budget.currency}
 />
 <MaterialSimpleTable
 title="屋面材料"
 items={result.materials.roof ?? []}
 currency={result.budget.currency}
 />
 <MaterialSimpleTable
 title="门窗材料"
 items={result.materials.doorsWindows ?? []}
 currency={result.budget.currency}
 />
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
 gap: 18,
 marginBottom: 18,
 }}
 >
 <MaterialSimpleTable
 title="室内材料"
 items={result.materials.interior ?? []}
 currency={result.budget.currency}
 />
 <MaterialSimpleTable
 title="机电系统"
 items={result.materials.mep ?? []}
 currency={result.budget.currency}
 />
 </div>

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "1fr 320px",
 gap: 18,
 }}
 >
 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
 gap: 16,
 }}
 >
 <StrategyNote
 title="关键结论 01"
 text="主体结构与围护系统构成材料策略基础，当前建议重在建立稳定、可深化、可控成本的技术框架。"
 />
 <StrategyNote
 title="关键结论 02"
 text="外立面与门窗系统是影响整体视觉风格与造价差异的核心部分，建议作为后续重点比选项。"
 />
 <StrategyNote
 title="关键结论 03"
 text="室内饰面与机电系统可根据预算等级分档推进，后续深化时适合进一步分解到品牌、规格和系统配置。"
 />
 </div>

 <HighlightList
 title="材料重点 Highlights"
 items={[
 {
 label: "外立面材料",
 value: joinText(result.style.facadeMaterials),
 },
 {
 label: "预算等级",
 value: text(result.preferences.budgetLevel),
 },
 {
 label: "屋顶形式",
 value: text(result.style.roofType),
 },
 {
 label: "风格方向",
 value: text(result.style.architecturalStyle),
 },
 ]}
 />
 </div>

 <DocumentInfoBar
 title="材料建议 Material Recommendation"
 code="MAT-01"
 chapter="Material System"
 pageNo={currentPageNo}
 date={today}
 projectName={result.projectName}
 stage="Concept Design"
 preparedBy="DreamBuilder AI"
 reviewedBy="Design Studio"
 />
 </Page>
 );
 })()}
 </div>
 );
}