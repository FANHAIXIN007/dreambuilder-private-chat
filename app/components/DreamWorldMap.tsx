"use client";

import React, { useMemo, useState } from "react";

type DreamWorldMapProps = {
 language: string;
 selectedPlotId: string;
 setSelectedPlotId: (plotId: string) => void;
 onEnterPlotDetail: (plotId: string) => void;
 needsAttention?: boolean;
};

type TooltipAlign = "left" | "right" | "top" | "bottom";

type IslandMasterZone = {
 id: string;
 terrainZh: string;
 terrainEn: string;
 nameZh: string;
 nameEn: string;
 descZh: string;
 descEn: string;
 suitableZh: string;
 suitableEn: string;
 points: string;
};

type TerrainType = "forest" | "city" | "cliff" | "plain" | "suburb";

type RarityType = "common" | "rare" | "epic";
type SaleStatus = "available" | "reserved" | "sold";

type PlotCell = {
 id: string;
 code: string;
 row: number;
 col: number;
 x: number;
 y: number;
 width: number;
 height: number;
 centerX: number;
 centerY: number;
 terrainType: TerrainType;
 terrainZh: string;
 terrainEn: string;
 nameZh: string;
 nameEn: string;
 suitableZh: string;
 suitableEn: string;
 rarity: RarityType;
 rarityZh: string;
 rarityEn: string;
 priceZh: string;
 priceEn: string;
 status: SaleStatus;
 statusZh: string;
 statusEn: string;
 descZh: string;
 descEn: string;
};

const VIEWBOX_WIDTH = 1024;
const VIEWBOX_HEIGHT = 1536;

const GRID_COLS = 6;
const GRID_ROWS = 6;

const GRID_X = 210;
const GRID_Y = 120;
const GRID_WIDTH = 740;
const GRID_HEIGHT = 1330;

