"use client";

import React, { useEffect, useState } from "react";
import type { HouseItem } from "./DetailModal";

type WorldHallText = {
 hallTitle: string;
 hallDesc: string;
 honorList: string;
 view: string;

 favoritesTitle?: string;
 emptyFavorites?: string;
 awardPopular?: string;
 awardPopularDesc?: string;
 awardTrending?: string;
 awardTrendingDesc?: string;
 awardPeak?: string;
 awardPeakDesc?: string;
 awardStarter?: string;
 awardStarterDesc?: string;

 [key: string]: unknown;
};

type UiSet = {
 btnSmallIdle: string;
 btnSmallActive: string;
};

type WorldHallOfHonorProps = {
 language: "zh" | "en";
 t: WorldHallText;
 ui: UiSet;
 galleryHouses: HouseItem[];
 onOpenDetail: (house: HouseItem) => void;
 onLike: (id: number) => void;
 onSave: (id: number) => void;
};

type HonorCard = {
 key: string;
 title: string;
 description: string;
 winner: HouseItem | null;
 metricLabel: string;
 metricValue: string;
 rank: string;
 theme: "gold" | "silver" | "bronze" | "iron";
};

function getViews(house: HouseItem) {
 return house.likes * 12 + house.saves * 7 + 120;
}

function getLuxuryScore(house: HouseItem) {
 return house.likes * 3 + house.saves * 5 + (house.id % 97);
}

function getStarterScore(house: HouseItem) {
 return house.likes + house.saves + (house.id % 11);
}

function getThemeClasses(theme: HonorCard["theme"]) {
 if (theme === "gold") {
 return {
 cardBorder:
 "border-amber-300/80 shadow-[0_10px_24px_rgba(212,166,58,0.12)]",
 titleBadge:
 "border-[#e7c567] bg-[linear-gradient(180deg,#fff8dc_0%,#f6d46e_46%,#d49c29_100%)] text-[#7e4d07] shadow-[0_8px_20px_rgba(181,122,31,0.16)]",
 metric:
 "border-[#ecd27d] bg-[linear-gradient(180deg,#fff9e7_0%,#fff1c7_100%)]",
 metricLabel: "text-[#a06c16]",
 metricValue: "text-neutral-900",
 };
 }

 if (theme === "silver") {
 return {
 cardBorder:
 "border-slate-300 shadow-[0_10px_24px_rgba(148,158,171,0.12)]",
 titleBadge:
 "border-[#cfd6dd] bg-[linear-gradient(180deg,#fafbfd_0%,#dfe5eb_46%,#aab3bd_100%)] text-[#56606a] shadow-[0_8px_20px_rgba(120,130,142,0.14)]",
 metric:
 "border-[#d6dce2] bg-[linear-gradient(180deg,#fafbfd_0%,#eef2f6_100%)]",
 metricLabel: "text-[#6b7480]",
 metricValue: "text-neutral-900",
 };
 }

 if (theme === "bronze") {
 return {
 cardBorder:
 "border-orange-300/80 shadow-[0_10px_24px_rgba(185,123,86,0.12)]",
 titleBadge:
 "border-[#d6a27d] bg-[linear-gradient(180deg,#fff1e5_0%,#d89a67_46%,#a75c2f_100%)] text-[#6f3718] shadow-[0_8px_20px_rgba(167,96,51,0.16)]",
 metric:
 "border-[#dfb08d] bg-[linear-gradient(180deg,#fff4ed_0%,#fde5d6_100%)]",
 metricLabel: "text-[#9b572b]",
 metricValue: "text-neutral-900",
 };
 }

 return {
 cardBorder:
 "border-neutral-300 shadow-[0_10px_24px_rgba(77,83,93,0.12)]",
 titleBadge:
 "border-[#5f6770] bg-[linear-gradient(180deg,#4e555e_0%,#2d333a_48%,#171c21_100%)] text-[#eef2f5] shadow-[0_8px_20px_rgba(36,40,46,0.22)]",
 metric:
 "border-[#59616b] bg-[linear-gradient(180deg,#2a3037_0%,#1f242a_100%)]",
 metricLabel: "text-[#b8c0c8]",
 metricValue: "text-white",
 };
}

function MedalSprite({ theme }: { theme: HonorCard["theme"] }) {
 const backgroundPosition =
 theme === "gold"
 ? "left top"
 : theme === "silver"
 ? "right top"
 : theme === "bronze"
 ? "left bottom"
 : "right bottom";

 return (
 <div
 className="h-[108px] w-[108px] shrink-0 bg-no-repeat"
 style={{
 backgroundImage: "url('/medals-sprite.png')",
 backgroundSize: "200% 200%",
 backgroundPosition,
 backgroundColor: "transparent",
 filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.22))",
 }}
 />
 );
}

