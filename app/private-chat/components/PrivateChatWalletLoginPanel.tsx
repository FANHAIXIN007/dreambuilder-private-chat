"use client";

type PrivateChatWalletLoginPanelProps = {
  onSessionChanged?: (session: any) => void;
};

export default function PrivateChatWalletLoginPanel(_props: PrivateChatWalletLoginPanelProps) {
  return (
    <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
      <p className="font-semibold">钱包登录维护中</p>
      <p className="mt-1 text-amber-100/80">
        当前线上部署版本暂时关闭钱包登录入口。请先使用邮箱登录，钱包登录会在修复后重新开放。
      </p>
    </div>
  );
}
