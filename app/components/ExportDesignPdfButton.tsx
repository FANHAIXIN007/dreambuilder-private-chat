"use client";

import React, { useState } from "react";

type Props = {
 targetId: string;
 filename: string;
};

function safeFilename(name: string) {
 return String(name || "design-report")
 .trim()
 .replace(/[\\/:*?"<>|]+/g, "-")
 .replace(/\s+/g, "-")
 .replace(/-+/g, "-")
 .replace(/^-|-$/g, "")
 .toLowerCase();
}

export default function ExportDesignPdfButton({
 targetId,
 filename,
}: Props) {
 const [exporting, setExporting] = useState(false);

 const handleExport = async () => {
 try {
 setExporting(true);

 const target = document.getElementById(targetId);
 if (!target) {
 alert("未找到可导出的白底方案书区域。");
 return;
 }

 if ("fonts" in document) {
 try {
 // @ts-ignore
 await document.fonts.ready;
 } catch {}
 }

 const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
 import("html2canvas-pro"),
 import("jspdf"),
 ]);

 const pageNodes = Array.from(
 target.querySelectorAll<HTMLElement>('[data-report-page="true"]')
 );

 if (pageNodes.length === 0) {
 alert("未找到分页节点，请检查 PrintableDesignReport 的页面标记。");
 return;
 }

 const pdf = new jsPDF({
 orientation: "p",
 unit: "pt",
 format: "a4",
 compress: true,
 });

 const pdfWidth = pdf.internal.pageSize.getWidth();
 const pdfHeight = pdf.internal.pageSize.getHeight();

 for (let i = 0; i < pageNodes.length; i += 1) {
 const pageEl = pageNodes[i];

 const canvas = await html2canvas(pageEl, {
 scale: 2,
 useCORS: true,
 backgroundColor: "#ffffff",
 logging: false,
 windowWidth: Math.max(pageEl.scrollWidth, pageEl.clientWidth),
 windowHeight: Math.max(pageEl.scrollHeight, pageEl.clientHeight),
 });

 const imgData = canvas.toDataURL("image/jpeg", 0.96);

 const imgWidth = pdfWidth;
 const imgHeight = (canvas.height * imgWidth) / canvas.width;

 if (i > 0) {
 pdf.addPage();
 }

 if (imgHeight <= pdfHeight) {
 pdf.addImage(
 imgData,
 "JPEG",
 0,
 0,
 imgWidth,
 imgHeight,
 undefined,
 "FAST"
 );
 } else {
 const fittedWidth = (canvas.width * pdfHeight) / canvas.height;
 const x = (pdfWidth - fittedWidth) / 2;

 pdf.addImage(
 imgData,
 "JPEG",
 x,
 0,
 fittedWidth,
 pdfHeight,
 undefined,
 "FAST"
 );
 }
 }

 pdf.save(`${safeFilename(filename)}.pdf`);
 } catch (error) {
 console.error(error);
 alert("PDF 导出失败，请查看控制台报错。");
 } finally {
 setExporting(false);
 }
 };

 return (
 <button
 type="button"
 onClick={handleExport}
 disabled={exporting}
 className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {exporting ? "正在导出正式方案书..." : "导出正式版 PDF"}
 </button>
 );
}