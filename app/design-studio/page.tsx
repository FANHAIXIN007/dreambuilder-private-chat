"use client";

import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import DesignBriefPanel from "@/app/components/DesignBriefPanel";
import GeneratedFloorplanCanvas from "@/app/components/GeneratedFloorplanCanvas";
import GeneratedElevationCanvas from "@/app/components/GeneratedElevationCanvas";
import GeneratedSectionCanvas from "@/app/components/GeneratedSectionCanvas";
import ExportDesignPdfButton from "@/app/components/ExportDesignPdfButton";
import PrintableDesignReport from "@/app/components/PrintableDesignReport";
import RoomScheduleTable from "@/app/components/RoomScheduleTable";
import InteractiveDesignEditor from "@/app/components/InteractiveDesignEditor";
import {
 DEFAULT_DESIGN_BRIEF,
 type BudgetLevel,
 type FloorPlan,
 type FloorRoom,
 type FloorplanFloor,
 type HouseDesignBrief,
 type HouseDesignPackage,
 type Language,
 type MaterialItem,
 type RoomItem,
} from "@/app/lib/designTypes";

function uid(prefix: string) {
 return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function num(value: unknown, fallback = 0) {
 const n = Number(value);
 return Number.isFinite(n) ? n : fallback;
}

function roundArea(value: number) {
 return Math.max(4, Math.round(value));
}

function buildRectRoom(params: {
 id: string;
 code: string;
 floor: number;
 nameZh: string;
 nameEn: string;
 type: RoomItem["type"];
 area: number;
 x: number;
 y: number;
 w: number;
 h: number;
}): RoomItem {
 const polygon = [
 { x: params.x, y: params.y },
 { x: params.x + params.w, y: params.y },
 { x: params.x + params.w, y: params.y + params.h },
 { x: params.x, y: params.y + params.h },
 ];

 return {
 id: params.id,
 code: params.code,
 floor: params.floor,
 nameZh: params.nameZh,
 nameEn: params.nameEn,
 type: params.type,
 area: roundArea(params.area),
 geometry: {
 polygon,
 center: {
 x: params.x + params.w / 2,
 y: params.y + params.h / 2,
 },
 bounds: {
 x: params.x,
 y: params.y,
 width: params.w,
 height: params.h,
 },
 },
 };
}

function createFloorplanData(brief: HouseDesignBrief): FloorplanFloor[] {
 const floors = Math.max(1, num(brief.site.floors, 1));
 const result: FloorplanFloor[] = [];

 const floor1Rooms: RoomItem[] = [];
 let roomIndex = 1;

 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "玄关",
 nameEn: "Foyer",
 type: "foyer",
 area: 8,
 x: 60,
 y: 60,
 w: 120,
 h: 90,
 }),
 );

 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "客厅",
 nameEn: "Living Room",
 type: "living",
 area: 34,
 x: 180,
 y: 60,
 w: 250,
 h: 180,
 }),
 );

 if (brief.requirements.needDiningRoom) {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "餐厅",
 nameEn: "Dining Room",
 type: "dining",
 area: 18,
 x: 430,
 y: 60,
 w: 170,
 h: 120,
 }),
 );
 }

 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "厨房",
 nameEn: "Kitchen",
 type: "kitchen",
 area: 16,
 x: 430,
 y: 180,
 w: 170,
 h: 110,
 }),
 );

 if (brief.requirements.needStudy) {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "书房",
 nameEn: "Study",
 type: "study",
 area: 12,
 x: 60,
 y: 150,
 w: 120,
 h: 120,
 }),
 );
 }

 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "楼梯厅",
 nameEn: "Stair Hall",
 type: "corridor",
 area: 12,
 x: 600,
 y: 60,
 w: 120,
 h: 120,
 }),
 );

 if (brief.requirements.needLaundry) {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "洗衣房",
 nameEn: "Laundry",
 type: "laundry",
 area: 7,
 x: 600,
 y: 180,
 w: 120,
 h: 70,
 }),
 );
 }

 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "公卫",
 nameEn: "Bathroom",
 type: "bathroom",
 area: 6,
 x: 600,
 y: 250,
 w: 120,
 h: 70,
 }),
 );

 if (brief.requirements.needGarage) {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "车库",
 nameEn: "Garage",
 type: "garage",
 area: 24,
 x: 180,
 y: 240,
 w: 250,
 h: 140,
 }),
 );
 } else {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "家庭厅",
 nameEn: "Family Lounge",
 type: "corridor",
 area: 22,
 x: 180,
 y: 240,
 w: 250,
 h: 140,
 }),
 );
 }

 if (brief.requirements.needTerrace) {
 floor1Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(roomIndex++).padStart(2, "0")}`,
 floor: 1,
 nameZh: "露台",
 nameEn: "Terrace",
 type: "terrace",
 area: 20,
 x: 430,
 y: 290,
 w: 290,
 h: 90,
 }),
 );
 }

 result.push({
 floor: 1,
 titleZh: "一层平面图",
 titleEn: "Ground Floor Plan",
 width: 780,
 height: 460,
 outerPolygon: [
 { x: 40, y: 40 },
 { x: 740, y: 40 },
 { x: 740, y: 420 },
 { x: 40, y: 420 },
 ],
 rooms: floor1Rooms,
 axisX: [
 { id: "x1", label: "1", orientation: "vertical", value: 40 },
 { id: "x2", label: "2", orientation: "vertical", value: 220 },
 { id: "x3", label: "3", orientation: "vertical", value: 430 },
 { id: "x4", label: "4", orientation: "vertical", value: 600 },
 { id: "x5", label: "5", orientation: "vertical", value: 740 },
 ],
 axisY: [
 { id: "y1", label: "A", orientation: "horizontal", value: 40 },
 { id: "y2", label: "B", orientation: "horizontal", value: 180 },
 { id: "y3", label: "C", orientation: "horizontal", value: 290 },
 { id: "y4", label: "D", orientation: "horizontal", value: 420 },
 ],
 walls: [],
 doors: [
 {
 id: uid("door"),
 code: "D01",
 type: "entrance",
 floor: 1,
 width: 1000,
 height: 2200,
 position: { x: 120, y: 420 },
 rotation: 0,
 },
 {
 id: uid("door"),
 code: "D02",
 type: "single",
 floor: 1,
 width: 900,
 height: 2100,
 position: { x: 430, y: 235 },
 rotation: 90,
 },
 ],
 windows: [
 {
 id: uid("win"),
 code: "W01",
 type: "floor_to_ceiling",
 floor: 1,
 width: 2400,
 height: 2400,
 position: { x: 300, y: 40 },
 rotation: 0,
 },
 {
 id: uid("win"),
 code: "W02",
 type: "sliding",
 floor: 1,
 width: 1800,
 height: 1500,
 position: { x: 520, y: 40 },
 rotation: 0,
 },
 {
 id: uid("win"),
 code: "W03",
 type: "casement",
 floor: 1,
 width: 1500,
 height: 1500,
 position: { x: 740, y: 200 },
 rotation: 90,
 },
 ],
 });

 if (floors >= 2) {
 const floor2Rooms: RoomItem[] = [];
 let room2Index = 1;

 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "主卧",
 nameEn: "Master Bedroom",
 type: "master_bedroom",
 area: 24,
 x: 60,
 y: 60,
 w: 220,
 h: 160,
 }),
 );

 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "主卫",
 nameEn: "Master Bathroom",
 type: "master_bathroom",
 area: 9,
 x: 280,
 y: 60,
 w: 110,
 h: 100,
 }),
 );

 if (brief.requirements.walkInClosets > 0) {
 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "衣帽间",
 nameEn: "Walk-in Closet",
 type: "storage",
 area: 7,
 x: 280,
 y: 160,
 w: 110,
 h: 60,
 }),
 );
 }

 for (let i = 0; i < Math.max(1, brief.requirements.bedrooms - 1); i++) {
 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: `次卧 ${i + 1}`,
 nameEn: `Bedroom ${i + 1}`,
 type: "bedroom",
 area: 14,
 x: 390 + (i % 2) * 150,
 y: 60 + Math.floor(i / 2) * 130,
 w: 140,
 h: 110,
 }),
 );
 }

 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "家庭厅",
 nameEn: "Family Lounge",
 type: "corridor",
 area: 18,
 x: 60,
 y: 220,
 w: 330,
 h: 120,
 }),
 );

 if (brief.requirements.needBalcony) {
 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "阳台",
 nameEn: "Balcony",
 type: "balcony",
 area: 10,
 x: 540,
 y: 60,
 w: 140,
 h: 80,
 }),
 );
 }

 if (brief.requirements.needTerrace) {
 floor2Rooms.push(
 buildRectRoom({
 id: uid("room"),
 code: `R${String(room2Index++).padStart(2, "0")}`,
 floor: 2,
 nameZh: "观景露台",
 nameEn: "View Terrace",
 type: "terrace",
 area: 16,
 x: 390,
 y: 250,
 w: 290,
 h: 90,
 }),
 );
 }

 result.push({
 floor: 2,
 titleZh: "二层平面图",
 titleEn: "Second Floor Plan",
 width: 780,
 height: 460,
 outerPolygon: [
 { x: 40, y: 40 },
 { x: 740, y: 40 },
 { x: 740, y: 420 },
 { x: 40, y: 420 },
 ],
 rooms: floor2Rooms,
 axisX: [
 { id: "x1", label: "1", orientation: "vertical", value: 40 },
 { id: "x2", label: "2", orientation: "vertical", value: 220 },
 { id: "x3", label: "3", orientation: "vertical", value: 430 },
 { id: "x4", label: "4", orientation: "vertical", value: 600 },
 { id: "x5", label: "5", orientation: "vertical", value: 740 },
 ],
 axisY: [
 { id: "y1", label: "A", orientation: "horizontal", value: 40 },
 { id: "y2", label: "B", orientation: "horizontal", value: 180 },
 { id: "y3", label: "C", orientation: "horizontal", value: 290 },
 { id: "y4", label: "D", orientation: "horizontal", value: 420 },
 ],
 walls: [],
 doors: [
 {
 id: uid("door"),
 code: "D03",
 type: "single",
 floor: 2,
 width: 900,
 height: 2100,
 position: { x: 390, y: 120 },
 rotation: 90,
 },
 ],
 windows: [
 {
 id: uid("win"),
 code: "W04",
 type: "sliding",
 floor: 2,
 width: 1800,
 height: 1500,
 position: { x: 150, y: 40 },
 rotation: 0,
 },
 {
 id: uid("win"),
 code: "W05",
 type: "casement",
 floor: 2,
 width: 1500,
 height: 1500,
 position: { x: 740, y: 180 },
 rotation: 90,
 },
 ],
 });
 }

 return result;
}

function buildClassicFloorPlans(floorplans: FloorplanFloor[]): FloorPlan[] {
 return floorplans.map((floor) => {
 const rooms: FloorRoom[] = floor.rooms.map((room) => ({
 id: room.id,
 code: room.code,
 nameZh: room.nameZh,
 nameEn: room.nameEn,
 area: room.area,
 type: room.type,
 floor: room.floor,
 geometry: room.geometry,
 x: room.geometry.bounds.x,
 y: room.geometry.bounds.y,
 w: room.geometry.bounds.width,
 h: room.geometry.bounds.height,
 }));

 return {
 floorIndex: floor.floor,
 floorNameZh: floor.titleZh,
 floorNameEn: floor.titleEn,
 rooms,
 totalArea: rooms.reduce((sum, room) => sum + room.area, 0),
 };
 });
}

function makeMaterial(
 category: MaterialItem["category"],
 name: string,
 specification: string,
 unit: string,
 quantity: number,
 unitPrice: number,
 brandLevel: BudgetLevel,
 notes?: string,
): MaterialItem {
 return {
 category,
 name,
 specification,
 unit,
 quantity,
 unitPrice,
 totalPrice: quantity * unitPrice,
 brandLevel,
 notes,
 };
}

function buildMaterials(brief: HouseDesignBrief) {
 const area = Math.max(60, brief.site.buildAreaTarget);
 const level = brief.preferences.budgetLevel;

 const structureUnit =
 level === "economy" ? 210 : level === "premium" ? 360 : 280;
 const facadeUnit =
 level === "economy" ? 55 : level === "premium" ? 140 : 90;
 const roofUnit =
 level === "economy" ? 45 : level === "premium" ? 110 : 72;
 const windowUnit =
 level === "economy" ? 220 : level === "premium" ? 480 : 320;
 const interiorUnit =
 level === "economy" ? 110 : level === "premium" ? 320 : 190;
 const mepUnit =
 level === "economy" ? 95 : level === "premium" ? 220 : 145;

 const facadeName = brief.style.facadeMaterials.includes("stone_panel")
 ? "石材/复合挂板外墙系统"
 : brief.style.facadeMaterials.includes("wood_finish")
 ? "木饰面复合外墙系统"
 : "真石漆复合外墙系统";

 return {
 structure: [
 makeMaterial(
 "structure",
 "钢筋混凝土主体结构",
 "基础、梁柱板、楼梯",
 "㎡",
 area,
 structureUnit,
 level,
 ),
 makeMaterial(
 "structure",
 "砌体与隔墙系统",
 "轻质砌块/隔墙板",
 "㎡",
 Math.round(area * 1.35),
 28,
 level,
 ),
 ],
 facade: [
 makeMaterial(
 "facade",
 facadeName,
 "含基层、防裂、饰面层",
 "㎡",
 Math.round(area * 0.95),
 facadeUnit,
 level,
 ),
 makeMaterial(
 "facade",
 "外墙保温层",
 "岩棉/挤塑板",
 "㎡",
 Math.round(area * 0.92),
 level === "economy" ? 18 : level === "premium" ? 36 : 24,
 level,
 ),
 ],
 roof: [
 makeMaterial(
 "roof",
 brief.style.roofType === "flat" ? "平屋面系统" : "坡屋面系统",
 "防水、保温、找坡/挂瓦层",
 "㎡",
 Math.round(area * 0.6),
 roofUnit,
 level,
 ),
 ],
 doorsWindows: [
 makeMaterial(
 "doors_windows",
 "断桥铝门窗系统",
 "双层中空 Low-E 玻璃",
 "㎡",
 Math.round(area * 0.22),
 windowUnit,
 level,
 ),
 makeMaterial(
 "doors_windows",
 "入户门与室内门",
 "入户装甲门 + 木门",
 "樘",
 Math.max(
 8,
 brief.requirements.bedrooms + brief.requirements.bathrooms + 5,
 ),
 level === "economy" ? 260 : level === "premium" ? 760 : 430,
 level,
 ),
 ],
 interior: [
 makeMaterial(
 "interior",
 "地面铺装",
 "地砖/木地板组合",
 "㎡",
 Math.round(area * 0.88),
 interiorUnit,
 level,
 ),
 makeMaterial(
 "interior",
 "墙顶面饰面",
 "乳胶漆/局部木饰面",
 "㎡",
 Math.round(area * 2.4),
 level === "economy" ? 12 : level === "premium" ? 34 : 22,
 level,
 ),
 makeMaterial(
 "interior",
 "厨卫饰面",
 "防水、瓷砖、洁具基础包",
 "套",
 1,
 level === "economy" ? 12000 : level === "premium" ? 42000 : 22000,
 level,
 ),
 ],
 mep: [
 makeMaterial(
 "mep",
 "给排水系统",
 "冷热水、排污、洁具接口",
 "㎡",
 area,
 28,
 level,
 ),
 makeMaterial(
 "mep",
 "强弱电系统",
 "照明、插座、弱电箱",
 "㎡",
 area,
 32,
 level,
 ),
 makeMaterial(
 "mep",
 "空调/新风/地暖预留",
 "按配置等级估算",
 "㎡",
 area,
 mepUnit,
 level,
 ),
 ],
 };
}

function getBaseCostPerSqm(level: BudgetLevel) {
 if (level === "economy") return 900;
 if (level === "premium") return 1800;
 return 1300;
}

function getStyleFactor(style: string) {
 switch (style) {
 case "modern_minimal":
 return 1.05;
 case "contemporary_luxury":
 return 1.18;
 case "nordic":
 return 1.03;
 case "mediterranean":
 return 1.1;
 case "new_chinese":
 return 1.15;
 case "japanese":
 return 1.08;
 case "classic_european":
 return 1.22;
 default:
 return 1;
 }
}

function getTerrainFactor(terrain: string) {
 switch (terrain) {
 case "plain":
 return 1;
 case "slope":
 return 1.1;
 case "cliff":
 return 1.18;
 case "forest_edge":
 return 1.06;
 case "coastal":
 return 1.12;
 default:
 return 1;
 }
}

function getSystemFactor(brief: HouseDesignBrief) {
 let factor = 1;
 if (brief.preferences.needSolar) factor += 0.03;
 if (brief.preferences.needFloorHeating) factor += 0.04;
 if (brief.preferences.needFreshAirSystem) factor += 0.025;
 if (brief.preferences.needSmartHome) factor += 0.02;
 return factor;
}

function buildBudget(brief: HouseDesignBrief) {
 const area = Math.max(60, brief.site.buildAreaTarget);
 const base = getBaseCostPerSqm(brief.preferences.budgetLevel);
 const styleFactor = getStyleFactor(brief.style.architecturalStyle);
 const terrainFactor = getTerrainFactor(brief.site.terrain);
 const systemFactor = getSystemFactor(brief);

 let functionFactor = 1;
 functionFactor += brief.requirements.homeTheaters * 0.015;
 functionFactor += brief.requirements.walkInClosets * 0.01;
 functionFactor += brief.requirements.bathtubBathrooms * 0.01;

 const costPerSqm = Math.round(
 base * styleFactor * terrainFactor * systemFactor * functionFactor,
 );
 const totalCost = area * costPerSqm;

 const structureCost = totalCost * 0.3;
 const facadeCost = totalCost * 0.12;
 const roofCost = totalCost * 0.06;
 const doorsWindowsCost = totalCost * 0.1;
 const interiorCost = totalCost * 0.17;
 const mepCost = totalCost * 0.15;
 const landscapingCost = totalCost * 0.1;

 return {
 structureCost,
 facadeCost,
 roofCost,
 doorsWindowsCost,
 interiorCost,
 mepCost,
 landscapingCost,
 totalCost,
 costPerSqm,
 currency: brief.preferences.currency,
 breakdown: [
 {
 key: "structure",
 labelZh: "结构工程",
 labelEn: "Structure",
 value: structureCost,
 ratio: 0.3,
 },
 {
 key: "facade",
 labelZh: "外立面",
 labelEn: "Facade",
 value: facadeCost,
 ratio: 0.12,
 },
 {
 key: "roof",
 labelZh: "屋面工程",
 labelEn: "Roof",
 value: roofCost,
 ratio: 0.06,
 },
 {
 key: "doors_windows",
 labelZh: "门窗工程",
 labelEn: "Doors & Windows",
 value: doorsWindowsCost,
 ratio: 0.1,
 },
 {
 key: "interior",
 labelZh: "室内硬装",
 labelEn: "Interior",
 value: interiorCost,
 ratio: 0.17,
 },
 {
 key: "mep",
 labelZh: "机电系统",
 labelEn: "MEP",
 value: mepCost,
 ratio: 0.15,
 },
 {
 key: "landscaping",
 labelZh: "景观与庭院",
 labelEn: "Landscape",
 value: landscapingCost,
 ratio: 0.1,
 },
 ],
 };
}

function generatePackage(brief: HouseDesignBrief): HouseDesignPackage {
 const floorplans = createFloorplanData(brief);
 const floorPlans = buildClassicFloorPlans(floorplans);
 const materials = buildMaterials(brief);
 const budget = buildBudget(brief);

 const summaryZh = `本方案为 ${brief.site.city} 的 ${brief.site.buildAreaTarget}㎡ ${brief.site.floors}层住宅概念设计，采用 ${brief.style.architecturalStyle} 风格，重点满足 ${brief.requirements.residents} 人居住需求。方案已输出平面图、立面图、剖面图、房间编号表、材料系统与预算概算。`;
 const summaryEn = `This concept package proposes a ${brief.site.floors}-storey residential house in ${brief.site.city} with a target GFA of ${brief.site.buildAreaTarget} sqm. The package includes linked floorplan, elevation, section, room schedule, materials summary and budget estimate.`;

 return {
 id: uid("design"),
 projectName: brief.projectName,
 language: brief.language,
 createdAt: new Date().toISOString(),
 site: brief.site,
 requirements: brief.requirements,
 style: brief.style,
 preferences: brief.preferences,
 summaryZh,
 summaryEn,
 floorPlans,
 floorplans,
 materials,
 budget,
 elevations: [],
 sections: [],
 schedules: {
 rooms: [],
 doors: [],
 windows: [],
 },
 };
}

type MaterialGroup = {
 key: string;
 title: string;
 items: MaterialItem[];
};

function MergedSummaryHeader({
 result,
 language,
 floors,
 activeFloor,
 onChangeFloor,
}: {
 result: HouseDesignPackage;
 language: Language;
 floors: FloorplanFloor[];
 activeFloor: number;
 onChangeFloor: (floor: number) => void;
}) {
 const formatMoney = (value: number) =>
 `${result.preferences.currency} ${Math.round(value).toLocaleString()}`;

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
 <div className="min-w-0">
 <div className="text-base font-semibold text-white">
 设计结果 · {result.projectName}
 </div>
 <div className="mt-1 text-sm text-white/55">
 房间表点击后自动高亮平面图，平面图点击后表格自动滚动定位房间表
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 {floors.map((floor) => {
 const active = floor.floor === activeFloor;
 return (
 <button
 key={floor.floor}
 type="button"
 onClick={() => onChangeFloor(floor.floor)}
 className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
 active
 ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
 : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
 }`}
 >
 楼层 {floor.floor}
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.9fr)]">
 <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
 <div className="mb-3 text-sm font-semibold text-white">
 {language === "zh" ? "方案摘要" : "Design Summary"}
 </div>
 <p className="text-sm leading-7 text-white/70">
 {language === "zh" ? result.summaryZh : result.summaryEn}
 </p>
 </div>

 <div className="grid gap-3 sm:grid-cols-2">
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">建筑面积</div>
 <div className="mt-1 text-base font-semibold text-white">
 {result.site.buildAreaTarget}㎡
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">楼层数</div>
 <div className="mt-1 text-base font-semibold text-white">
 {result.site.floors}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">总预算</div>
 <div className="mt-1 text-base font-semibold text-white">
 {formatMoney(result.budget.totalCost)}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
 <div className="text-xs text-white/45">预算单方</div>
 <div className="mt-1 text-base font-semibold text-white">
 {result.preferences.currency} {result.budget.costPerSqm}/㎡
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

