import {TappdClient} from '@phala/dstack-sdk'
import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {keccak256} from "viem";

const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT || 'http://localhost:8090'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const res = await request.json()
  const message = res.message;
  console.log(endpoint)
  const client = new TappdClient(endpoint)
  const testDeriveKey = await client.deriveKey("/", "test");
  const keccakPrivateKey = keccak256(testDeriveKey.asUint8Array());
  const account = privateKeyToAccount(keccakPrivateKey);
  console.log(`Account [${account.address}] Signing Message [${message}]`);
  const signature = await account.signMessage({ message });
  console.log(`Message Signed [${signature}]`)
  return Response.json({ account: account.address, message: message, signature: signature });
}
