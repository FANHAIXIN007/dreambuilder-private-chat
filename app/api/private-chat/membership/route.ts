import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MembershipAction =
 | "get_membership"
 | "get_member_usage_summary"
 | "update_membership_mock"
 | "create_membership_order"
 | "list_membership_orders"
 | "cancel_membership_order"
 | "check_membership_order_payment"
 | "submit_membership_payment_txhash"
 | "confirm_membership_order_payment"
 | "activate_membership_order_mock"
 | "get_public_membership_plans"
 | "get_membership_plans"
 | "owner_update_membership_plan"
 | "owner_list_memberships"
 | "owner_update_account_membership";

type MembershipLevel = "free" | "vip" | "svip";
type MembershipStatus = "active" | "expired" | "cancelled" | "manual";

type OrderStatus =
 | "pending"
 | "paid"
 | "active"
 | "cancelled"
 | "expired"
 | "failed";

type MembershipRow = {
 accountId: string;
 email: string | null;
 displayName: string | null;
 walletAddress: string | null;
 membershipLevel: MembershipLevel;
 membershipStatus: MembershipStatus;
 membershipStartedAt: string | null;
 membershipExpiresAt: string | null;
 membershipSource: string | null;
 membershipNote: string | null;
};

type MembershipOrderRow = {
 id: string;
 accountId: string;
 chatUserId: string | null;
 userName: string | null;
 userAvatar: string | null;
 membershipLevel: MembershipLevel;
 durationDays: number;
 amount: number;
 currency: string;
 chain: string;
 walletAddress: string | null;
 paymentAddress: string | null;
 txHash: string | null;
 status: OrderStatus;
 source: string;
 startedAt: string | null;
 expiresAt: string | null;
 paidAt: string | null;
 cancelledAt: string | null;
 note: string | null;
 createdAt: string;
 updatedAt: string;
};


type MembershipPlanConfigRow = {
 level: Exclude<MembershipLevel, "free">;
 title: string;
 subtitle: string | null;
 amount: number;
 durationDays: number;
 currency: string;
 chain: string;
 isActive: boolean;
 updatedAt: string | null;
};

type OwnerMembershipUserRow = {
 accountId: string;
 email: string | null;
 displayName: string | null;
 walletAddress: string | null;
 membershipLevel: MembershipLevel;
 membershipStatus: MembershipStatus;
 membershipStartedAt: string | null;
 membershipExpiresAt: string | null;
 membershipSource: string | null;
 membershipNote: string | null;
 createdAt: string | null;
 updatedAt: string | null;
};

type BscScanReceiptLog = {
 address?: string;
 topics?: string[];
 data?: string;
};

type BscScanReceipt = {
 status?: string;
 logs?: BscScanReceiptLog[];
};

type BscScanTokenTransfer = {
 blockNumber?: string;
 timeStamp?: string;
 hash?: string;
 nonce?: string;
 blockHash?: string;
 from?: string;
 contractAddress?: string;
 to?: string;
 value?: string;
 tokenName?: string;
 tokenSymbol?: string;
 tokenDecimal?: string;
 transactionIndex?: string;
 gas?: string;
 gasPrice?: string;
 gasUsed?: string;
 cumulativeGasUsed?: string;
 input?: string;
 confirmations?: string;
};

type VerifyPaymentResult =
 | {
 ok: true;
 error?: never;
 txHash: string;
 matchedAmountUnits: bigint;
 requiredAmountUnits: bigint;
 fromAddress: string | null;
 toAddress: string;
 tokenContract: string;
 paidAt: string | null;
 }
 | {
 ok: false;
 error: string;
 };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const defaultPaymentAddress =
 process.env.PRIVATE_CHAT_MEMBERSHIP_PAYMENT_ADDRESS ||
 process.env.PRIVATE_CHAT_USDT_PAYMENT_ADDRESS ||
 process.env.USDT_PAYMENT_ADDRESS ||
 "";

const bscscanApiKey =
 process.env.PRIVATE_CHAT_ETHERSCAN_API_KEY ||
 process.env.ETHERSCAN_API_KEY ||
 process.env.PRIVATE_CHAT_BSCSCAN_API_KEY ||
 process.env.BSCSCAN_API_KEY ||
 "";

const BSCSAN_API_URL_LEGACY_UNUSED = "https://api.bscscan.com/api";
const BSCSCAN_API_URL = "https://api.etherscan.io/v2/api";

const BSC_RPC_URL =
 process.env.PRIVATE_CHAT_BSC_RPC_URL ||
 process.env.NEXT_PUBLIC_BSC_RPC_URL ||
 process.env.BSC_RPC_URL ||
 "https://bsc-dataseed.binance.org/";
const ETHERSCAN_BSC_CHAIN_ID = "56";

/**
 * BSC USDT(BEP20) 合约地址。
 * 如果后续你要换收款币种，可以把这里改为环境变量。
 */
const BSC_USDT_CONTRACT_ADDRESS = (
 process.env.PRIVATE_CHAT_BSC_USDT_CONTRACT_ADDRESS ||
 "0x55d398326f99059fF775485246999027B3197955"
).toLowerCase();

/**
 * USDT on BSC 常用 18 位精度。
 * 如果你后续换成其他 token，可以把这里改成对应 decimals。
 */
const BSC_USDT_DECIMALS = 18;

/**
 * 容错：部分钱包 / JS number 会把 0.1001 编码成 0.100099。
 * 这里仅允许 0.000001 USDT 的极小误差，主要用于修复已支付订单。
 * 新前端应使用字符串金额编码，正常会完全一致。
 */
const PAYMENT_TXHASH_TOLERANCE_UNITS = BigInt("1000000000000");

/**
 * 给每个订单生成唯一金额时使用的小数位。
 *
 * 规则：
 * - VIP：从小数点后第 4 位开始识别，例如 0.1001、0.1002、0.1003
 * - SVIP：从小数点后第 3 位开始识别，例如 0.201、0.202、0.203
 *
 * 这样测试阶段即使 VIP 设置为 0.1 USDT、SVIP 设置为 0.2 USDT，
 * 也可以稳定生成可识别的唯一金额。
 */
const UNIQUE_PAYMENT_CONFIG: Record<
 Exclude<MembershipLevel, "free">,
 {
 decimals: number;
 maxCode: number;
 }
> = {
 vip: {
 decimals: 4,
 maxCode: 8999,
 },
 svip: {
 decimals: 3,
 maxCode: 899,
 },
};

/**
 * ERC20 Transfer(address,address,uint256) 事件签名：
 * keccak256("Transfer(address,address,uint256)")
 */
const ERC20_TRANSFER_TOPIC =
 "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

if (!supabaseUrl) {
 throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
 throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
 auth: {
 persistSession: false,
 autoRefreshToken: false,
 },
});

function requireText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function optionalText(value: unknown): string | null {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown, fallback = 0) {
 if (typeof value === "number" && Number.isFinite(value)) return value;

 if (typeof value === "string" && value.trim()) {
 const parsed = Number(value);

 if (Number.isFinite(parsed)) return parsed;
 }

 return fallback;
}

function normalizeMembershipLevel(value: unknown): MembershipLevel {
 if (value === "vip") return "vip";
 if (value === "svip") return "svip";

 return "free";
}

function normalizePaidMembershipLevel(
 value: unknown
): Exclude<MembershipLevel, "free"> {
 if (value === "svip") return "svip";

 return "vip";
}

function normalizeMembershipStatus(value: unknown): MembershipStatus {
 if (value === "expired") return "expired";
 if (value === "cancelled") return "cancelled";
 if (value === "manual") return "manual";

 return "active";
}

function normalizeOrderStatus(value: unknown): OrderStatus {
 if (value === "paid") return "paid";
 if (value === "active") return "active";
 if (value === "cancelled") return "cancelled";
 if (value === "expired") return "expired";
 if (value === "failed") return "failed";

 return "pending";
}

function normalizeAddress(value?: string | null) {
 if (!value) return "";

 return value.trim().toLowerCase();
}

function normalizeTxHash(value: unknown) {
 if (typeof value !== "string") return null;

 const trimmed = value.trim();

 if (!trimmed) return null;

 return trimmed.slice(0, 160);
}

function isLikelyTxHash(value: string) {
 const cleaned = value.trim();

 if (!cleaned) return false;

 if (/^0x[a-fA-F0-9]{64}$/.test(cleaned)) return true;

 return cleaned.length >= 32 && cleaned.length <= 160;
}

