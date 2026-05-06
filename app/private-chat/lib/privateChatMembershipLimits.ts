"use client";

export type PrivateChatMembershipLevel = "free" | "vip" | "svip";

export type PrivateChatRoomScene = "public" | "private" | "secret";

export type PrivateChatMediaType = "image" | "video";

export type PrivateChatMembershipLimits = {
 level: PrivateChatMembershipLevel;
 label: string;
 displayName: string;
 description: string;

 canSendMediaInPublicRoom: boolean;
 canSendMediaInPrivateChat: boolean;
 canSendMediaInSecretRoom: boolean;

 maxImageSizeBytes: number;
 maxVideoSizeBytes: number;

 // 这里暂时保留旧字段名，避免牵动其他已引用的文件。
 // 实际业务含义按“月上传数量 / 月上传流量”来使用。
 dailyUploadCountLimit: number;
 dailyUploadTrafficBytes: number;

 maxFriends: number;
 maxBlockedUsers: number;
 maxFavoriteRooms: number;

 features: string[];
};

export type PrivateChatMediaPermissionResult = {
 allowed: boolean;
 message: string;
};

export const PRIVATE_CHAT_MEMBERSHIP_LIMITS: Record<
 PrivateChatMembershipLevel,
 PrivateChatMembershipLimits
> = {
 free: {
 level: "free",
 label: "Free",
 displayName: "普通会员",
 description:
 "普通会员可使用基础聊天、私聊、暗语房间、好友、黑名单和收藏房间，但不能发送图片和视频。",

 canSendMediaInPublicRoom: false,
 canSendMediaInPrivateChat: false,
 canSendMediaInSecretRoom: false,

 maxImageSizeBytes: 0,
 maxVideoSizeBytes: 0,
 dailyUploadCountLimit: 0,
 dailyUploadTrafficBytes: 0,

 maxFriends: 20,
 maxBlockedUsers: 50,
 maxFavoriteRooms: 5,

 features: [
 "公共大厅文字聊天",
 "一对一文字私聊",
 "暗语私密房间文字聊天",
 "最多 20 个好友 / 关注",
 "最多 50 个黑名单用户",
 "最多 5 个收藏房间",
 "不可发送图片和视频",
 "无媒体上传流量",
 ],
 },

 vip: {
 level: "vip",
 label: "VIP",
 displayName: "VIP 会员",
 description:
 "VIP 会员适合高频聊天用户，可在私聊和暗语房间发送图片与视频，并拥有更高的好友、黑名单、收藏房间容量和月媒体流量。",

 canSendMediaInPublicRoom: false,
 canSendMediaInPrivateChat: true,
 canSendMediaInSecretRoom: true,

 maxImageSizeBytes: 5 * 1024 * 1024,
 maxVideoSizeBytes: 50 * 1024 * 1024,

 // 实际按“每月”计算：VIP 1GB/月
 dailyUploadCountLimit: 50,
 dailyUploadTrafficBytes: 1 * 1024 * 1024 * 1024,

 maxFriends: 100,
 maxBlockedUsers: 200,
 maxFavoriteRooms: 30,

 features: [
 "包含普通会员全部文字聊天能力",
 "可在一对一私聊发送图片",
 "可在一对一私聊发送视频",
 "可在暗语房间发送图片",
 "可在暗语房间发送视频",
 "公共大厅仅支持文字聊天",
 "单张图片最高 5MB",
 "单个视频最高 50MB",
 "每月最多上传 50 个媒体文件",
 "每月上传流量最高 1GB",
 "最多 100 个好友 / 关注",
 "最多 200 个黑名单用户",
 "最多 30 个收藏房间",
 ],
 },

 svip: {
 level: "svip",
 label: "SVIP",
 displayName: "SVIP 会员",
 description:
 "SVIP 会员适合重度私密聊天用户，拥有更高的媒体上传额度、更多关系容量和未来高级私密功能优先体验权限。",

 canSendMediaInPublicRoom: false,
 canSendMediaInPrivateChat: true,
 canSendMediaInSecretRoom: true,

 maxImageSizeBytes: 10 * 1024 * 1024,
 maxVideoSizeBytes: 200 * 1024 * 1024,

 // 实际按“每月”计算：SVIP 10GB/月
 dailyUploadCountLimit: 200,
 dailyUploadTrafficBytes: 10 * 1024 * 1024 * 1024,

 maxFriends: 500,
 maxBlockedUsers: 1000,
 maxFavoriteRooms: 100,

 features: [
 "包含 VIP 全部能力",
 "可在一对一私聊发送图片和视频",
 "可在暗语房间发送图片和视频",
 "公共大厅仅支持文字聊天",
 "单张图片最高 10MB",
 "单个视频最高 200MB",
 "每月最多上传 200 个媒体文件",
 "每月上传流量最高 10GB",
 "最多 500 个好友 / 关注",
 "最多 1000 个黑名单用户",
 "最多 100 个收藏房间",
 "未来高级私密功能优先开放",
 ],
 },
};

