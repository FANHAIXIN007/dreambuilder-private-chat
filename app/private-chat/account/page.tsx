import PrivateChatAccountCenterPanel from "../components/PrivateChatAccountCenterPanel";

export default function PrivateChatAccountPage() {
  return (
    <main className="min-h-screen bg-[#050816] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px] space-y-4">
        <div className="w-full">
          <PrivateChatAccountCenterPanel />
        </div>
      </div>
    </main>
  );
}