function handleCardKeyDown(
 e: React.KeyboardEvent<HTMLElement>,
 callback: () => void
) {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 callback();
 }
}

export default function WorldHallOfHonor({
 language,
 t,
 ui,
 galleryHouses,
 onOpenDetail,
 onLike,
 onSave,
}: WorldHallOfHonorProps) {
 const [mounted, setMounted] = useState(false);
 const [showAllFavorites, setShowAllFavorites] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 const safeText = {
 favoritesTitle:
 t.favoritesTitle || (language === "zh" ? "珍藏作品" : "Favorite Works"),
 emptyFavorites:
 t.emptyFavorites ||
 (language === "zh"
 ? "你还没有收藏任何作品"
 : "You have not saved any works yet."),
 awardPopular:
 t.awardPopular || (language === "zh" ? "人气之星" : "Most Popular"),
 awardPopularDesc:
 t.awardPopularDesc ||
 (language === "zh"
 ? "获得最多点赞的热门住宅作品。"
 : "The most liked residential work."),
 awardTrending:
 t.awardTrending || (language === "zh" ? "热度之星" : "Trending Star"),
 awardTrendingDesc:
 t.awardTrendingDesc ||
 (language === "zh"
 ? "当前浏览热度最高的作品。"
 : "The work with the highest viewing heat right now."),
 awardPeak:
 t.awardPeak || (language === "zh" ? "巅峰府邸" : "Peak Estate"),
 awardPeakDesc:
 t.awardPeakDesc ||
 (language === "zh"
 ? "综合质感与收藏表现最突出的作品。"
 : "The strongest overall work in quality and collection performance."),
 awardStarter:
 t.awardStarter ||
 (language === "zh" ? "新秀筑家" : "Starter Highlight"),
 awardStarterDesc:
 t.awardStarterDesc ||
 (language === "zh"
 ? "具备潜力与成长空间的新秀作品。"
 : "A rising work with strong growth potential."),
 };

 const remainingForPeak = [...galleryHouses];
 const peakMansion =
 remainingForPeak.length > 0
 ? [...remainingForPeak].sort(
 (a, b) => getLuxuryScore(b) - getLuxuryScore(a)
 )[0]
 : null;

 const remainingForPopular = galleryHouses.filter(
 (house) => house.id !== peakMansion?.id
 );
 const mostLiked =
 remainingForPopular.length > 0
 ? [...remainingForPopular].sort((a, b) => b.likes - a.likes)[0]
 : null;

 const remainingForTrending = galleryHouses.filter(
 (house) => house.id !== peakMansion?.id && house.id !== mostLiked?.id
 );
 const mostViewed =
 remainingForTrending.length > 0
 ? [...remainingForTrending].sort((a, b) => getViews(b) - getViews(a))[0]
 : null;

 const remainingForStarter = galleryHouses.filter(
 (house) =>
 house.id !== peakMansion?.id &&
 house.id !== mostLiked?.id &&
 house.id !== mostViewed?.id
 );
 const starterWinner =
 remainingForStarter.length > 0
 ? [...remainingForStarter].sort(
 (a, b) => getStarterScore(a) - getStarterScore(b)
 )[0]
 : null;

 const honors: HonorCard[] = [
 {
 key: "peak",
 title: safeText.awardPeak,
 description: safeText.awardPeakDesc,
 winner: peakMansion,
 metricLabel: language === "zh" ? "府邸指数" : "Estate Score",
 metricValue: peakMansion ? `${getLuxuryScore(peakMansion)}` : "--",
 rank: "NO.1",
 theme: "gold",
 },
 {
 key: "popular",
 title: safeText.awardPopular,
 description: safeText.awardPopularDesc,
 winner: mostLiked,
 metricLabel: language === "zh" ? "点赞数" : "Likes",
 metricValue: mostLiked ? `${mostLiked.likes}` : "--",
 rank: "NO.2",
 theme: "silver",
 },
 {
 key: "trending",
 title: safeText.awardTrending,
 description: safeText.awardTrendingDesc,
 winner: mostViewed,
 metricLabel: language === "zh" ? "浏览热度" : "Views",
 metricValue: mostViewed ? `${getViews(mostViewed)}` : "--",
 rank: "NO.3",
 theme: "bronze",
 },
 {
 key: "starter",
 title: safeText.awardStarter,
 description: safeText.awardStarterDesc,
 winner: starterWinner,
 metricLabel: language === "zh" ? "筑家成本指数" : "Starter Score",
 metricValue: starterWinner ? `${getStarterScore(starterWinner)}` : "--",
 rank: "NO.4",
 theme: "iron",
 },
 ];

 const favorites = galleryHouses.filter((house) => house.saved);
 const displayedFavorites = showAllFavorites
 ? favorites
 : favorites.slice(0, 10);
 const hasMoreFavorites = favorites.length > 10;

 return (
 <section className="space-y-6">
 <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="pointer-events-none absolute left-[-80px] top-[120px] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.10)_0%,rgba(245,158,11,0.04)_38%,transparent_72%)] blur-2xl" />
 <div className="pointer-events-none absolute right-[-90px] top-[150px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.08)_0%,rgba(251,191,36,0.03)_42%,transparent_72%)] blur-2xl" />

 <div className="relative mb-6 flex flex-col items-center justify-center gap-3 text-center">
 <h3
 className="text-3xl font-black tracking-[0.05em] md:text-4xl"
 style={{
 color: "#f0b326",
 fontFamily:
 '"Trebuchet MS", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif',
 textShadow:
 "0 1px 0 #fff3c7, 0 2px 0 #e0a81f, 0 3px 0 #c78d12, 0 4px 8px rgba(180,120,10,0.20)",
 }}
 >
 {t.hallTitle}
 </h3>

 <div className="h-[2px] w-36 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
 <p className="max-w-2xl text-sm text-neutral-500">{t.hallDesc}</p>
 </div>

 <div className="relative mb-5 flex items-center justify-between">
 <div className="text-sm font-medium text-neutral-500">
 {t.honorList}
 </div>
 <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
 TOP 4
 </span>
 </div>

 <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 {honors.map((honor) => {
 const theme = getThemeClasses(honor.theme);

 return (
 <article
 key={honor.key}
 role={honor.winner ? "button" : undefined}
 tabIndex={honor.winner ? 0 : -1}
 onClick={() => {
 if (honor.winner) onOpenDetail(honor.winner);
 }}
 onKeyDown={(e) => {
 if (honor.winner) {
 handleCardKeyDown(e, () => onOpenDetail(honor.winner!));
 }
 }}
 className={`group flex min-h-[540px] flex-col overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,#fffdf8_0%,#faf7f0_100%)] ${theme.cardBorder} transition-all duration-[500ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:scale-[1.018] hover:shadow-[0_22px_42px_rgba(0,0,0,0.12)] ${
 honor.winner ? "cursor-pointer" : ""
 }`}
 style={{
 opacity: mounted ? 1 : 0,
 }}
 >
 {honor.winner ? (
 <>
 <div className="relative h-52 overflow-hidden border-b border-black/5">
 <img
 src={honor.winner.image}
 alt={honor.winner.title}
 className="h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] group-hover:brightness-105"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/18 to-transparent" />

 <div className="pointer-events-none absolute left-3 top-1 z-20">
 <MedalSprite theme={honor.theme} />
 </div>

 <div className="absolute bottom-4 left-4 right-4 text-white">
 <div className="mt-1 line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-[-2px]">
 {honor.winner.title}
 </div>
 </div>
 </div>

 <div className="flex flex-1 flex-col p-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
 <div
 className={`mb-3 inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black tracking-[0.04em] shadow-[0_8px_18px_rgba(0,0,0,0.08)] ${theme.titleBadge}`}
 >
 {honor.title}
 </div>

 <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-neutral-600">
 {honor.description}
 </p>

 <div
 className={`mt-3 rounded-2xl border p-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] ${theme.metric}`}
 >
 <div className={`text-xs ${theme.metricLabel}`}>
 {honor.metricLabel}
 </div>
 <div
 className={`mt-1 text-base font-semibold ${theme.metricValue}`}
 >
 {honor.metricValue}
 </div>
 </div>

 <div className="mt-3 flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="truncate text-sm font-medium text-neutral-900">
 {language === "zh"
 ? honor.winner.plotZh || "未设置地块"
 : honor.winner.plotEn || "No plot"}
 </div>
 <div className="mt-1 truncate text-xs text-neutral-500">
 by {honor.winner.author}
 </div>
 </div>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onOpenDetail(honor.winner!);
 }}
 className={`${ui.btnSmallIdle} shrink-0 px-3 py-2 text-xs font-medium transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.08] hover:shadow-[0_14px_28px_rgba(0,0,0,0.14)]`}
 >
 {t.view}
 </button>
 </div>

 <div className="mt-auto pt-4">
 <div className="flex items-center gap-3 text-sm text-neutral-500">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onLike(honor.winner!.id);
 }}
 className={`${
 honor.winner.liked
 ? ui.btnSmallActive
 : ui.btnSmallIdle
 } px-3 py-2 text-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.1] hover:shadow-[0_14px_28px_rgba(0,0,0,0.14)]`}
 >
 {honor.winner.liked ? "❤️" : "🤍"} {honor.winner.likes}
 </button>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onSave(honor.winner!.id);
 }}
 className={`${
 honor.winner.saved
 ? ui.btnSmallActive
 : ui.btnSmallIdle
 } px-3 py-2 text-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.1] hover:shadow-[0_14px_28px_rgba(0,0,0,0.14)]`}
 >
 {honor.winner.saved ? "⭐" : "☆"} {honor.winner.saves}
 </button>
 </div>
 </div>
 </div>
 </>
 ) : (
 <div className="flex min-h-[540px] items-center justify-center p-6 text-sm text-neutral-400">
 No Data
 </div>
 )}
 </article>
 );
 })}
 </div>
 </div>

 <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
 <div className="mb-4 flex items-center justify-between">
 <h4 className="text-base font-semibold">{safeText.favoritesTitle}</h4>
 <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
 {favorites.length}
 </span>
 </div>

 {favorites.length === 0 ? (
 <div className="rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-500">
 {safeText.emptyFavorites}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
 {displayedFavorites.map((house) => (
 <article
 key={house.id}
 role="button"
 tabIndex={0}
 onClick={() => onOpenDetail(house)}
 onKeyDown={(e) => handleCardKeyDown(e, () => onOpenDetail(house))}
 className="group flex min-h-[320px] cursor-pointer flex-col overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_26px_rgba(0,0,0,0.08)]"
 >
 <div className="relative h-40 overflow-hidden">
 <img
 src={house.image}
 alt={house.title}
 className="h-full w-full object-cover transition-transform duration-220 ease-out group-hover:scale-[1.02] group-hover:brightness-105"
 />
 <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
 {language === "zh" ? house.styleZh : house.styleEn}
 </div>
 </div>

 <div className="flex flex-1 flex-col p-3">
 <div className="mb-2 flex items-start justify-between gap-2">
 <div className="min-w-0">
 <h4 className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-5">
 {house.title}
 </h4>
 <p className="mt-1 truncate text-xs text-neutral-500">
 by {house.author}
 </p>
 <p className="mt-1 truncate text-[11px] text-neutral-400">
 {language === "zh"
 ? house.plotZh || "未设置地块"
 : house.plotEn || "No plot"}
 </p>
 </div>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onOpenDetail(house);
 }}
 className={`${ui.btnSmallIdle} shrink-0 px-2.5 py-2 text-[11px] font-medium`}
 >
 {t.view}
 </button>
 </div>

 <div className="mt-auto pt-3">
 <div className="flex items-center gap-2 text-sm text-neutral-500">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onLike(house.id);
 }}
 className={`${
 house.liked ? ui.btnSmallActive : ui.btnSmallIdle
 } px-2.5 py-2 text-[12px]`}
 >
 {house.liked ? "❤️" : "🤍"} {house.likes}
 </button>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onSave(house.id);
 }}
 className={`${
 house.saved ? ui.btnSmallActive : ui.btnSmallIdle
 } px-2.5 py-2 text-[12px]`}
 >
 {house.saved ? "⭐" : "☆"} {house.saves}
 </button>
 </div>
 </div>
 </div>
 </article>
 ))}
 </div>

 {hasMoreFavorites ? (
 <div className="mt-5 flex justify-center">
 <button
 type="button"
 onClick={() => setShowAllFavorites((prev) => !prev)}
 className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-[0_8px_18px_rgba(181,122,31,0.10)] transition-all duration-220 ease-out hover:-translate-y-1 hover:border-amber-300 hover:bg-amber-100 hover:shadow-[0_14px_26px_rgba(181,122,31,0.14)]"
 >
 {showAllFavorites
 ? language === "zh"
 ? "收起"
 : "Show Less"
 : language === "zh"
 ? `查看更多（还有 ${favorites.length - 10} 个）`
 : `View More (${favorites.length - 10} more)`}
 </button>
 </div>
 ) : null}
 </>
 )}
 </div>
 </section>
 );
}