function topicToAddress(topic?: string) {
 if (!topic || !topic.startsWith("0x") || topic.length < 66) return null;

 return `0x${topic.slice(-40)}`.toLowerCase();
}

function parseHexBigInt(hexValue?: string) {
 if (!hexValue || typeof hexValue !== "string") return BigInt(0);

 try {
 if (!hexValue.startsWith("0x")) return BigInt(hexValue);

 return BigInt(hexValue);
 } catch {
 return BigInt(0);
 }
}

function parseDecimalToTokenUnits(value: string | number, decimals: number) {
 const raw = String(value || "0").trim();

 if (!raw) return BigInt(0);

 const normalized = raw.replace(/,/g, "");
 const [integerPart = "0", decimalPart = ""] = normalized.split(".");
 const cleanedInteger = integerPart.replace(/[^\d]/g, "") || "0";
 const cleanedDecimal = decimalPart
 .replace(/[^\d]/g, "")
 .padEnd(decimals, "0")
 .slice(0, decimals);

 return BigInt(`${cleanedInteger}${cleanedDecimal}`);
}

function decimalToTokenUnits(value: number, decimals: number) {
 if (!Number.isFinite(value) || value <= 0) return BigInt(0);

 const fixed = value.toFixed(decimals);
 return parseDecimalToTokenUnits(fixed, decimals);
}

function tokenUnitsToDecimalString(valueUnits: bigint, decimals: number) {
 const negative = valueUnits < BigInt(0);
 const raw = (negative ? -valueUnits : valueUnits).toString().padStart(decimals + 1, "0");
 const integerPart = raw.slice(0, -decimals) || "0";
 const decimalPart = raw.slice(-decimals).replace(/0+$/, "");

 return `${negative ? "-" : ""}${integerPart}${decimalPart ? `.${decimalPart}` : ""}`;
}

function getUniquePaymentConfig(level: Exclude<MembershipLevel, "free">) {
 return UNIQUE_PAYMENT_CONFIG[level] || UNIQUE_PAYMENT_CONFIG.vip;
}

function roundToUniqueDecimals(
 value: number,
 level: Exclude<MembershipLevel, "free">
) {
 const config = getUniquePaymentConfig(level);

 return Number(value.toFixed(config.decimals));
}

function buildUniquePaymentAmount(params: {
 level: Exclude<MembershipLevel, "free">;
 baseAmount: number;
 code: number;
}) {
 const config = getUniquePaymentConfig(params.level);
 const safeBaseAmount =
 Number.isFinite(params.baseAmount) && params.baseAmount > 0
 ? params.baseAmount
 : 0;

 const safeCode = Math.max(1, Math.min(config.maxCode, Math.floor(params.code)));
 const uniquePart = safeCode / Math.pow(10, config.decimals);

 return roundToUniqueDecimals(safeBaseAmount + uniquePart, params.level);
}

function buildMembershipRow(row: Record<string, unknown>): MembershipRow {
 return {
 accountId: String(row.id || ""),
 email: typeof row.email === "string" ? row.email : null,
 displayName:
 typeof row.display_name === "string" ? row.display_name : null,
 walletAddress:
 typeof row.wallet_address === "string" ? row.wallet_address : null,
 membershipLevel: normalizeMembershipLevel(row.membership_level),
 membershipStatus: normalizeMembershipStatus(row.membership_status),
 membershipStartedAt:
 typeof row.membership_started_at === "string"
 ? row.membership_started_at
 : null,
 membershipExpiresAt:
 typeof row.membership_expires_at === "string"
 ? row.membership_expires_at
 : null,
 membershipSource:
 typeof row.membership_source === "string" ? row.membership_source : null,
 membershipNote:
 typeof row.membership_note === "string" ? row.membership_note : null,
 };
}

function buildOrderRow(row: Record<string, unknown>): MembershipOrderRow {
 return {
 id: String(row.id || ""),
 accountId: String(row.account_id || ""),
 chatUserId: typeof row.chat_user_id === "string" ? row.chat_user_id : null,
 userName: typeof row.user_name === "string" ? row.user_name : null,
 userAvatar: typeof row.user_avatar === "string" ? row.user_avatar : null,
 membershipLevel: normalizeMembershipLevel(row.membership_level),
 durationDays: readNumber(row.duration_days, 30),
 amount: readNumber(row.amount, 0),
 currency: typeof row.currency === "string" ? row.currency : "USDT",
 chain: typeof row.chain === "string" ? row.chain : "BSC",
 walletAddress:
 typeof row.wallet_address === "string" ? row.wallet_address : null,
 paymentAddress:
 typeof row.payment_address === "string" ? row.payment_address : null,
 txHash: typeof row.tx_hash === "string" ? row.tx_hash : null,
 status: normalizeOrderStatus(row.status),
 source: typeof row.source === "string" ? row.source : "wallet",
 startedAt: typeof row.started_at === "string" ? row.started_at : null,
 expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
 paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
 cancelledAt:
 typeof row.cancelled_at === "string" ? row.cancelled_at : null,
 note: typeof row.note === "string" ? row.note : null,
 createdAt: typeof row.created_at === "string" ? row.created_at : "",
 updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
 };
}

function addDays(date: Date, days: number) {
 const nextDate = new Date(date);

 nextDate.setDate(nextDate.getDate() + days);

 return nextDate;
}

function getDefaultDurationDays(level: MembershipLevel) {
 if (level === "svip") return 365;
 if (level === "vip") return 30;

 return 0;
}

function getDefaultAmount(level: MembershipLevel, durationDays: number) {
 if (level === "svip") return durationDays >= 365 ? 99 : 19.9;
 if (level === "vip") return durationDays >= 365 ? 49 : 9.9;

 return 0;
}

function getMembershipSelectColumns() {
 return [
 "id",
 "email",
 "display_name",
 "wallet_address",
 "membership_level",
 "membership_status",
 "membership_started_at",
 "membership_expires_at",
 "membership_source",
 "membership_note",
 ].join(",");
}



function getCurrentTrafficMonth() {
 const now = new Date();
 const year = now.getFullYear();
 const month = String(now.getMonth() + 1).padStart(2, "0");

 return `${year}-${month}`;
}

async function expireDueMemberships() {
 const now = new Date().toISOString();

 try {
 await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: "free",
 membership_status: "expired",
 membership_started_at: null,
 membership_expires_at: null,
 membership_source: "auto_expire",
 membership_note: "会员到期后系统自动降级为 Free",
 updated_at: now,
 })
 .in("membership_level", ["vip", "svip"])
 .eq("membership_status", "active")
 .not("membership_expires_at", "is", null)
 .lt("membership_expires_at", now);
 } catch {
 // 如果数据库字段暂时不完整，不阻断会员接口主流程。
 }
}

async function resetDueMonthlyTraffic() {
 const currentMonth = getCurrentTrafficMonth();
 const now = new Date().toISOString();

 try {
 await supabaseAdmin
 .from("app_accounts")
 .update({
 monthly_traffic_used_bytes: 0,
 monthly_traffic_reset_month: currentMonth,
 updated_at: now,
 })
 .or(`monthly_traffic_reset_month.is.null,monthly_traffic_reset_month.neq.${currentMonth}`);
 } catch {
 // 兼容旧表：如果尚未添加 monthly_traffic_used_bytes / monthly_traffic_reset_month 字段，则静默跳过。
 }
}

async function resetAccountMonthlyTrafficIfNeeded(accountId: string) {
 if (!accountId) return;

 const currentMonth = getCurrentTrafficMonth();
 const now = new Date().toISOString();

 try {
 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select("id,monthly_traffic_used_bytes,monthly_traffic_reset_month")
 .eq("id", accountId)
 .maybeSingle();

 if (error || !data) return;

 const row = data as unknown as Record<string, unknown>;
 const resetMonth =
 typeof row.monthly_traffic_reset_month === "string"
 ? row.monthly_traffic_reset_month
 : null;

 if (resetMonth === currentMonth) return;

 await supabaseAdmin
 .from("app_accounts")
 .update({
 monthly_traffic_used_bytes: 0,
 monthly_traffic_reset_month: currentMonth,
 updated_at: now,
 })
 .eq("id", accountId);
 } catch {
 // 不阻断会员接口主流程。
 }
}