const islandMasterZone: IslandMasterZone = {
 id: "island-master-outline",
 terrainZh: "整岛热区底稿",
 terrainEn: "Island Master Zone",
 nameZh: "整岛海岸线热区底稿",
 nameEn: "Island Coastline Master Zone",
 descZh:
 "这一版只做整岛海岸线母轮廓，目标是把整座岛的真实贴边边界先锁准。后续所有可建区、可售区和小区块，都会在这条母轮廓内部继续细分。",
 descEn:
 "This version focuses only on the island-wide coastline master outline. The goal is to lock the true edge of the island first, before subdividing buildable and sellable parcels inside it.",
 suitableZh: "当前方案：在整岛轮廓内切分 36 个规则小块",
 suitableEn: "Current plan: subdivide the island into 36 regular plots",
 points:
 "259,122 248,125 242,127 237,131 229,133 225,136 220,141 212,145 211,150 219,158 224,164 234,171 239,173 244,173 253,180 255,182 263,188 272,188 282,188 289,190 299,190 305,193 316,200 323,200 338,197 347,197 363,200 374,200 381,198 385,208 386,218 385,228 380,241 377,248 368,261 356,269 347,278 342,287 333,291 322,295 320,303 319,315 314,326 312,344 318,354 335,358 347,359 362,360 372,361 380,367 390,374 397,378 403,386 408,399 413,409 415,421 418,430 416,440 414,452 400,458 377,466 362,470 377,475 401,479 416,479 430,482 440,487 448,495 452,507 451,518 449,532 447,542 443,552 450,564 457,574 457,583 455,592 450,608 440,621 430,634 425,641 414,650 404,656 391,664 383,670 372,679 362,684 362,696 348,703 333,710 319,717 298,726 284,733 271,743 251,750 239,761 222,768 202,777 192,787 207,796 224,806 237,816 254,829 260,840 271,853 282,864 295,876 313,889 327,902 339,907 347,913 352,939 356,957 367,962 387,961 389,982 390,1000 400,1018 413,1034 422,1047 429,1062 440,1078 440,1096 433,1111 415,1125 400,1141 412,1148 427,1151 439,1166 444,1179 450,1192 444,1207 441,1221 450,1232 463,1238 462,1251 452,1261 431,1271 414,1273 409,1285 408,1298 425,1305 438,1313 444,1323 455,1337 459,1351 454,1369 448,1383 455,1398 466,1405 475,1419 484,1437 498,1449 518,1439 528,1419 528,1393 533,1369 541,1356 548,1346 553,1339 561,1337 568,1340 584,1341 597,1330 611,1318 624,1306 626,1289 619,1269 626,1261 641,1261 649,1255 650,1242 649,1231 649,1218 655,1206 671,1211 693,1206 710,1195 719,1181 728,1156 730,1137 735,1126 744,1113 755,1097 769,1082 781,1074 795,1063 812,1062 827,1059 834,1046 820,1023 819,1010 825,998 837,995 855,990 873,985 895,985 913,983 915,972 901,957 896,946 887,935 881,926 878,912 875,902 876,892 880,884 874,871 854,857 837,852 817,843 802,837 792,831 779,823 762,813 754,803 744,787 742,768 736,750 739,731 745,718 754,709 763,699 777,693 790,686 804,681 817,677 834,675 851,678 863,676 875,679 886,684 899,688 916,694 927,702 938,704 951,695 945,672 940,655 935,638 920,624 918,611 905,595 898,583 885,572 868,560 848,548 833,535 821,522 807,517 786,504 774,499 754,486 752,474 748,461 738,449 724,437 717,432 714,417 715,404 724,391 739,384 755,376 770,372 780,366 787,357 792,349 794,334 805,328 806,316 800,308 789,299 772,295 759,289 747,285 725,280 709,275 696,265 685,260 673,247 649,238 632,227 621,218 604,216 588,216 568,206 557,199 548,193 533,185 513,180 493,173 480,162 463,152 448,143 434,140 421,140 407,139 392,134 379,132 364,131 352,127 344,127 334,126 320,125 305,123 292,122 282,122 269,121 264,121 259,122",
};

function getTooltipAlign(centerX: number, centerY: number): TooltipAlign {
 if (centerX > 740) return "left";
 if (centerX < 300) return "right";
 if (centerY > 1180) return "top";
 return "right";
}

function getTooltipStyle(
 mouseX: number,
 mouseY: number,
 align: TooltipAlign
): React.CSSProperties {
 const base: React.CSSProperties = {
 position: "absolute",
 left: `${(mouseX / VIEWBOX_WIDTH) * 100}%`,
 top: `${(mouseY / VIEWBOX_HEIGHT) * 100}%`,
 zIndex: 40,
 width: "290px",
 pointerEvents: "none",
 };

 if (align === "right") {
 return { ...base, transform: "translate(92px, -50%)" };
 }
 if (align === "left") {
 return { ...base, transform: "translate(calc(-100% - 92px), -50%)" };
 }
 if (align === "top") {
 return { ...base, transform: "translate(-50%, calc(-100% - 68px))" };
 }
 return { ...base, transform: "translate(-50%, 68px)" };
}

