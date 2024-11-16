import {TappdClient} from '@phala/dstack-sdk'
import 'dotenv/config'
import { privateKeyToAccount } from 'viem/accounts'
import {keccak256} from "viem";

const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT || 'http://localhost:8090'

const domain = {
  name: 'Ether Mail',
  version: '1',
  chainId: 1,
  verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
}

const types = {
  Person: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
  Mail: [
    { name: 'from', type: 'Person' },
    { name: 'to', type: 'Person' },
    { name: 'contents', type: 'string' },
  ],
}

export const dynamic = 'force-dynamic'

const solverRequests: LoanRequest[] = [
  {
    id: "solver1",
    tokenAmount: 1000,
    duration: 30,
    tokenName: "USDC",
    apr: 5
  },
  {
    id: "solver2",
    tokenAmount: 2000,
    duration: 60,
    tokenName: "USDC",
    apr: 6
  }
];

const userLeaseRequests: LoanRequest[] = [
  {
    id: "userLease1",
    tokenAmount: 800,
    duration: 25,
    tokenName: "USDC",
    apr: 7
  },
  {
    id: "userLease2",
    tokenAmount: 1500,
    duration: 45,
    tokenName: "USDC",
    apr: 6.5
  }
];

type LoanRequest = {
  id: string;
  tokenAmount: number;
  duration: number;
  tokenName: string;
  apr: number;
};

type Match = {
  userLeaseRequest: LoanRequest;
  solverRequest: LoanRequest;
  score: number;
};

function calculateMatchScore(userLeaseRequest: LoanRequest, solverRequest: LoanRequest): number | null {
  if (userLeaseRequest.tokenName !== solverRequest.tokenName ||
      userLeaseRequest.tokenAmount > solverRequest.tokenAmount ||
      userLeaseRequest.duration > solverRequest.duration ||
      userLeaseRequest.apr < solverRequest.apr) {
    return null;
  }

  const amountDiff = Math.abs(solverRequest.tokenAmount - userLeaseRequest.tokenAmount) / userLeaseRequest.tokenAmount * 100;
  const durationDiff = Math.abs(solverRequest.duration - userLeaseRequest.duration) / userLeaseRequest.duration * 100;
  const aprDiff = solverRequest.apr - userLeaseRequest.apr;

  return amountDiff + durationDiff + (aprDiff * 10);
}

function findMatches(userLeaseRequest: LoanRequest, solverRequests: LoanRequest[], maxMatches: number = 5): Match[] {
  const matches = solverRequests
    .map(solverRequest => {
      const score = calculateMatchScore(userLeaseRequest, solverRequest);
      return score !== null ? { userLeaseRequest, solverRequest, score } : null;
    })
    .filter((match): match is Match => match !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxMatches);

  return matches;
}

function findOptimalMatches(userLeaseRequests: LoanRequest[], solverRequests: LoanRequest[]): Match[] {
  let matches: Match[] = [];
  let availableSolvers = [...solverRequests];

  const sortedUserLeases = [...userLeaseRequests].sort((a, b) => b.tokenAmount - a.tokenAmount);

  for (const userLeaseRequest of sortedUserLeases) {
    const possibleMatches = findMatches(userLeaseRequest, availableSolvers, 1);
    
    if (possibleMatches.length > 0) {
      const match = possibleMatches[0];
      matches.push(match);
      availableSolvers = availableSolvers.filter(solver => solver.id !== match.solverRequest.id);
    }
  }

  return matches;
}

export async function GET() {
  const message = {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    },
    to: {
      name: 't/acc',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    },
    contents: 'Hello, t/acc!',
  };


  console.log(endpoint)
  const client = new TappdClient(endpoint)
  const testDeriveKey = await client.deriveKey("/", "test");
  const keccakPrivateKey = keccak256(testDeriveKey.asUint8Array());
  const account = privateKeyToAccount(keccakPrivateKey);
  console.log(`Account [${account.address}] Signing Typed Message [${message}]`);

  const optimalMatches = findOptimalMatches(userLeaseRequests, solverRequests);
  console.log("Optimal matches:", optimalMatches);
  
  const signature = await account.signTypedData({
    // @ts-ignore
    domain: domain,
    types,
    primaryType: 'Mail',
    message,
  })
  console.log(`Typed Message Signed [${signature}]`)
  return Response.json({ account: account.address, message: message, signature: signature });
}