async function normalizeAccountMembershipLifecycle(
 row: Record<string, unknown> | null
) {
 if (!row) return row;

 const accountId = String(row.id || "");
 const level = normalizeMembershipLevel(row.membership_level);
 const status = normalizeMembershipStatus(row.membership_status);
 const expiresAt =
 typeof row.membership_expires_at === "string"
 ? row.membership_expires_at
 : null;

 await resetAccountMonthlyTrafficIfNeeded(accountId);

 if (level === "free") return row;
 if (status !== "active" && status !== "manual") return row;
 if (!expiresAt) return row;

 const expiresTime = new Date(expiresAt).getTime();

 if (!Number.isFinite(expiresTime)) return row;
 if (expiresTime > Date.now()) return row;

 const now = new Date().toISOString();

 try {
 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: "free",
 membership_status: "expired",
 membership_started_at: null,
 membership_expires_at: null,
 membership_source: "auto_expire",
 membership_note: `${level.toUpperCase()} 会员已于 ${expiresAt} 到期，系统自动降级为 Free`,
 updated_at: now,
 })
 .eq("id", accountId)
 .select(getMembershipSelectColumns())
 .single();

 if (!error && data) {
 return data as unknown as Record<string, unknown>;
 }
 } catch {
 // 如果自动降级失败，仍返回原始账户，避免接口直接不可用。
 }

 return row;
}


function getOwnerMembershipSelectColumns() {
 return [
 "id",
 "email",
 "display_name",
 "wallet_address",
 "membership_level",
 "membership_status",
 "membership_started_at",
 "membership_expires_at",
 "membership_source",
 "membership_note",
 "created_at",
 "updated_at",
 ].join(",");
}

function getMembershipPlanSelectColumns() {
 return [
 "level",
 "title",
 "subtitle",
 "amount",
 "duration_days",
 "currency",
 "chain",
 "is_active",
 "updated_at",
 ].join(",");
}

function buildMembershipPlanConfigRow(
 row: Record<string, unknown>
): MembershipPlanConfigRow {
 const level = row.level === "svip" ? "svip" : "vip";

 return {
 level,
 title:
 typeof row.title === "string"
 ? row.title
 : level === "svip"
 ? "SVIP 会员"
 : "VIP 会员",
 subtitle: typeof row.subtitle === "string" ? row.subtitle : null,
 amount: readNumber(row.amount, getDefaultAmount(level, getDefaultDurationDays(level))),
 durationDays: readNumber(row.duration_days, getDefaultDurationDays(level)),
 currency: typeof row.currency === "string" ? row.currency : "USDT",
 chain: typeof row.chain === "string" ? row.chain : "BSC",
 isActive: row.is_active !== false,
 updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
 };
}

function buildOwnerMembershipUserRow(
 row: Record<string, unknown>
): OwnerMembershipUserRow {
 return {
 ...buildMembershipRow(row),
 createdAt: typeof row.created_at === "string" ? row.created_at : null,
 updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
 };
}

async function getAdminRole(userId: string | null): Promise<"owner" | "admin" | null> {
 if (!userId) return null;

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_admins")
 .select("role")
 .eq("user_id", userId)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();

 if (error || !data) return null;

 const row = data as unknown as Record<string, unknown>;
 const role = row.role;

 if (role === "owner" || role === "admin") return role;
 return null;
 } catch {
 return null;
 }
}

async function requireOwner(actorId: string | null) {
 const role = await getAdminRole(actorId);

 if (role !== "owner") {
 return {
 ok: false,
 error: "只有 owner 可以管理会员价格和会员账户。",
 };
 }

 return {
 ok: true,
 error: null as string | null,
 };
}

async function getMembershipPlanConfig(
 level: Exclude<MembershipLevel, "free">
): Promise<MembershipPlanConfigRow> {
 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_plans")
 .select(getMembershipPlanSelectColumns())
 .eq("level", level)
 .maybeSingle();

 if (!error && data) {
 return buildMembershipPlanConfigRow(
 data as unknown as Record<string, unknown>
 );
 }
 } catch {
 // 价格表未创建时，走代码默认价格，保证旧系统不受影响。
 }

 return {
 level,
 title: level === "svip" ? "SVIP 会员" : "VIP 会员",
 subtitle: level === "svip" ? "适合重度私密聊天用户" : "适合高频聊天用户",
 amount: getDefaultAmount(level, getDefaultDurationDays(level)),
 durationDays: getDefaultDurationDays(level),
 currency: "USDT",
 chain: "BSC",
 isActive: true,
 updatedAt: null,
 };
}

function getOrderSelectColumns() {
 return [
 "id",
 "account_id",
 "chat_user_id",
 "user_name",
 "user_avatar",
 "membership_level",
 "duration_days",
 "amount",
 "currency",
 "chain",
 "wallet_address",
 "payment_address",
 "tx_hash",
 "status",
 "source",
 "started_at",
 "expires_at",
 "paid_at",
 "cancelled_at",
 "note",
 "created_at",
 "updated_at",
 ].join(",");
}

async function getAccountById(accountId: string) {
 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .select(getMembershipSelectColumns())
 .eq("id", accountId)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data as unknown as Record<string, unknown> | null;
}

async function findOrderByAccountAndId(params: {
 accountId: string;
 orderId: string;
}) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .select(getOrderSelectColumns())
 .eq("id", params.orderId)
 .eq("account_id", params.accountId)
 .maybeSingle();

 if (error) {
 throw new Error(error.message);
 }

 return data
 ? buildOrderRow(data as unknown as Record<string, unknown>)
 : null;
}

async function hasDuplicateTxHash(params: {
 txHash: string;
 currentOrderId: string;
}) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .select("id")
 .eq("tx_hash", params.txHash)
 .neq("id", params.currentOrderId)
 .limit(1);

 if (error) {
 throw new Error(error.message);
 }

 return Boolean(data && data.length > 0);
}

async function hasPendingOrderWithAmount(params: {
 paymentAddress: string;
 amount: number;
 currentAccountId: string;
}) {
 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .select("id,account_id")
 .eq("payment_address", params.paymentAddress)
 .eq("amount", params.amount)
 .in("status", ["pending", "paid"])
 .limit(1);

 if (error) {
 throw new Error(error.message);
 }

 return Boolean(
 data?.some((item) => {
 const row = item as unknown as Record<string, unknown>;

 return row.account_id !== params.currentAccountId;
 })
 );
}

async function createUniqueOrderAmount(params: {
 accountId: string;
 paymentAddress: string;
 baseAmount: number;
 level: Exclude<MembershipLevel, "free">;
}) {
 const config = getUniquePaymentConfig(params.level);

 /**
 * 不随机跳很大的金额，而是从最小识别尾数开始找。
 *
 * VIP 示例：
 * baseAmount = 0.1
 * code = 1 => 0.1001
 * code = 2 => 0.1002
 *
 * SVIP 示例：
 * baseAmount = 0.2
 * code = 1 => 0.201
 * code = 2 => 0.202
 */
 for (let code = 1; code <= config.maxCode; code += 1) {
 const amount = buildUniquePaymentAmount({
 level: params.level,
 baseAmount: params.baseAmount,
 code,
 });

 const duplicated = await hasPendingOrderWithAmount({
 paymentAddress: params.paymentAddress,
 amount,
 currentAccountId: params.accountId,
 });

 if (!duplicated) {
 return amount;
 }
 }

 throw new Error(
 `${params.level.toUpperCase()} 当前可用的唯一支付金额已用完，请稍后再试或清理过期订单。`
 );
}

async function getBscTransactionReceipt(txHash: string) {
 const normalizedTxHash = normalizeTxHash(txHash);

 if (!normalizedTxHash || !isLikelyTxHash(normalizedTxHash)) {
 throw new Error("交易哈希格式不正确。");
 }

 const response = await fetch(BSC_RPC_URL, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 cache: "no-store",
 body: JSON.stringify({
 jsonrpc: "2.0",
 id: 1,
 method: "eth_getTransactionReceipt",
 params: [normalizedTxHash],
 }),
 });

 const responseText = await response.text();

 let result: {
 jsonrpc?: string;
 id?: number;
 result?: BscScanReceipt | null;
 error?: {
 code?: number;
 message?: string;
 };
 } | null = null;

 try {
 result = JSON.parse(responseText) as {
 jsonrpc?: string;
 id?: number;
 result?: BscScanReceipt | null;
 error?: {
 code?: number;
 message?: string;
 };
 };
 } catch {
 result = null;
 }

 if (!response.ok) {
 throw new Error(`BSC RPC 请求失败：${response.status}`);
 }

 if (!result) {
 throw new Error("BSC RPC 返回内容无法解析。");
 }

 if (result.error?.message) {
 throw new Error(result.error.message);
 }

 return result.result || null;
}

