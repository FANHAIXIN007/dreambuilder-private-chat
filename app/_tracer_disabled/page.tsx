"use client";

import React, { useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type Mode = "draw" | "pan";

function pointsToString(points: Point[]) {
 return points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ");
}

function polygonToSvgPath(points: Point[]) {
 if (!points.length) return "";
 const [first, ...rest] = points;
 return [
 `M ${Math.round(first.x)} ${Math.round(first.y)}`,
 ...rest.map((p) => `L ${Math.round(p.x)} ${Math.round(p.y)}`),
 "Z",
 ].join(" ");
}

export default function IslandOutlineTracer() {
 const [imageUrl, setImageUrl] = useState<string>("/island-map.png");
 const [imageName, setImageName] = useState<string>("island-map.png");
 const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
 const [points, setPoints] = useState<Point[]>([]);
 const [mode, setMode] = useState<Mode>("draw");
 const [scale, setScale] = useState(1);
 const [offset, setOffset] = useState({ x: 0, y: 0 });
 const [dragging, setDragging] = useState(false);
 const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
 const [showLabels, setShowLabels] = useState(true);
 const [hover, setHover] = useState<Point | null>(null);
 const [closeShape, setCloseShape] = useState(true);

 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const viewportRef = useRef<HTMLDivElement | null>(null);
 const imgRef = useRef<HTMLImageElement | null>(null);

 const polygonString = useMemo(() => pointsToString(points), [points]);
 const svgPath = useMemo(() => polygonToSvgPath(points), [points]);

 const resetView = () => {
 setScale(1);
 setOffset({ x: 0, y: 0 });
 };

 const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const url = URL.createObjectURL(file);
 setImageUrl(url);
 setImageName(file.name);
 setPoints([]);
 resetView();
 };

 const toImageCoords = (clientX: number, clientY: number) => {
 const viewport = viewportRef.current;
 const img = imgRef.current;
 if (!viewport || !img || !imageSize) return null;

 const imgRect = img.getBoundingClientRect();
 const x = ((clientX - imgRect.left) / imgRect.width) * imageSize.width;
 const y = ((clientY - imgRect.top) / imgRect.height) * imageSize.height;

 if (x < 0 || y < 0 || x > imageSize.width || y > imageSize.height) return null;
 return { x, y };
 };

 const handleCanvasClick = (e: React.MouseEvent) => {
 if (mode !== "draw" || dragging) return;
 const coords = toImageCoords(e.clientX, e.clientY);
 if (!coords) return;
 setPoints((prev) => [...prev, { x: coords.x, y: coords.y }]);
 };

 const handleMouseMove = (e: React.MouseEvent) => {
 if (mode === "pan" && dragging) {
 const dx = e.clientX - dragStart.x;
 const dy = e.clientY - dragStart.y;
 setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
 setDragStart({ x: e.clientX, y: e.clientY });
 return;
 }

 const coords = toImageCoords(e.clientX, e.clientY);
 setHover(coords ? { x: coords.x, y: coords.y } : null);
 };

 const handleMouseDown = (e: React.MouseEvent) => {
 if (mode !== "pan") return;
 setDragging(true);
 setDragStart({ x: e.clientX, y: e.clientY });
 };

 const handleMouseUp = () => {
 setTimeout(() => setDragging(false), 0);
 };

 const handleWheel = (e: React.WheelEvent) => {
 e.preventDefault();
 const next = e.deltaY < 0 ? Math.min(scale * 1.1, 6) : Math.max(scale / 1.1, 0.3);
 setScale(next);
 };

 const copyText = async (text: string) => {
 try {
 await navigator.clipboard.writeText(text);
 } catch {}
 };

 const exportJson = () => {
 const payload = {
 imageName,
 imageSize,
 points,
 polygon: polygonString,
 svgPath,
 };
 const blob = new Blob([JSON.stringify(payload, null, 2)], {
 type: "application/json",
 });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `${imageName.replace(/\.[^.]+$/, "") || "outline"}-polygon.json`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const btnBase =
 "inline-flex items-center rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50";
 const btnActive =
 "inline-flex items-center rounded-2xl border border-black bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90";

 return (
 <div className="min-h-screen bg-neutral-100 p-4 md:p-6">
 <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[1.4fr_0.6fr]">
 <div className="rounded-3xl bg-white shadow-lg">
 <div className="border-b border-neutral-200 px-6 pb-4 pt-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-semibold">岛屿描边工具</h1>
 <p className="mt-1 text-sm text-neutral-500">
 上传底图后沿海岸线逐点描边。先锁整岛母轮廓，后面再在内部细分可售地块。
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setMode("draw")}
 className={mode === "draw" ? btnActive : btnBase}
 >
 描点
 </button>
 <button
 onClick={() => setMode("pan")}
 className={mode === "pan" ? btnActive : btnBase}
 >
 平移
 </button>
 </div>
 </div>
 </div>

 <div className="p-6">
 <div className="mb-3 flex flex-wrap gap-2">
 <button onClick={() => fileInputRef.current?.click()} className={btnActive}>
 上传底图
 </button>
 <button
 onClick={() => setPoints((prev) => prev.slice(0, -1))}
 className={btnBase}
 >
 撤销
 </button>
 <button onClick={() => setPoints([])} className={btnBase}>
 清空
 </button>
 <button
 onClick={() => setScale((s) => Math.min(s * 1.15, 6))}
 className={btnBase}
 >
 放大
 </button>
 <button
 onClick={() => setScale((s) => Math.max(s / 1.15, 0.3))}
 className={btnBase}
 >
 缩小
 </button>
 <button onClick={resetView} className={btnBase}>
 重置视图
 </button>
 <button onClick={() => setShowLabels((v) => !v)} className={btnBase}>
 {showLabels ? "隐藏点号" : "显示点号"}
 </button>
 <button onClick={() => setCloseShape((v) => !v)} className={btnBase}>
 {closeShape ? "取消闭合预览" : "闭合预览"}
 </button>
 </div>

 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={onUpload}
 />

 <div
 ref={viewportRef}
 className="relative h-[78vh] overflow-hidden rounded-[28px] border border-neutral-200 bg-sky-100"
 onClick={handleCanvasClick}
 onMouseMove={handleMouseMove}
 onMouseDown={handleMouseDown}
 onMouseUp={handleMouseUp}
 onMouseLeave={() => {
 setHover(null);
 handleMouseUp();
 }}
 onWheel={handleWheel}
 >
 <div
 className="absolute left-1/2 top-1/2 origin-center"
 style={{
 transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
 }}
 >
 <div className="relative inline-block select-none">
 <img
 ref={imgRef}
 src={imageUrl}
 alt="outline base"
 className="max-h-[78vh] max-w-none rounded-2xl shadow-md"
 draggable={false}
 onLoad={(e) => {
 setImageSize({
 width: e.currentTarget.naturalWidth,
 height: e.currentTarget.naturalHeight,
 });
 }}
 />

 {imageSize && (
 <svg
 viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
 className="absolute inset-0 h-full w-full"
 onClick={handleCanvasClick}
 onMouseMove={handleMouseMove}
>
 {points.length >= 2 && (
 <polyline
 points={pointsToString(points)}
 fill="none"
 stroke="white"
 strokeWidth={4}
 strokeLinejoin="round"
 strokeLinecap="round"
 />
 )}

 {closeShape && points.length >= 3 && (
 <polygon
 points={polygonString}
 fill="rgba(255,255,255,0.18)"
 stroke="rgba(255,255,255,0.95)"
 strokeWidth={3}
 strokeLinejoin="round"
 />
 )}

 {points.map((p, i) => (
 <g key={`${p.x}-${p.y}-${i}`}>
 <circle cx={p.x} cy={p.y} r={6} fill="black" opacity={0.85} />
 <circle cx={p.x} cy={p.y} r={4} fill="white" />
 {showLabels && (
 <text
 x={p.x + 10}
 y={p.y - 10}
 fontSize={20}
 fill="white"
 stroke="black"
 strokeWidth={0.8}
 >
 {i + 1}
 </text>
 )}
 </g>
 ))}

 {hover && (
 <g>
 <circle cx={hover.x} cy={hover.y} r={4} fill="rgba(255,255,255,0.9)" />
 <text
 x={hover.x + 12}
 y={hover.y + 16}
 fontSize={18}
 fill="white"
 stroke="black"
 strokeWidth={0.8}
 >
 {`${Math.round(hover.x)}, ${Math.round(hover.y)}`}
 </text>
 </g>
 )}
 </svg>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="rounded-3xl bg-white shadow-lg">
 <div className="border-b border-neutral-200 px-6 pb-4 pt-6">
 <h2 className="text-xl font-semibold">坐标与导出</h2>
 </div>

 <div className="space-y-4 p-6">
 <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
 <div>图片：{imageName}</div>
 <div>尺寸：{imageSize ? `${imageSize.width} × ${imageSize.height}` : "未加载"}</div>
 <div>点数：{points.length}</div>
 <div>模式：{mode === "draw" ? "描点" : "平移"}</div>
 <div>缩放：{scale.toFixed(2)}x</div>
 </div>

 <div>
 <div className="mb-2 text-sm font-medium">Polygon points</div>
 <textarea
 value={polygonString}
 readOnly
 className="min-h-[180px] w-full rounded-2xl border border-neutral-300 bg-white p-3 text-sm outline-none"
 />
 <div className="mt-2 flex gap-2">
 <button onClick={() => copyText(polygonString)} className={btnBase}>
 复制 points
 </button>
 </div>
 </div>

 <div>
 <div className="mb-2 text-sm font-medium">SVG path</div>
 <textarea
 value={svgPath}
 readOnly
 className="min-h-[140px] w-full rounded-2xl border border-neutral-300 bg-white p-3 text-sm outline-none"
 />
 <div className="mt-2 flex gap-2">
 <button onClick={() => copyText(svgPath)} className={btnBase}>
 复制 path
 </button>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 <button onClick={exportJson} className={btnActive}>
 导出 JSON
 </button>
 </div>

 <div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
 <div className="font-medium text-neutral-900">建议流程</div>
 <div>1. 先沿整岛海岸线描完整母轮廓。</div>
 <div>2. 把 points 发给我，我来接入地图代码。</div>
 <div>3. 再复制一份，继续描内部可建区、小区块。</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}