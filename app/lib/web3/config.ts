import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
 chains: [bsc],
 connectors: [
 injected(),
 ],
 transports: {
 [bsc.id]: http(
 process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org"
 ),
 },
 ssr: true,
});