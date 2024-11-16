import { http, createPublicClient, stringify } from 'viem'
import { mainnet } from 'viem/chains'
import superjson from 'superjson'

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export const dynamic = 'force-dynamic'
export async function GET() {
  const [blockNumber, block] = await Promise.all([
    client.getBlockNumber(),
    client.getBlock()
  ]);
  console.log(`Block Number: ${superjson.serialize(blockNumber).json}`);
  return Response.json({blockNumber: superjson.serialize(blockNumber).json, block: superjson.serialize(block).json});
}