function getTerrainMeta(terrainType: TerrainType) {
 if (terrainType === "forest") {
 return {
 terrainZh: "山林地块",
 terrainEn: "Forest Plot",
 suitableZh: "适合别墅、庄园、庭院住宅",
 suitableEn: "Best for villas, estates, and courtyard homes",
 basePrice: 168,
 descZh: "山林地势安静，私密性强，适合打造高品质独栋与庄园住宅。",
 descEn:
 "Forest terrain is secluded and calm, ideal for premium villas and estate-style residences.",
 };
 }

 if (terrainType === "city") {
 return {
 terrainZh: "城市地块",
 terrainEn: "City Plot",
 suitableZh: "适合联排、双拼、城市住宅",
 suitableEn:
 "Best for townhouses, semi-detached homes, and urban residences",
 basePrice: 188,
 descZh:
 "城市地块交通便利、配套成熟，适合高效率开发和紧凑型居住方案。",
 descEn:
 "City plots have strong access and infrastructure, suitable for efficient development and compact urban living.",
 };
 }

 if (terrainType === "cliff") {
 return {
 terrainZh: "海边悬崖",
 terrainEn: "Seaside Cliff",
 suitableZh: "适合景观别墅、度假住宅、观景庄园",
 suitableEn:
 "Best for view villas, resort homes, and scenic estates",
 basePrice: 268,
 descZh: "海边悬崖拥有最强景观价值，适合打造稀缺型高端住宅。",
 descEn:
 "Seaside cliff plots offer the strongest view value and fit rare luxury residences.",
 };
 }

 if (terrainType === "plain") {
 return {
 terrainZh: "内陆平原",
 terrainEn: "Inland Plain",
 suitableZh: "适合独栋住宅、家庭住宅、成长型社区",
 suitableEn:
 "Best for detached homes, family residences, and growth communities",
 basePrice: 138,
 descZh:
 "内陆平原施工条件稳定，拓展空间充足，适合大多数家庭建造需求。",
 descEn:
 "Inland plains are stable and practical for construction, fitting most family-oriented builds.",
 };
 }

 return {
 terrainZh: "城镇郊区",
 terrainEn: "Town Suburb",
 suitableZh: "适合独栋、双拼、低密社区住宅",
 suitableEn:
 "Best for detached homes, semi-detached homes, and low-density communities",
 basePrice: 152,
 descZh: "城镇郊区兼顾生活便利与居住舒适，是均衡型住宅的理想区域。",
 descEn:
 "Town suburbs balance convenience and comfort, making them ideal for balanced residential development.",
 };
}

function getRarityMeta(rarity: RarityType) {
 if (rarity === "epic") {
 return {
 rarityZh: "传奇",
 rarityEn: "Epic",
 };
 }

 if (rarity === "rare") {
 return {
 rarityZh: "稀有",
 rarityEn: "Rare",
 };
 }

 return {
 rarityZh: "普通",
 rarityEn: "Common",
 };
}

function getStatusMeta(status: SaleStatus) {
 if (status === "sold") {
 return {
 statusZh: "已售出",
 statusEn: "Sold",
 };
 }

 if (status === "reserved") {
 return {
 statusZh: "已预留",
 statusEn: "Reserved",
 };
 }

 return {
 statusZh: "可购买",
 statusEn: "Available",
 };
}

function getCellTerrain(row: number, col: number): TerrainType {
 if (row <= 1 && col <= 1) return "forest";
 if (row <= 1 && col >= 4) return "city";
 if (row >= 4 && col >= 4) return "cliff";
 if (row >= 4 && col <= 1) return "suburb";
 if (row === 2 && col === 5) return "city";
 if (row === 3 && col === 5) return "cliff";
 if (row === 2 && col === 0) return "forest";
 if (row === 3 && col === 0) return "suburb";
 return "plain";
}

function getCellRarity(
 row: number,
 col: number,
 terrainType: TerrainType
): RarityType {
 if (
 terrainType === "cliff" &&
 ((row === 4 && col >= 4) || (row === 5 && col >= 3))
 ) {
 return "epic";
 }

 if (
 terrainType === "forest" ||
 terrainType === "city" ||
 terrainType === "cliff"
 ) {
 return "rare";
 }

 return "common";
}

function getCellStatus(index: number, rarity: RarityType): SaleStatus {
 if (rarity === "epic" && index % 2 === 0) return "reserved";
 if (index === 6 || index === 18 || index === 31) return "sold";
 if (index % 7 === 0) return "reserved";
 return "available";
}