async function getRecentBscUsdtTransfersToAddress(paymentAddress: string) {
 const normalizedPaymentAddress = normalizeAddress(paymentAddress);

 if (!normalizedPaymentAddress || !normalizedPaymentAddress.startsWith("0x")) {
 throw new Error(
 "会员收款地址未配置，请先在 .env.local 设置 PRIVATE_CHAT_MEMBERSHIP_PAYMENT_ADDRESS。"
 );
 }

 if (!bscscanApiKey) {
 throw new Error(
 "Etherscan API Key 未配置。请先在 .env.local 设置 PRIVATE_CHAT_ETHERSCAN_API_KEY，或继续使用 BSCSCAN_API_KEY 作为兜底。"
 );
 }

 const url = new URL(BSCSCAN_API_URL);

 url.searchParams.set("chainid", ETHERSCAN_BSC_CHAIN_ID);
 url.searchParams.set("module", "account");
 url.searchParams.set("action", "tokentx");
 url.searchParams.set("contractaddress", BSC_USDT_CONTRACT_ADDRESS);
 url.searchParams.set("address", normalizedPaymentAddress);
 url.searchParams.set("page", "1");
 url.searchParams.set("offset", "100");
 url.searchParams.set("startblock", "0");
 url.searchParams.set("endblock", "99999999");
 url.searchParams.set("sort", "desc");
 url.searchParams.set("apikey", bscscanApiKey);

 const response = await fetch(url.toString(), {
 method: "GET",
 cache: "no-store",
 });

 const responseText = await response.text();

 let result: {
 status?: string;
 message?: string;
 result?: BscScanTokenTransfer[] | string;
 } | null = null;

 try {
 result = JSON.parse(responseText) as {
 status?: string;
 message?: string;
 result?: BscScanTokenTransfer[] | string;
 };
 } catch {
 result = null;
 }

 if (!response.ok) {
 throw new Error("Etherscan V2 请求失败：" + response.status);
 }

 if (!result) {
 throw new Error("Etherscan V2 返回内容无法解析。");
 }

 if (Array.isArray(result.result)) {
 return result.result;
 }

 if (result.status === "0" && result.message === "No transactions found") {
 return [];
 }

 if (typeof result.result === "string" && result.result.trim()) {
 throw new Error(result.result);
 }

 return [];
}

async function verifyBscUsdtPaymentByUniqueAmount(params: {
 paymentAddress: string;
 amount: number;
 createdAt: string;
 currentOrderId?: string;
}): Promise<VerifyPaymentResult> {
 const normalizedPaymentAddress = normalizeAddress(params.paymentAddress);

 if (!normalizedPaymentAddress || !normalizedPaymentAddress.startsWith("0x")) {
 return {
 ok: false,
 error:
 "会员收款地址未配置，请先在 .env.local 设置 PRIVATE_CHAT_MEMBERSHIP_PAYMENT_ADDRESS。",
 };
 }

 if (!bscscanApiKey) {
 return {
 ok: false,
 error:
 "Etherscan API Key 未配置，请先在 .env.local 设置 PRIVATE_CHAT_BSCSCAN_API_KEY。",
 };
 }

 const requiredAmountUnits = decimalToTokenUnits(
 params.amount,
 BSC_USDT_DECIMALS
 );

 if (requiredAmountUnits <= BigInt(0)) {
 return {
 ok: false,
 error: "订单金额不正确，无法校验链上支付。",
 };
 }

 const createdAtTime = new Date(params.createdAt).getTime();
 const safeCreatedAtTime = Number.isFinite(createdAtTime)
 ? createdAtTime
 : Date.now();

 let transfers: BscScanTokenTransfer[] = [];

 try {
 transfers = await getRecentBscUsdtTransfersToAddress(params.paymentAddress);
 } catch (error) {
 const message =
 error instanceof Error ? error.message : "读取链上转账失败。";

 return {
 ok: false,
 error: message,
 };
 }

 for (const transfer of transfers) {
 const tokenAddress = normalizeAddress(transfer.contractAddress);
 const toAddress = normalizeAddress(transfer.to);
 const txHash = typeof transfer.hash === "string" ? transfer.hash : "";
 const transferTimeSeconds = Number(transfer.timeStamp || 0);
 const transferTimeMs = Number.isFinite(transferTimeSeconds)
 ? transferTimeSeconds * 1000
 : 0;

 if (!txHash) continue;
 if (tokenAddress !== BSC_USDT_CONTRACT_ADDRESS) continue;
 if (toAddress !== normalizedPaymentAddress) continue;

 /**
 * 给 BscScan / 区块时间留 5 分钟缓冲。
 * 用户创建订单前几分钟内的同金额转账，通常也可以视为这张订单的支付。
 */
 if (transferTimeMs > 0 && transferTimeMs + 5 * 60 * 1000 < safeCreatedAtTime) {
 continue;
 }

 const decimals = Number(transfer.tokenDecimal || BSC_USDT_DECIMALS);
 const tokenDecimals = Number.isFinite(decimals)
 ? decimals
 : BSC_USDT_DECIMALS;
 const amountUnits = parseDecimalToTokenUnits(
 tokenUnitsToDecimalString(BigInt(transfer.value || "0"), tokenDecimals),
 BSC_USDT_DECIMALS
 );

 if (amountUnits !== requiredAmountUnits) continue;

 const duplicate = await hasDuplicateTxHash({
 txHash,
 currentOrderId: params.currentOrderId || "",
 }).catch(() => false);

 if (duplicate) {
 continue;
 }

 return {
 ok: true,
 txHash,
 matchedAmountUnits: amountUnits,
 requiredAmountUnits,
 fromAddress: normalizeAddress(transfer.from) || null,
 toAddress,
 tokenContract: tokenAddress,
 paidAt:
 transferTimeMs > 0
 ? new Date(transferTimeMs).toISOString()
 : new Date().toISOString(),
 };
 }

 return {
 ok: false,
 error:
 "暂未检测到与该订单唯一金额完全匹配的 BSC USDT 入账。请确认转账网络、币种、收款地址和精确金额是否一致。",
 };
}

async function verifyBscUsdtPaymentTxHash(params: {
 txHash: string;
 paymentAddress: string;
 amount: number;
}): Promise<VerifyPaymentResult> {
 const normalizedPaymentAddress = normalizeAddress(params.paymentAddress);

 if (!normalizedPaymentAddress || !normalizedPaymentAddress.startsWith("0x")) {
 return {
 ok: false,
 error:
 "会员收款地址未配置，请先在 .env.local 设置 PRIVATE_CHAT_MEMBERSHIP_PAYMENT_ADDRESS。",
 };
 }

 if (!bscscanApiKey) {
 return {
 ok: false,
 error:
 "Etherscan API Key 未配置，请先在 .env.local 设置 PRIVATE_CHAT_BSCSCAN_API_KEY。",
 };
 }

 const requiredAmountUnits = decimalToTokenUnits(
 params.amount,
 BSC_USDT_DECIMALS
 );

 if (requiredAmountUnits <= BigInt(0)) {
 return {
 ok: false,
 error: "订单金额不正确，无法校验链上支付。",
 };
 }

 let receipt: BscScanReceipt | null = null;

 try {
 receipt = await getBscTransactionReceipt(params.txHash);
 } catch (error) {
 const message =
 error instanceof Error ? error.message : "读取链上交易失败。";

 return {
 ok: false,
 error: message,
 };
 }

 if (!receipt) {
 return {
 ok: false,
 error: "链上暂未查询到这笔交易，请稍等区块确认后再提交。",
 };
 }

 if (receipt.status !== "0x1") {
 return {
 ok: false,
 error: "这笔链上交易未成功，不能激活会员。",
 };
 }

 const logs = Array.isArray(receipt.logs) ? receipt.logs : [];

 for (const log of logs) {
 const tokenAddress = normalizeAddress(log.address);

 if (tokenAddress !== BSC_USDT_CONTRACT_ADDRESS) continue;

 const topics = Array.isArray(log.topics) ? log.topics : [];
 const eventTopic = topics[0]?.toLowerCase();

 if (eventTopic !== ERC20_TRANSFER_TOPIC) continue;

 const fromAddress = topicToAddress(topics[1]);
 const toAddress = topicToAddress(topics[2]);
 const amountUnits = parseHexBigInt(log.data);

 if (toAddress !== normalizedPaymentAddress) continue;

 if (amountUnits < requiredAmountUnits) {
 return {
 ok: false,
 error: "这笔 USDT 转账金额不足，不能激活当前会员订单。",
 };
 }

 return {
 ok: true,
 txHash: params.txHash,
 matchedAmountUnits: amountUnits,
 requiredAmountUnits,
 fromAddress,
 toAddress,
 tokenContract: tokenAddress,
 paidAt: new Date().toISOString(),
 };
 }

 return {
 ok: false,
 error:
 "没有在这笔交易中找到转入会员收款地址的 BSC USDT 转账记录，请检查 txHash、链和收款地址。",
 };
}