export function normalizePrivateChatMembershipLevel(
 value?: string | null
): PrivateChatMembershipLevel {
 if (value === "vip") return "vip";
 if (value === "svip") return "svip";

 return "free";
}

export function getPrivateChatMembershipLimits(
 level?: string | null
): PrivateChatMembershipLimits {
 return PRIVATE_CHAT_MEMBERSHIP_LIMITS[
 normalizePrivateChatMembershipLevel(level)
 ];
}

export function formatPrivateChatBytes(bytes: number) {
 if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

 const units = ["B", "KB", "MB", "GB", "TB"];
 let size = bytes;
 let unitIndex = 0;

 while (size >= 1024 && unitIndex < units.length - 1) {
 size /= 1024;
 unitIndex += 1;
 }

 return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${
 units[unitIndex]
 }`;
}

export function canSendPrivateChatMedia(params: {
 level?: string | null;
 scene: PrivateChatRoomScene;
 mediaType: PrivateChatMediaType;
 fileSizeBytes?: number;
}): PrivateChatMediaPermissionResult {
 const limits = getPrivateChatMembershipLimits(params.level);

 if (params.scene === "public") {
 return {
 allowed: false,
 message:
 "公共聊天室暂不支持发送图片或视频，请在私聊或暗语房间中使用媒体功能。",
 };
 }

 if (params.scene === "private" && !limits.canSendMediaInPrivateChat) {
 return {
 allowed: false,
 message: "普通会员暂不支持在私聊中发送图片或视频，开通 VIP 后即可使用。",
 };
 }

 if (params.scene === "secret" && !limits.canSendMediaInSecretRoom) {
 return {
 allowed: false,
 message:
 "普通会员暂不支持在暗语房间中发送图片或视频，开通 VIP 后即可使用。",
 };
 }

 const fileSizeBytes =
 typeof params.fileSizeBytes === "number" &&
 Number.isFinite(params.fileSizeBytes)
 ? params.fileSizeBytes
 : 0;

 if (params.mediaType === "image") {
 if (limits.maxImageSizeBytes <= 0) {
 return {
 allowed: false,
 message: "当前会员等级暂不支持发送图片。",
 };
 }

 if (fileSizeBytes > limits.maxImageSizeBytes) {
 return {
 allowed: false,
 message: `图片文件过大，当前等级最高支持 ${formatPrivateChatBytes(
 limits.maxImageSizeBytes
 )}。`,
 };
 }
 }

 if (params.mediaType === "video") {
 if (limits.maxVideoSizeBytes <= 0) {
 return {
 allowed: false,
 message: "当前会员等级暂不支持发送视频。",
 };
 }

 if (fileSizeBytes > limits.maxVideoSizeBytes) {
 return {
 allowed: false,
 message: `视频文件过大，当前等级最高支持 ${formatPrivateChatBytes(
 limits.maxVideoSizeBytes
 )}。`,
 };
 }
 }

 return {
 allowed: true,
 message: "允许发送媒体文件。",
 };
}

export function getPrivateChatMediaUpgradeText(level?: string | null) {
 const normalizedLevel = normalizePrivateChatMembershipLevel(level);

 if (normalizedLevel === "svip") {
 return "你当前已经是 SVIP，可使用最高媒体上传额度。";
 }

 if (normalizedLevel === "vip") {
 return "你当前是 VIP，可发送媒体文件，也可以升级 SVIP 获得更高上传额度。";
 }

 return "开通 VIP 后，可在私聊和暗语房间中发送图片和视频。";
}

export function getPrivateChatMembershipCapacityText(level?: string | null) {
 const limits = getPrivateChatMembershipLimits(level);

 return {
 friends: `最多 ${limits.maxFriends} 个好友 / 关注`,
 blockedUsers: `最多 ${limits.maxBlockedUsers} 个黑名单用户`,
 favoriteRooms: `最多 ${limits.maxFavoriteRooms} 个收藏房间`,
 uploadCount:
 limits.dailyUploadCountLimit > 0
 ? `每月最多上传 ${limits.dailyUploadCountLimit} 个媒体文件`
 : "不可上传媒体文件",
 uploadTraffic:
 limits.dailyUploadTrafficBytes > 0
 ? `每月上传流量 ${formatPrivateChatBytes(
 limits.dailyUploadTrafficBytes
 )}`
 : "无媒体上传流量",
 };
}