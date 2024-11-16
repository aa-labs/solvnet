import {TappdClient} from '@phala/dstack-sdk'
import 'dotenv/config'

export const dynamic = 'force-dynamic'

const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT || 'http://localhost:8090'

export async function GET() {
  console.log(endpoint)
  const client = new TappdClient(endpoint)
  const randomNumString = Math.random().toString();
  console.log(randomNumString);
  const getRemoteAttestation = await client.tdxQuote(randomNumString);
  return Response.json(getRemoteAttestation);
}