function MaterialsPanel({ result }: { result: HouseDesignPackage }) {
 const formatMoney = (value: number) =>
 `${result.preferences.currency} ${Math.round(value).toLocaleString()}`;

 const groups: MaterialGroup[] = [
 { key: "structure", title: "结构系统", items: result.materials.structure },
 { key: "facade", title: "外立面系统", items: result.materials.facade },
 { key: "roof", title: "屋面系统", items: result.materials.roof },
 { key: "doorsWindows", title: "门窗系统", items: result.materials.doorsWindows },
 { key: "interior", title: "室内硬装", items: result.materials.interior },
 { key: "mep", title: "机电系统", items: result.materials.mep },
 ];

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="mb-4 text-sm font-semibold text-white">材料系统汇总</div>

 <div className="space-y-4">
 {groups.map((group) => {
 const total = group.items.reduce((sum, item) => sum + item.totalPrice, 0);

 return (
 <div
 key={group.key}
 className="rounded-2xl border border-white/10 bg-white/5 p-4"
 >
 <div className="mb-3 flex items-center justify-between gap-3">
 <div className="text-sm font-medium text-white">{group.title}</div>
 <div className="text-xs font-semibold text-cyan-200">
 {formatMoney(total)}
 </div>
 </div>

 <div className="space-y-2">
 {group.items.map((item, index) => (
 <div
 key={`${group.key}-${index}`}
 className="rounded-xl border border-white/10 bg-black/10 px-3 py-3"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="truncate text-sm font-medium text-white">
 {item.name}
 </div>
 <div className="mt-1 text-xs text-white/45">
 {item.specification}
 </div>
 <div className="mt-1 text-xs text-white/45">
 {item.quantity}
 {item.unit} × {item.unitPrice.toLocaleString()}
 </div>
 </div>
 <div className="shrink-0 text-xs font-semibold text-white/75">
 {formatMoney(item.totalPrice)}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

function BudgetPanel({
 result,
 language,
}: {
 result: HouseDesignPackage;
 language: Language;
}) {
 const formatMoney = (value: number) =>
 `${result.preferences.currency} ${Math.round(value).toLocaleString()}`;

 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="mb-4 text-sm font-semibold text-white">预算构成</div>

 <div className="space-y-3">
 {result.budget.breakdown.map((item) => (
 <div
 key={item.key}
 className="rounded-2xl border border-white/10 bg-white/5 p-4"
 >
 <div className="flex items-center justify-between gap-3">
 <div>
 <div className="text-sm font-medium text-white">
 {language === "zh" ? item.labelZh : item.labelEn}
 </div>
 <div className="mt-1 text-xs text-white/45">
 {(item.ratio * 100).toFixed(0)}%
 </div>
 </div>
 <div className="text-sm font-semibold text-cyan-200">
 {formatMoney(item.value)}
 </div>
 </div>

 <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
 <div
 className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
 style={{ width: `${item.ratio * 100}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function DesignResultPanel({
 result,
 language = "zh",
}: {
 result: HouseDesignPackage | null;
 language?: Language;
}) {
 const [activeFloor, setActiveFloor] = useState<number>(1);
 const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

 const floors = result?.floorplans ?? [];

 const currentFloor = useMemo(() => {
 return floors.find((item) => item.floor === activeFloor) ?? floors[0];
 }, [floors, activeFloor]);

 useEffect(() => {
 if (floors.length > 0) {
 setActiveFloor(floors[0].floor);
 setSelectedRoomId(null);
 }
 }, [result, floors]);

 if (!result || !currentFloor) {
 return (
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 p-6 text-sm text-white/60 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 暂无设计结果，请先生成方案。
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="rounded-[28px] border border-white/10 bg-[#0f131b]/95 px-5 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <div className="text-sm font-semibold text-white">正式方案书导出</div>
 <div className="mt-1 text-xs text-white/50">
 导出最开始那版白底正式方案书 PDF
 </div>
 </div>
 <ExportDesignPdfButton
 targetId="design-report-print-root"
 filename={result.projectName || "design-report"}
 />
 </div>
 </div>

 <MergedSummaryHeader
 result={result}
 language={language}
 floors={floors}
 activeFloor={activeFloor}
 onChangeFloor={(floor) => {
 setActiveFloor(floor);
 setSelectedRoomId(null);
 }}
 />

 <GeneratedFloorplanCanvas
 floor={currentFloor}
 language={language}
 selectedRoomId={selectedRoomId}
 onRoomSelect={(room) => setSelectedRoomId(room?.id ?? null)}
 />

 <RoomScheduleTable
 rooms={currentFloor.rooms}
 axisX={currentFloor.axisX}
 axisY={currentFloor.axisY}
 language={language}
 selectedRoomId={selectedRoomId}
 onSelectRoom={(roomId: string) => setSelectedRoomId(roomId ?? null)}
 />

 <GeneratedElevationCanvas result={result} />
 <GeneratedSectionCanvas result={result} />
 <MaterialsPanel result={result} />
 <BudgetPanel result={result} language={language} />

 <div
 style={{
 position: "fixed",
 left: "-10000px",
 top: 0,
 width: "1200px",
 zIndex: -1,
 opacity: 1,
 pointerEvents: "none",
 }}
 >
 <PrintableDesignReport result={result} />
 </div>
 </div>
 );
}

export default function DesignStudioPage() {
 const [brief, setBrief] = useState<HouseDesignBrief>(DEFAULT_DESIGN_BRIEF);
 const [generatedResult, setGeneratedResult] = useState<HouseDesignPackage | null>(null);
 const [committedResult, setCommittedResult] = useState<HouseDesignPackage | null>(null);
 const [generating, setGenerating] = useState(false);

 const displayResult = committedResult ?? generatedResult;

 const quickStats = useMemo(() => {
 const area = num(brief.site.buildAreaTarget, 0);
 const budget = num(brief.preferences.totalBudget, 0);
 const ratio = area > 0 ? Math.round(budget / area) : 0;
 return { area, budget, ratio };
 }, [brief]);

 const handleGenerate = () => {
 setGenerating(true);

 const next = generatePackage(brief);
 setGeneratedResult(next);
 setCommittedResult(null);

 window.setTimeout(() => {
 setGenerating(false);
 }, 450);
 };

 const statCardStyle: CSSProperties = { minWidth: 0 };

 return (
 <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#091018_0%,#0c121a_35%,#0b1016_100%)] text-white">
 <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
 <div className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
 <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
 <div>
 <div className="mb-2 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
 DreamBuilder · Design Studio
 </div>
 <h1 className="text-3xl font-semibold tracking-tight text-white">
 专业房屋设计与预算系统
 </h1>
 <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
 当前版本已支持：完整专业参数表单、材料预算输出、房间编号与真实坐标联动、房间表点击自动高亮平面图、平面图点击自动滚动定位房间表、立面图、剖面图与正式版 PDF 导出。现已新增下半区交互编辑工作台骨架，后续将继续接入家具拖拽、隔墙拖拽与多视图联动。
 </p>
 </div>

 <div className="grid gap-3 sm:grid-cols-3">
 <div
 style={statCardStyle}
 className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
 >
 <div className="text-xs text-white/45">建筑面积</div>
 <div className="mt-1 text-lg font-semibold text-white">
 {quickStats.area}㎡
 </div>
 </div>
 <div
 style={statCardStyle}
 className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
 >
 <div className="text-xs text-white/45">目标预算</div>
 <div className="mt-1 text-lg font-semibold text-white">
 {brief.preferences.currency}{" "}
 {Math.round(quickStats.budget).toLocaleString()}
 </div>
 </div>
 <div
 style={statCardStyle}
 className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
 >
 <div className="text-xs text-white/45">预算单方</div>
 <div className="mt-1 text-lg font-semibold text-white">
 {brief.preferences.currency} {quickStats.ratio}/㎡
 </div>
 </div>
 </div>
 </div>
 </div>

 {generating ? (
 <div className="mb-6 rounded-[28px] border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
 正在生成方案、图纸与正式版方案书...
 </div>
 ) : null}

 <div className="grid gap-6 xl:grid-cols-[560px_minmax(0,1fr)]">
 <DesignBriefPanel
 value={brief}
 onChange={setBrief}
 onGenerate={handleGenerate}
 generating={generating}
 />
 <DesignResultPanel result={displayResult} language={brief.language} />
 </div>

 <div className="mt-8">
 <InteractiveDesignEditor
 designPackage={displayResult}
 language={brief.language}
 onSave={(nextPackage) => {
 setCommittedResult(nextPackage);
 }}
 />
 </div>
 </div>
 </main>
 );
}