async function activateMembershipFromOrder(params: {
 order: MembershipOrderRow;
 txHash: string | null;
 source: string;
 note: string;
 paidAt?: string | null;
}) {
 const now = new Date();
 const paidAt = params.paidAt || now.toISOString();
 const expiresAt = addDays(now, params.order.durationDays);

 const { error: cancelOtherOrdersError } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 status: "cancelled",
 cancelled_at: now.toISOString(),
 updated_at: now.toISOString(),
 note: "激活新会员订单时自动取消旧订单",
 })
 .eq("account_id", params.order.accountId)
 .neq("id", params.order.id)
 .in("status", ["pending", "paid", "active"]);

 if (cancelOtherOrdersError) {
 throw new Error(cancelOtherOrdersError.message);
 }

 const { data: updatedOrderData, error: updateOrderError } =
 await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 status: "active",
 tx_hash: params.txHash?.slice(0, 160) || params.order.txHash,
 paid_at: paidAt,
 started_at: now.toISOString(),
 expires_at: expiresAt.toISOString(),
 cancelled_at: null,
 updated_at: now.toISOString(),
 note: params.note,
 })
 .eq("id", params.order.id)
 .eq("account_id", params.order.accountId)
 .select(getOrderSelectColumns())
 .single();

 if (updateOrderError) {
 throw new Error(updateOrderError.message);
 }

 const { data: updatedAccountData, error: updateAccountError } =
 await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: params.order.membershipLevel,
 membership_status: "active",
 membership_started_at: now.toISOString(),
 membership_expires_at: expiresAt.toISOString(),
 membership_source: params.source,
 membership_note: `${params.note}，订单 ID：${params.order.id}`,
 updated_at: now.toISOString(),
 })
 .eq("id", params.order.accountId)
 .select(getMembershipSelectColumns())
 .single();

 if (updateAccountError) {
 throw new Error(updateAccountError.message);
 }

 return {
 order: buildOrderRow(updatedOrderData as unknown as Record<string, unknown>),
 membership: buildMembershipRow(
 updatedAccountData as unknown as Record<string, unknown>
 ),
 };
}