function getPriceLabel(basePrice: number, rarity: RarityType) {
 let min = basePrice;
 let max = basePrice + 26;

 if (rarity === "rare") {
 min += 28;
 max += 42;
 }

 if (rarity === "epic") {
 min += 66;
 max += 96;
 }

 return {
 zh: `${min}万 - ${max}万`,
 en: `${min}k - ${max}k RMB`,
 };
}

function getPlotDisplayName(language: string, cell: PlotCell) {
 return language === "zh" ? cell.nameZh : cell.nameEn;
}

function getStatusBadgeClass(status: SaleStatus) {
 if (status === "sold") {
 return "border-rose-200 bg-rose-50 text-rose-700";
 }
 if (status === "reserved") {
 return "border-amber-200 bg-amber-50 text-amber-700";
 }
 return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getRarityBadgeClass(rarity: RarityType) {
 if (rarity === "epic") {
 return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
 }
 if (rarity === "rare") {
 return "border-sky-200 bg-sky-50 text-sky-700";
 }
 return "border-neutral-200 bg-white/80 text-neutral-700";
}

export default function DreamWorldMap({
 language,
 selectedPlotId,
 setSelectedPlotId,
 onEnterPlotDetail,
 needsAttention = false,
}: DreamWorldMapProps) {
 const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);
 const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
 const [isHoveringIsland, setIsHoveringIsland] = useState(false);

 const cells = useMemo<PlotCell[]>(() => {
 const cellWidth = GRID_WIDTH / GRID_COLS;
 const cellHeight = GRID_HEIGHT / GRID_ROWS;
 const result: PlotCell[] = [];
 let index = 1;

 for (let row = 0; row < GRID_ROWS; row += 1) {
 for (let col = 0; col < GRID_COLS; col += 1) {
 const x = GRID_X + col * cellWidth;
 const y = GRID_Y + row * cellHeight;
 const code = String(index).padStart(2, "0");

 const terrainType = getCellTerrain(row, col);
 const terrainMeta = getTerrainMeta(terrainType);
 const rarity = getCellRarity(row, col, terrainType);
 const rarityMeta = getRarityMeta(rarity);
 const status = getCellStatus(index, rarity);
 const statusMeta = getStatusMeta(status);
 const price = getPriceLabel(terrainMeta.basePrice, rarity);

 result.push({
 id: `plot-${code}`,
 code,
 row,
 col,
 x,
 y,
 width: cellWidth,
 height: cellHeight,
 centerX: x + cellWidth / 2,
 centerY: y + cellHeight / 2,
 terrainType,
 terrainZh: terrainMeta.terrainZh,
 terrainEn: terrainMeta.terrainEn,
 nameZh: `地块 ${code}`,
 nameEn: `Plot ${code}`,
 suitableZh: terrainMeta.suitableZh,
 suitableEn: terrainMeta.suitableEn,
 rarity,
 rarityZh: rarityMeta.rarityZh,
 rarityEn: rarityMeta.rarityEn,
 priceZh: price.zh,
 priceEn: price.en,
 status,
 statusZh: statusMeta.statusZh,
 statusEn: statusMeta.statusEn,
 descZh: terrainMeta.descZh,
 descEn: terrainMeta.descEn,
 });

 index += 1;
 }
 }

 return result;
 }, []);

 const hoveredCell = cells.find((cell) => cell.id === hoveredCellId) ?? null;
 const selectedCell = cells.find((cell) => cell.id === selectedPlotId) ?? null;
 const showAttentionState = needsAttention && !selectedCell;

 return (
 <div className="flex h-full min-h-[860px] flex-col rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="shrink-0">
 <div className="mb-2 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
 Dream World Map
 </div>

 <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
 {language === "zh" ? "选择你的家园地块" : "Choose Your Home Plot"}
 </h2>

 <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
 {language === "zh"
 ? "单击选择地块，双击直接进入该地块的详细地图。当前版本已为 36 个地块补充真实属性，包括地形、推荐建筑、稀有度、价格和销售状态。"
 : "Single-click to select a plot, and double-click to enter its detailed map. This version gives all 36 plots real attributes, including terrain, recommended building type, rarity, pricing, and sale status."}
 </p>
 </div>

 <div
 className={`relative mt-4 min-h-[720px] flex-1 overflow-hidden rounded-[28px] border bg-[#1b6b8f] transition-all duration-300 ${
 showAttentionState
 ? "border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.20),0_0_38px_rgba(251,191,36,0.28)]"
 : "border-neutral-200"
 }`}
 >
 {showAttentionState ? (
 <div className="pointer-events-none absolute inset-0 z-10 animate-pulse rounded-[28px] ring-4 ring-amber-300/40" />
 ) : null}

 <div className="absolute inset-0 bg-[linear-gradient(180deg,#2d8fb7_0%,#1f789f_48%,#145a77_100%)]" />
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.10),transparent_26%)]" />

 <div className="absolute inset-0 flex items-center justify-center">
 <div className="relative h-full aspect-[1024/1536] shrink-0">
 <img
 src="/island-map.png"
 alt="Dream World Island"
 className="absolute inset-0 h-full w-full object-contain"
 />

 <svg
 viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
 className="absolute inset-0 h-full w-full"
 preserveAspectRatio="xMidYMid meet"
 >
 <defs>
 <clipPath id="islandClip">
 <polygon points={islandMasterZone.points} />
 </clipPath>

 <filter id="plotGlow" x="-30%" y="-30%" width="160%" height="160%">
 <feGaussianBlur stdDeviation="6" result="blur" />
 <feMerge>
 <feMergeNode in="blur" />
 <feMergeNode in="SourceGraphic" />
 </feMerge>
 </filter>

 <filter
 id="outlineGlowSoft"
 x="-40%"
 y="-40%"
 width="180%"
 height="180%"
 >
 <feGaussianBlur stdDeviation="5.5" result="blur1" />
 <feMerge>
 <feMergeNode in="blur1" />
 <feMergeNode in="SourceGraphic" />
 </feMerge>
 </filter>
 </defs>

 <polygon
 points={islandMasterZone.points}
 fill="rgba(255,255,255,0.004)"
 stroke={
 showAttentionState
 ? "rgba(251,191,36,0.55)"
 : isHoveringIsland
 ? "rgba(255,255,255,0.22)"
 : "rgba(255,255,255,0.08)"
 }
 strokeWidth={showAttentionState ? 3 : isHoveringIsland ? 2.6 : 1.4}
 strokeLinejoin="round"
 filter="url(#outlineGlowSoft)"
 />

 <polygon
 points={islandMasterZone.points}
 fill="none"
 stroke={
 showAttentionState
 ? "rgba(255,243,199,0.95)"
 : isHoveringIsland
 ? "rgba(255,255,255,0.72)"
 : "rgba(255,255,255,0.12)"
 }
 strokeWidth={showAttentionState ? 2.6 : isHoveringIsland ? 2.3 : 1}
 strokeLinejoin="round"
 filter="url(#outlineGlowSoft)"
 />

 <g clipPath="url(#islandClip)">
 {cells.map((cell) => {
 const isHovered = cell.id === hoveredCellId;
 const isActive = cell.id === selectedPlotId;
 const isHighlighted = isHovered || isActive;

 const fillColor =
 cell.rarity === "epic"
 ? "rgba(236, 72, 153, 0.12)"
 : cell.rarity === "rare"
 ? "rgba(56, 189, 248, 0.10)"
 : "rgba(255,255,255,0.018)";

 return (
 <rect
 key={cell.id}
 x={cell.x}
 y={cell.y}
 width={cell.width}
 height={cell.height}
 fill={isHighlighted ? "rgba(255, 214, 102, 0.24)" : fillColor}
 stroke={
 isHighlighted
 ? "rgba(255,255,255,0.92)"
 : cell.status === "sold"
 ? "rgba(251,113,133,0.32)"
 : cell.status === "reserved"
 ? "rgba(251,191,36,0.28)"
 : "rgba(255,255,255,0.12)"
 }
 strokeWidth={isHighlighted ? 2 : 0.75}
 filter={isHighlighted ? "url(#plotGlow)" : undefined}
 style={{ cursor: "pointer" }}
 onMouseEnter={() => {
 setHoveredCellId(cell.id);
 setIsHoveringIsland(true);
 }}
 onMouseMove={(e) => {
 const svg = e.currentTarget.ownerSVGElement;
 if (!svg) return;
 const point = svg.createSVGPoint();
 point.x = e.clientX;
 point.y = e.clientY;
 const ctm = svg.getScreenCTM();
 if (!ctm) return;
 const transformed = point.matrixTransform(ctm.inverse());
 setMousePos({ x: transformed.x, y: transformed.y });
 }}
 onMouseLeave={() => {
 setHoveredCellId(null);
 setIsHoveringIsland(false);
 }}
 onClick={() => {
 if (selectedPlotId === cell.id) {
 setSelectedPlotId("");
 return;
 }
 setSelectedPlotId(cell.id);
 }}
 onDoubleClick={() => {
 setSelectedPlotId(cell.id);
 onEnterPlotDetail(cell.id);
 }}
 />
 );
 })}
 </g>

 <g className="pointer-events-none">
 {cells.map((cell) => {
 const isHovered = cell.id === hoveredCellId;
 const isActive = cell.id === selectedPlotId;
 const isHighlighted = isHovered || isActive;

 return (
 <text
 key={`label-${cell.id}`}
 x={cell.centerX}
 y={cell.centerY}
 textAnchor="middle"
 dominantBaseline="middle"
 fontSize="18"
 fontWeight="700"
 fill={
 isHighlighted
 ? "rgba(255,255,255,0.98)"
 : cell.rarity === "epic"
 ? "rgba(255,230,245,0.72)"
 : cell.rarity === "rare"
 ? "rgba(220,245,255,0.64)"
 : "rgba(255,255,255,0.24)"
 }
 >
 {cell.code}
 </text>
 );
 })}
 </g>
 </svg>

 {hoveredCell ? (
 <div
 style={getTooltipStyle(
 mousePos.x,
 mousePos.y,
 getTooltipAlign(hoveredCell.centerX, hoveredCell.centerY)
 )}
 className="hidden md:block"
 >
 <div className="rounded-[20px] border border-white/38 bg-white/72 p-4 shadow-[0_18px_38px_rgba(0,0,0,0.14)] backdrop-blur-md">
 <div className="flex flex-wrap items-center gap-2">
 <h3 className="text-base font-semibold text-neutral-900">
 {getPlotDisplayName(language, hoveredCell)}
 </h3>

 <span
 className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getRarityBadgeClass(
 hoveredCell.rarity
 )}`}
 >
 {language === "zh"
 ? hoveredCell.rarityZh
 : hoveredCell.rarityEn}
 </span>

 <span
 className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClass(
 hoveredCell.status
 )}`}
 >
 {language === "zh"
 ? hoveredCell.statusZh
 : hoveredCell.statusEn}
 </span>
 </div>

 <p className="mt-2 text-sm font-medium text-neutral-800">
 {language === "zh"
 ? hoveredCell.terrainZh
 : hoveredCell.terrainEn}
 </p>

 <p className="mt-2 text-sm leading-6 text-neutral-700">
 {language === "zh"
 ? hoveredCell.descZh
 : hoveredCell.descEn}
 </p>

 <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
 <div className="rounded-xl bg-white/80 px-3 py-2 text-neutral-700">
 <div className="text-neutral-400">
 {language === "zh" ? "推荐建筑" : "Recommended"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh"
 ? hoveredCell.suitableZh
 : hoveredCell.suitableEn}
 </div>
 </div>

 <div className="rounded-xl bg-white/80 px-3 py-2 text-neutral-700">
 <div className="text-neutral-400">
 {language === "zh" ? "参考价格" : "Price"}
 </div>
 <div className="mt-1 font-medium text-neutral-900">
 {language === "zh"
 ? hoveredCell.priceZh
 : hoveredCell.priceEn}
 </div>
 </div>
 </div>

 <div className="mt-3 flex flex-wrap gap-2 text-xs">
 <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-neutral-700">
 {language === "zh"
 ? `行 ${hoveredCell.row + 1} · 列 ${hoveredCell.col + 1}`
 : `Row ${hoveredCell.row + 1} · Col ${
 hoveredCell.col + 1
 }`}
 </span>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 </div>

 <div className="absolute bottom-5 left-5 max-w-[440px] rounded-[20px] border border-white/45 bg-white/62 px-4 py-3 text-sm text-neutral-700 shadow-[0_14px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
 {selectedCell ? (
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-semibold text-neutral-900">
 {getPlotDisplayName(language, selectedCell)}
 </span>
 <span
 className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass(
 selectedCell.status
 )}`}
 >
 {language === "zh"
 ? selectedCell.statusZh
 : selectedCell.statusEn}
 </span>
 </div>

 <div className="mt-2 text-xs text-neutral-600">
 {language === "zh"
 ? `${selectedCell.terrainZh} · ${selectedCell.rarityZh} · ${selectedCell.priceZh}`
 : `${selectedCell.terrainEn} · ${selectedCell.rarityEn} · ${selectedCell.priceEn}`}
 </div>

 <div className="mt-2 text-xs text-neutral-500">
 {language === "zh"
 ? selectedCell.suitableZh
 : selectedCell.suitableEn}
 </div>

 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => onEnterPlotDetail(selectedCell.id)}
 className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
 >
 {language === "zh" ? "进入地块详情" : "Enter Plot Detail"}
 </button>
 </div>
 </div>
 ) : showAttentionState ? (
 <div>
 <div className="font-semibold text-amber-800">
 {language === "zh"
 ? "请先在地图中选择地块"
 : "Please select a plot on the map first"}
 </div>
 <div className="mt-2 text-xs leading-6 text-amber-700">
 {language === "zh"
 ? "先单击选中一个地块，再双击进入地块详情页购买具体 lot。"
 : "Single-click a plot to select it, then double-click to enter the detail page and buy a specific lot."}
 </div>
 </div>
 ) : (
 <>
 <span className="font-semibold text-neutral-900">
 {language === "zh" ? "当前选中：" : "Selected: "}
 </span>
 {language === "zh" ? "未选择地块" : "No plot selected"}
 </>
 )}
 </div>

 <div className="absolute right-5 top-5 flex flex-col gap-2">
 <button className="rounded-2xl border border-white/45 bg-white/72 px-4 py-3 text-sm font-semibold text-neutral-800 shadow-[0_10px_24px_rgba(0,0,0,0.10)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/82">
 {language === "zh" ? "🗺 大图模式" : "🗺 Large Map"}
 </button>

 <div className="rounded-2xl border border-white/45 bg-white/58 px-4 py-3 text-xs text-neutral-700 shadow-[0_10px_24px_rgba(0,0,0,0.10)] backdrop-blur-md">
 <div className="font-semibold text-neutral-900">
 {language === "zh" ? "当前分割方式" : "Subdivision"}
 </div>
 <div className="mt-2 space-y-1">
 <div>{language === "zh" ? "直线切分：6 × 6" : "Straight grid: 6 × 6"}</div>
 <div>{language === "zh" ? "共 36 个小块" : "Total 36 plots"}</div>
 <div>
 {language === "zh"
 ? "单击选中 · 双击进入详情"
 : "Single click to select · Double click to enter"}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}