async function verifyAndActivateMembershipOrderByTransferScan(params: {
 accountId: string;
 orderId: string;
}) {
 const order = await findOrderByAccountAndId({
 accountId: params.accountId,
 orderId: params.orderId,
 });

 if (!order) {
 return NextResponse.json(
 {
 ok: false,
 error: "订单不存在",
 },
 { status: 404 }
 );
 }

 if (order.status === "active") {
 return NextResponse.json({
 ok: true,
 message: "该订单已经激活。",
 data: {
 order,
 membership: null,
 },
 });
 }

 if (order.status !== "pending" && order.status !== "paid") {
 return NextResponse.json(
 {
 ok: false,
 error: "该订单当前状态不能自动检测支付。",
 },
 { status: 400 }
 );
 }

 if (order.currency.toUpperCase() !== "USDT") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前自动校验仅支持 USDT 会员订单。",
 },
 { status: 400 }
 );
 }

 if (order.chain.toUpperCase() !== "BSC") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前自动校验仅支持 BSC 链 USDT 订单。",
 },
 { status: 400 }
 );
 }

 const paymentAddress = order.paymentAddress || defaultPaymentAddress;

 const verifyResult = await verifyBscUsdtPaymentByUniqueAmount({
 paymentAddress,
 amount: order.amount,
 createdAt: order.createdAt,
 });

 if (!verifyResult.ok) {
 const now = new Date();

 await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 status: "pending",
 updated_at: now.toISOString(),
 note: `自动检测中：${verifyResult.error}`,
 })
 .eq("id", order.id)
 .eq("account_id", order.accountId);

 return NextResponse.json(
 {
 ok: false,
 error: verifyResult.error,
 },
 { status: 202 }
 );
 }

 try {
 const result = await activateMembershipFromOrder({
 order: {
 ...order,
 txHash: verifyResult.txHash,
 paymentAddress,
 },
 txHash: verifyResult.txHash,
 source: "wallet_order_auto_detect",
 paidAt: verifyResult.paidAt,
 note: `链上自动检测到唯一金额入账，自动激活 ${order.membershipLevel.toUpperCase()} 会员订单`,
 });

 return NextResponse.json({
 ok: true,
 message: "链上支付已自动检测成功，会员已自动激活。",
 data: result,
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "激活订单失败。";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}

async function verifyAndActivateMembershipOrder(params: {
 accountId: string;
 orderId: string;
 txHash: string;
}) {
 const txHash = normalizeTxHash(params.txHash);

 if (!txHash || !isLikelyTxHash(txHash)) {
 return NextResponse.json(
 {
 ok: false,
 error: "请填写正确的交易哈希 txHash。",
 },
 { status: 400 }
 );
 }

 const order = await findOrderByAccountAndId({
 accountId: params.accountId,
 orderId: params.orderId,
 });

 if (!order) {
 return NextResponse.json(
 {
 ok: false,
 error: "订单不存在",
 },
 { status: 404 }
 );
 }

 if (order.status === "active") {
 return NextResponse.json({
 ok: true,
 message: "该订单已经激活。",
 data: {
 order,
 membership: null,
 },
 });
 }

 if (order.status !== "pending" && order.status !== "paid") {
 return NextResponse.json(
 {
 ok: false,
 error: "该订单当前状态不能提交支付凭证。",
 },
 { status: 400 }
 );
 }

 const duplicate = await hasDuplicateTxHash({
 txHash,
 currentOrderId: order.id,
 });

 if (duplicate) {
 return NextResponse.json(
 {
 ok: false,
 error: "该 txHash 已提交过，请勿重复使用同一笔交易。",
 },
 { status: 409 }
 );
 }

 if (order.currency.toUpperCase() !== "USDT") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前自动校验仅支持 USDT 会员订单。",
 },
 { status: 400 }
 );
 }

 if (order.chain.toUpperCase() !== "BSC") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前自动校验仅支持 BSC 链 USDT 订单。",
 },
 { status: 400 }
 );
 }

 const paymentAddress = order.paymentAddress || defaultPaymentAddress;

 const verifyResult = await verifyBscUsdtPaymentTxHash({
 txHash,
 paymentAddress,
 amount: order.amount,
 });

 if (!verifyResult.ok) {
 const now = new Date();

 await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 tx_hash: txHash,
 status: "pending",
 updated_at: now.toISOString(),
 note: `自动校验未通过：${verifyResult.error}`,
 })
 .eq("id", order.id)
 .eq("account_id", order.accountId);

 return NextResponse.json(
 {
 ok: false,
 error: verifyResult.error,
 },
 { status: 400 }
 );
 }

 try {
 const result = await activateMembershipFromOrder({
 order: {
 ...order,
 txHash,
 paymentAddress,
 },
 txHash,
 source: "wallet_order_auto_verify",
 paidAt: verifyResult.paidAt,
 note: `链上自动校验通过，自动激活 ${order.membershipLevel.toUpperCase()} 会员订单`,
 });

 return NextResponse.json({
 ok: true,
 message: "链上支付校验通过，会员已自动激活。",
 data: result,
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "激活订单失败。";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}


type MemberUsageUploadRow = {
 id?: string;
 account_id?: string | null;
 chat_user_id?: string | null;
 room_id?: string | null;
 media_path?: string | null;
 message_type?: string | null;
 file_name?: string | null;
 file_type?: string | null;
 file_size?: number | string | null;
 status?: string | null;
 created_at?: string | null;
 updated_at?: string | null;
 sent_at?: string | null;
 deleted_at?: string | null;
};

function getMemberMonthStartIso() {
 const now = new Date();

 return new Date(
 Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
 ).toISOString();
}

function getMemberCurrentMonthLabel() {
 const now = new Date();

 return String(now.getUTCFullYear()) + "-" + String(now.getUTCMonth() + 1).padStart(2, "0");
}

function getMemberMonthlyTrafficLimitBytes(level: MembershipLevel) {
 if (level === "svip") return 10 * 1024 * 1024 * 1024;
 if (level === "vip") return 1024 * 1024 * 1024;

 return 0;
}

function readUploadSize(value: unknown) {
 const numberValue = Number(value);

 if (!Number.isFinite(numberValue)) return 0;

 return Math.max(0, Math.round(numberValue));
}

function normalizeUploadStatus(value: unknown) {
 if (typeof value !== "string") return "unknown";

 return value;
}

async function readMemberRecentUploads(params: {
 accountId: string;
 chatUserId: string | null;
 monthStart: string;
}) {
 const columns = [
 "id",
 "account_id",
 "chat_user_id",
 "room_id",
 "media_path",
 "message_type",
 "file_name",
 "file_type",
 "file_size",
 "status",
 "created_at",
 "updated_at",
 "sent_at",
 "deleted_at",
 ].join(",");

 let query = supabaseAdmin
 .from("private_chat_media_uploads")
 .select(columns)
 .gte("created_at", params.monthStart)
 .order("created_at", { ascending: false })
 .limit(80);

 if (params.chatUserId) {
 query = query.or(
 "account_id.eq." +
 params.accountId +
 ",chat_user_id.eq." +
 params.chatUserId
 );
 } else {
 query = query.eq("account_id", params.accountId);
 }

 const { data, error } = await query;

 if (error) {
 console.error("Read member upload usage error:", error);

 return {
 readable: false,
 rows: [] as MemberUsageUploadRow[],
 error: error.message,
 };
 }

 return {
 readable: true,
 rows: Array.isArray(data) ? (data as MemberUsageUploadRow[]) : [],
 error: null as string | null,
 };
}

async function handleGetMemberUsageSummary(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const chatUserId = optionalText(body.chatUserId);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 const account = await getAccountById(accountId);

 if (!account) {
 return NextResponse.json(
 {
 ok: false,
 error: "账户不存在",
 },
 { status: 404 }
 );
 }

 const membership = buildMembershipRow(account);
 const level = membership.membershipLevel;
 const monthStart = getMemberMonthStartIso();
 const monthLabel = getMemberCurrentMonthLabel();
 const monthlyTrafficLimitBytes = getMemberMonthlyTrafficLimitBytes(level);

 const uploadResult = await readMemberRecentUploads({
 accountId,
 chatUserId,
 monthStart,
 });

 const validRows = uploadResult.rows.filter((row) => {
 const status = normalizeUploadStatus(row.status);

 return status !== "deleted" && status !== "failed";
 });

 const monthlyTrafficUsedBytes = validRows.reduce(
 (total, row) => total + readUploadSize(row.file_size),
 0
 );

 const monthlyImageCount = validRows.filter(
 (row) => row.message_type === "image"
 ).length;

 const monthlyVideoCount = validRows.filter(
 (row) => row.message_type === "video"
 ).length;

 const monthlyUploadCount = validRows.length;

 const monthlyTrafficRemainingBytes =
 monthlyTrafficLimitBytes > 0
 ? Math.max(0, monthlyTrafficLimitBytes - monthlyTrafficUsedBytes)
 : 0;

 const monthlyTrafficUsagePercent =
 monthlyTrafficLimitBytes > 0
 ? Math.min(
 100,
 Number(((monthlyTrafficUsedBytes / monthlyTrafficLimitBytes) * 100).toFixed(2))
 )
 : 0;

 const recentUploads = validRows.slice(0, 20).map((row) => ({
 id: String(row.id || ""),
 roomId: typeof row.room_id === "string" ? row.room_id : null,
 mediaPath: typeof row.media_path === "string" ? row.media_path : null,
 messageType:
 row.message_type === "video"
 ? "video"
 : row.message_type === "image"
 ? "image"
 : "unknown",
 fileName: typeof row.file_name === "string" ? row.file_name : null,
 fileType: typeof row.file_type === "string" ? row.file_type : null,
 fileSize: readUploadSize(row.file_size),
 status: normalizeUploadStatus(row.status),
 createdAt: typeof row.created_at === "string" ? row.created_at : null,
 sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
 deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : null,
 }));

 return NextResponse.json({
 ok: true,
 message: "会员流量统计已读取",
 data: {
 membership,
 monthLabel,
 monthStart,
 monthlyTrafficUsedBytes,
 monthlyTrafficLimitBytes,
 monthlyTrafficRemainingBytes,
 monthlyTrafficUsagePercent,
 monthlyUploadCount,
 monthlyImageCount,
 monthlyVideoCount,
 recentUploads,
 source: uploadResult.readable
 ? "private_chat_media_uploads"
 : "private_chat_media_uploads_unavailable",
 readable: uploadResult.readable,
 readError: uploadResult.error,
 },
 });
}

async function handleGetMembership(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 const account = await getAccountById(accountId);

 if (!account) {
 return NextResponse.json(
 {
 ok: false,
 error: "账户不存在",
 },
 { status: 404 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "会员信息已读取",
 data: buildMembershipRow(account),
 });
}

async function handleUpdateMembershipMock(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const nextLevel = normalizeMembershipLevel(body.membershipLevel);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 const existingAccount = await getAccountById(accountId);

 if (!existingAccount) {
 return NextResponse.json(
 {
 ok: false,
 error: "账户不存在",
 },
 { status: 404 }
 );
 }

 const now = new Date();

 const expiresAt =
 nextLevel === "free" ? null : addDays(now, nextLevel === "svip" ? 365 : 30);

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: nextLevel,
 membership_status: "active",
 membership_started_at: nextLevel === "free" ? null : now.toISOString(),
 membership_expires_at: expiresAt ? expiresAt.toISOString() : null,
 membership_source: "test",
 membership_note:
 nextLevel === "free"
 ? "测试恢复 Free"
 : `测试模拟升级 ${nextLevel.toUpperCase()}`,
 updated_at: now.toISOString(),
 })
 .eq("id", accountId)
 .select(getMembershipSelectColumns())
 .single();

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 const updatedAccount = data as unknown as Record<string, unknown>;

 return NextResponse.json({
 ok: true,
 message:
 nextLevel === "free"
 ? "已恢复 Free"
 : `已模拟升级为 ${nextLevel.toUpperCase()}`,
 data: buildMembershipRow(updatedAccount),
 });
}

async function handleCreateMembershipOrder(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const chatUserId = optionalText(body.chatUserId);
 const userName = optionalText(body.userName);
 const userAvatar = optionalText(body.userAvatar);
 const walletAddress = optionalText(body.walletAddress);
 const paymentAddress =
 optionalText(body.paymentAddress) || optionalText(defaultPaymentAddress);
 const note = optionalText(body.note);

 const level = normalizePaidMembershipLevel(body.membershipLevel);
 const planConfig = await getMembershipPlanConfig(level);

 if (!planConfig.isActive) {
 return NextResponse.json(
 {
 ok: false,
 error: `${planConfig.title} 当前暂未开放购买。`,
 },
 { status: 403 }
 );
 }

 const durationDays = Math.max(
 1,
 Math.min(
 3650,
 Math.floor(readNumber(body.durationDays, planConfig.durationDays))
 )
 );
 const baseAmount = Math.max(0, readNumber(body.amount, planConfig.amount));

 const currency = optionalText(body.currency) || planConfig.currency || "USDT";
 const chain = optionalText(body.chain) || planConfig.chain || "BSC";

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!paymentAddress) {
 return NextResponse.json(
 {
 ok: false,
 error:
 "缺少会员收款地址，请先在 .env.local 设置 PRIVATE_CHAT_MEMBERSHIP_PAYMENT_ADDRESS。",
 },
 { status: 400 }
 );
 }

 if (currency.toUpperCase() !== "USDT" || chain.toUpperCase() !== "BSC") {
 return NextResponse.json(
 {
 ok: false,
 error: "当前自动入账识别只支持 BSC 链 USDT。",
 },
 { status: 400 }
 );
 }

 const existingAccount = await getAccountById(accountId);

 if (!existingAccount) {
 return NextResponse.json(
 {
 ok: false,
 error: "账户不存在",
 },
 { status: 404 }
 );
 }

 const now = new Date();

 const { error: cancelPendingError } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 status: "cancelled",
 cancelled_at: now.toISOString(),
 updated_at: now.toISOString(),
 note: "创建新会员订单时自动取消旧的待支付订单",
 })
 .eq("account_id", accountId)
 .in("status", ["pending", "paid"]);

 if (cancelPendingError) {
 return NextResponse.json(
 {
 ok: false,
 error: cancelPendingError.message,
 },
 { status: 500 }
 );
 }

 const amount = await createUniqueOrderAmount({
 accountId,
 paymentAddress: paymentAddress.slice(0, 120),
 baseAmount,
 level,
});

 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .insert({
 account_id: accountId,
 chat_user_id: chatUserId,
 user_name: userName?.slice(0, 60) || null,
 user_avatar: userAvatar?.slice(0, 20) || null,
 membership_level: level,
 duration_days: durationDays,
 amount,
 currency: currency.slice(0, 20),
 chain: chain.slice(0, 20),
 wallet_address: walletAddress?.slice(0, 120) || null,
 payment_address: paymentAddress.slice(0, 120),
 tx_hash: null,
 status: "pending",
 source: "wallet_auto_detect",
 started_at: null,
 expires_at: null,
 paid_at: null,
 cancelled_at: null,
 note:
 note?.slice(0, 200) ||
 `创建 ${level.toUpperCase()} 会员订单，请按唯一金额 ${amount} USDT 转账，系统将自动检测并激活`,
 created_at: now.toISOString(),
 updated_at: now.toISOString(),
 })
 .select(getOrderSelectColumns())
 .single();

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "会员订单已创建，请按唯一金额转账，系统会自动检测入账。",
 data: buildOrderRow(data as unknown as Record<string, unknown>),
 });
}

async function autoCheckPendingOrders(rows: MembershipOrderRow[]) {
 const pendingRows = rows.filter(
 (row) =>
 row.status === "pending" &&
 row.currency.toUpperCase() === "USDT" &&
 row.chain.toUpperCase() === "BSC" &&
 row.paymentAddress
 );

 if (pendingRows.length === 0) return rows;

 const checkedRows: MembershipOrderRow[] = [];

 for (const row of rows) {
 if (!pendingRows.some((item) => item.id === row.id)) {
 checkedRows.push(row);
 continue;
 }

 try {
 const response = await verifyAndActivateMembershipOrderByTransferScan({
 accountId: row.accountId,
 orderId: row.id,
 });

 const body = (await response.json()) as {
 ok?: boolean;
 data?: {
 order?: MembershipOrderRow;
 };
 };

 checkedRows.push(body?.data?.order || row);
 } catch {
 checkedRows.push(row);
 }
 }

 return checkedRows;
}

async function handleListMembershipOrders(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .select(getOrderSelectColumns())
 .eq("account_id", accountId)
 .order("created_at", { ascending: false })
 .limit(50);

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 const rows = Array.isArray(data)
 ? data.map((item) =>
 buildOrderRow(item as unknown as Record<string, unknown>)
 )
 : [];

 const checkedRows = await autoCheckPendingOrders(rows);

 return NextResponse.json({
 ok: true,
 message: "会员订单已读取",
 data: checkedRows,
 });
}

async function handleCancelMembershipOrder(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const orderId = requireText(body.orderId);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!orderId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 orderId",
 },
 { status: 400 }
 );
 }

 const existingOrder = await findOrderByAccountAndId({
 accountId,
 orderId,
 });

 if (!existingOrder) {
 return NextResponse.json(
 {
 ok: false,
 error: "订单不存在",
 },
 { status: 404 }
 );
 }

 if (existingOrder.status === "cancelled") {
 return NextResponse.json({
 ok: true,
 message: "订单已经是取消状态",
 data: existingOrder,
 });
 }

 const now = new Date();

 const { error: cancelAllError } = await supabaseAdmin
 .from("private_chat_membership_orders")
 .update({
 status: "cancelled",
 cancelled_at: now.toISOString(),
 updated_at: now.toISOString(),
 note: "开发期取消会员订单，并清理当前账号下所有未结束订单",
 })
 .eq("account_id", accountId)
 .in("status", ["pending", "paid", "active"]);

 if (cancelAllError) {
 return NextResponse.json(
 {
 ok: false,
 error: cancelAllError.message,
 },
 { status: 500 }
 );
 }

 const { error: resetAccountError } = await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: "free",
 membership_status: "active",
 membership_started_at: null,
 membership_expires_at: null,
 membership_source: "dev_cancel_order",
 membership_note: `开发期取消会员订单，恢复 Free，订单 ID：${orderId}`,
 updated_at: now.toISOString(),
 })
 .eq("id", accountId);

 if (resetAccountError) {
 return NextResponse.json(
 {
 ok: false,
 error: resetAccountError.message,
 },
 { status: 500 }
 );
 }

 const updatedOrder = await findOrderByAccountAndId({
 accountId,
 orderId,
 });

 return NextResponse.json({
 ok: true,
 message: "会员订单已取消，会员状态已恢复 Free",
 data:
 updatedOrder ||
 ({
 ...existingOrder,
 status: "cancelled",
 cancelledAt: now.toISOString(),
 updatedAt: now.toISOString(),
 note: "开发期取消会员订单，并恢复 Free",
 } as MembershipOrderRow),
 });
}

async function handleCheckMembershipOrderPayment(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const orderId = requireText(body.orderId);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!orderId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 orderId",
 },
 { status: 400 }
 );
 }

 return await verifyAndActivateMembershipOrderByTransferScan({
 accountId,
 orderId,
 });
}

/**
 * 兼容旧 action 名。
 * 新流程不再需要用户提交 txHash；如果旧前端仍提交 txHash，后端仍可自动校验并激活。
 */
async function handleSubmitMembershipPaymentTxHash(
 body: Record<string, unknown>
) {
 const accountId = requireText(body.accountId);
 const orderId = requireText(body.orderId);
 const txHash = normalizeTxHash(body.txHash);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!orderId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 orderId",
 },
 { status: 400 }
 );
 }

 if (!txHash) {
 return await verifyAndActivateMembershipOrderByTransferScan({
 accountId,
 orderId,
 });
 }

 return await verifyAndActivateMembershipOrder({
 accountId,
 orderId,
 txHash,
 });
}

/**
 * 兼容旧 action 名。
 * 现在不再需要 owner 人工审核；这个 action 也会走自动链上校验并自动激活。
 */
async function handleConfirmMembershipOrderPayment(
 body: Record<string, unknown>
) {
 const accountId = requireText(body.accountId);
 const orderId = requireText(body.orderId);
 const txHash = normalizeTxHash(body.txHash);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!orderId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 orderId",
 },
 { status: 400 }
 );
 }

 if (!txHash) {
 return await verifyAndActivateMembershipOrderByTransferScan({
 accountId,
 orderId,
 });
 }

 return await verifyAndActivateMembershipOrder({
 accountId,
 orderId,
 txHash,
 });
}


async function handleGetPublicMembershipPlans() {
 const plans = await Promise.all([
 getMembershipPlanConfig("vip"),
 getMembershipPlanConfig("svip"),
 ]);

 return NextResponse.json({
 ok: true,
 message: "会员套餐配置已读取。",
 data: plans,
 });
}

async function handleGetMembershipPlans(body: Record<string, unknown>) {
 const actorId = requireText(body.actorId);
 const ownerCheck = await requireOwner(actorId);

 if (!ownerCheck.ok) {
 return NextResponse.json(
 {
 ok: false,
 error: ownerCheck.error,
 },
 { status: 403 }
 );
 }

 const plans = await Promise.all([
 getMembershipPlanConfig("vip"),
 getMembershipPlanConfig("svip"),
 ]);

 return NextResponse.json({
 ok: true,
 message: "会员价格配置已读取。",
 data: plans,
 });
}

async function handleOwnerUpdateMembershipPlan(body: Record<string, unknown>) {
 const actorId = requireText(body.actorId);
 const ownerCheck = await requireOwner(actorId);

 if (!ownerCheck.ok) {
 return NextResponse.json(
 {
 ok: false,
 error: ownerCheck.error,
 },
 { status: 403 }
 );
 }

 const level = normalizePaidMembershipLevel(body.level || body.membershipLevel);
 const current = await getMembershipPlanConfig(level);
 const amount = Math.max(0, readNumber(body.amount, current.amount));
 const durationDays = Math.max(
 1,
 Math.min(3650, Math.floor(readNumber(body.durationDays, current.durationDays)))
 );
 const isActive = body.isActive === false ? false : true;
 const now = new Date().toISOString();

 const payload = {
 level,
 title: level === "svip" ? "SVIP 会员" : "VIP 会员",
 subtitle:
 level === "svip" ? "适合重度私密聊天用户" : "适合高频聊天用户",
 amount,
 duration_days: durationDays,
 currency: "USDT",
 chain: "BSC",
 is_active: isActive,
 updated_at: now,
 };

 try {
 const { data, error } = await supabaseAdmin
 .from("private_chat_membership_plans")
 .upsert(payload, { onConflict: "level" })
 .select(getMembershipPlanSelectColumns())
 .single();

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "会员价格已保存。",
 data: buildMembershipPlanConfigRow(data as unknown as Record<string, unknown>),
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "保存会员价格失败。";

 return NextResponse.json(
 {
 ok: false,
 error: `${message} 请确认已执行 private_chat_membership_owner_management.sql。`,
 },
 { status: 500 }
 );
 }
}

async function handleOwnerListMemberships(body: Record<string, unknown>) {
 const actorId = requireText(body.actorId);
 const ownerCheck = await requireOwner(actorId);

 if (!ownerCheck.ok) {
 return NextResponse.json(
 {
 ok: false,
 error: ownerCheck.error,
 },
 { status: 403 }
 );
 }

 const levelFilter = normalizeMembershipLevel(body.membershipLevel);
 const searchText = optionalText(body.searchText);

 let query = supabaseAdmin
 .from("app_accounts")
 .select(getOwnerMembershipSelectColumns())
 .order("updated_at", { ascending: false })
 .limit(200);

 // owner 会员管理列表只显示付费会员：VIP / SVIP。
 // Free 账户不在这里展示，避免会员管理页面被普通账户占满。
 if (levelFilter === "vip" || levelFilter === "svip") {
 query = query.eq("membership_level", levelFilter);
 } else {
 query = query.in("membership_level", ["vip", "svip"]);
 }

 if (searchText) {
 query = query.or(
 `email.ilike.%${searchText}%,display_name.ilike.%${searchText}%,wallet_address.ilike.%${searchText}%`
 );
 }

 const { data, error } = await query;

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 const rows = Array.isArray(data)
 ? data.map((item) =>
 buildOwnerMembershipUserRow(item as unknown as Record<string, unknown>)
 )
 : [];

 return NextResponse.json({
 ok: true,
 message: "会员账户列表已读取。",
 data: rows,
 });
}

async function handleOwnerUpdateAccountMembership(
 body: Record<string, unknown>
) {
 const actorId = requireText(body.actorId);
 const ownerCheck = await requireOwner(actorId);

 if (!ownerCheck.ok) {
 return NextResponse.json(
 {
 ok: false,
 error: ownerCheck.error,
 },
 { status: 403 }
 );
 }

 const accountId = requireText(body.accountId);
 const nextLevel = normalizeMembershipLevel(body.membershipLevel);
 const note = optionalText(body.note);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId。",
 },
 { status: 400 }
 );
 }

 const existingAccount = await getAccountById(accountId);

 if (!existingAccount) {
 return NextResponse.json(
 {
 ok: false,
 error: "账户不存在。",
 },
 { status: 404 }
 );
 }

 const now = new Date();
 const durationDays = Math.max(
 1,
 Math.min(
 3650,
 Math.floor(readNumber(body.durationDays, getDefaultDurationDays(nextLevel)))
 )
 );
 const expiresAt = nextLevel === "free" ? null : addDays(now, durationDays);

 const { data, error } = await supabaseAdmin
 .from("app_accounts")
 .update({
 membership_level: nextLevel,
 membership_status: "active",
 membership_started_at: nextLevel === "free" ? null : now.toISOString(),
 membership_expires_at: expiresAt ? expiresAt.toISOString() : null,
 membership_source: "owner_manual_manage",
 membership_note:
 note?.slice(0, 200) ||
 (nextLevel === "free"
 ? "owner 手动恢复 Free"
 : `owner 手动开通 ${nextLevel.toUpperCase()} 会员`),
 updated_at: now.toISOString(),
 })
 .eq("id", accountId)
 .select(getOwnerMembershipSelectColumns())
 .single();

 if (error) {
 return NextResponse.json(
 {
 ok: false,
 error: error.message,
 },
 { status: 500 }
 );
 }

 return NextResponse.json({
 ok: true,
 message: "会员账户已更新。",
 data: buildOwnerMembershipUserRow(data as unknown as Record<string, unknown>),
 });
}

async function handleActivateMembershipOrderMock(body: Record<string, unknown>) {
 const accountId = requireText(body.accountId);
 const orderId = requireText(body.orderId);
 const txHash = optionalText(body.txHash);

 if (!accountId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 accountId",
 },
 { status: 400 }
 );
 }

 if (!orderId) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 orderId",
 },
 { status: 400 }
 );
 }

 const order = await findOrderByAccountAndId({
 accountId,
 orderId,
 });

 if (!order) {
 return NextResponse.json(
 {
 ok: false,
 error: "订单不存在",
 },
 { status: 404 }
 );
 }

 if (order.status !== "pending" && order.status !== "paid") {
 return NextResponse.json(
 {
 ok: false,
 error: "该订单当前状态不可激活",
 },
 { status: 400 }
 );
 }

 try {
 const result = await activateMembershipFromOrder({
 order,
 txHash: txHash?.slice(0, 160) || order.txHash,
 source: "wallet_order_mock",
 note: `测试激活 ${order.membershipLevel.toUpperCase()} 会员订单`,
 });

 return NextResponse.json({
 ok: true,
 message: "会员订单已模拟激活",
 data: result,
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "测试激活失败。";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}

export async function POST(request: Request) {
 try {
 const body = (await request.json()) as Record<string, unknown>;
 const action = body.action as MembershipAction | undefined;

 if (!action) {
 return NextResponse.json(
 {
 ok: false,
 error: "缺少 action",
 },
 { status: 400 }
 );
 }

 if (action === "get_membership") {
 return await handleGetMembership(body);
 }

 if (action === "get_member_usage_summary") {
 return await handleGetMemberUsageSummary(body);
 }

 if (action === "update_membership_mock") {
 return await handleUpdateMembershipMock(body);
 }

 if (action === "create_membership_order") {
 return await handleCreateMembershipOrder(body);
 }

 if (action === "list_membership_orders") {
 return await handleListMembershipOrders(body);
 }

 if (action === "cancel_membership_order") {
 return await handleCancelMembershipOrder(body);
 }

 if (action === "check_membership_order_payment") {
 return await handleCheckMembershipOrderPayment(body);
 }

 if (action === "submit_membership_payment_txhash") {
 return await handleSubmitMembershipPaymentTxHash(body);
 }

 if (action === "confirm_membership_order_payment") {
 return await handleConfirmMembershipOrderPayment(body);
 }

 if (action === "get_public_membership_plans") {
 return await handleGetPublicMembershipPlans();
 }

 if (action === "get_membership_plans") {
 return await handleGetMembershipPlans(body);
 }

 if (action === "owner_update_membership_plan") {
 return await handleOwnerUpdateMembershipPlan(body);
 }

 if (action === "owner_list_memberships") {
 return await handleOwnerListMemberships(body);
 }

 if (action === "owner_update_account_membership") {
 return await handleOwnerUpdateAccountMembership(body);
 }

 if (action === "activate_membership_order_mock") {
 return await handleActivateMembershipOrderMock(body);
 }

 return NextResponse.json(
 {
 ok: false,
 error: "未知 action",
 },
 { status: 400 }
 );
 } catch (error) {
 const message = error instanceof Error ? error.message : "服务器错误";

 return NextResponse.json(
 {
 ok: false,
 error: message,
 },
 { status: 500 }
 );
 }
}
