import {
  createPublicClient,
  http,
  keccak256,
  toBytes,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { hardhat } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────
// PUBLIC CLIENT (READ ONLY)
// ─────────────────────────────
export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(process.env.RPC_URL || "http://127.0.0.1:8545"),
});

// ─────────────────────────────
// CONTRACT ADDRESSES
// ─────────────────────────────
export const CONTRACT_ADDRESSES = {
  roleManager: (process.env.ROLE_MANAGER || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  announcementLog: (process.env.ANNOUNCEMENT_LOG || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  acknowledgmentLog: (process.env.ACKNOWLEDGMENT_LOG || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  documentRegistry: (process.env.DOCUMENT_REGISTRY || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

// ─────────────────────────────
// ROLES
// ─────────────────────────────
export const ROLES = {
  PROFESSOR: keccak256(toBytes("PROFESSOR")) as `0x${string}`,
  STUDENT: keccak256(toBytes("STUDENT")) as `0x${string}`,
};

export const GROUP_ALL = keccak256(toBytes("all")) as `0x${string}`;

// ─────────────────────────────
// STRING TO BYTES32 CONVERTER - FIXED with keccak256
// ─────────────────────────────
export function stringToBytes32(str: string): `0x${string}` {
  // Handle "all" special case
  if (str === "all") {
    return GROUP_ALL;
  }
  
  // IMPORTANT: Use keccak256 to match the contract's isValidGroup check
  // The contract stores groups as keccak256(groupName)
  const keccakHash = keccak256(toBytes(str));
  return keccakHash;
}

// ─────────────────────────────
// ROLE MANAGER ABI
// ─────────────────────────────
export const ROLE_MANAGER_ABI = [
  {
    inputs: [],
    name: "PROFESSOR_ROLE",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STUDENT_ROLE",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GROUP_ALL",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getGroup",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "group", type: "bytes32" }],
    name: "isValidGroup",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "registerGroup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "role", type: "bytes32" },
    ],
    name: "assignRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "group", type: "bytes32" },
    ],
    name: "assignGroup",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ─────────────────────────────
// ANNOUNCEMENT LOG ABI
// ─────────────────────────────
export const ANNOUNCEMENT_LOG_ABI = [
  {
    inputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "group", type: "bytes32" },
      { name: "category", type: "string" },
    ],
    name: "publish",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "get",
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "contentHash", type: "bytes32" },
          { name: "group", type: "bytes32" },
          { name: "category", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "publisher", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAll",
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "contentHash", type: "bytes32" },
          { name: "group", type: "bytes32" },
          { name: "category", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "publisher", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    name: "getPage",
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "contentHash", type: "bytes32" },
          { name: "group", type: "bytes32" },
          { name: "category", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "publisher", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "count",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "id", type: "uint256" },
      { name: "hash", type: "bytes32" },
    ],
    name: "verify",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─────────────────────────────
// ACKNOWLEDGMENT LOG ABI
// ─────────────────────────────
export const ACKNOWLEDGMENT_LOG_ABI = [
  {
    inputs: [{ name: "announcementId", type: "uint256" }],
    name: "acknowledge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "announcementId", type: "uint256" },
      { name: "student", type: "address" },
    ],
    name: "hasAcknowledged",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "announcementId", type: "uint256" }],
    name: "getAcknowledgers",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "announcementId", type: "uint256" },
      { name: "student", type: "address" },
    ],
    name: "getAcknowledgedAt",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─────────────────────────────
// DOCUMENT REGISTRY ABI
// ─────────────────────────────
export const DOCUMENT_REGISTRY_ABI = [
  {
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "group", type: "bytes32" },
      { name: "name", type: "string" },
    ],
    name: "register",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "get",
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "hash", type: "bytes32" },
          { name: "group", type: "bytes32" },
          { name: "name", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "registrant", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "count",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "id", type: "uint256" },
      { name: "hash", type: "bytes32" },
    ],
    name: "verify",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "id", type: "uint256" },
      { name: "hash", type: "bytes32" },
    ],
    name: "verifyDocument",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────
export async function getWalletGroup(address: `0x${string}`): Promise<`0x${string}`> {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return GROUP_ALL;
  }

  try {
    const group = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.roleManager,
      abi: ROLE_MANAGER_ABI,
      functionName: "getGroup",
      args: [address],
    })) as `0x${string}`;

    // If user has no group (bytes32 zero), return GROUP_ALL
    if (group === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return GROUP_ALL;
    }
    return group;
  } catch (error) {
    console.error("Error getting wallet group:", error);
    return GROUP_ALL;
  }
}

export async function getWalletRole(
  address: `0x${string}`
): Promise<"PROFESSOR" | "STUDENT" | "NONE"> {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return "NONE";
  }

  try {
    const [isProf, isStudent] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.roleManager,
        abi: ROLE_MANAGER_ABI,
        functionName: "hasRole",
        args: [ROLES.PROFESSOR, address],
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESSES.roleManager,
        abi: ROLE_MANAGER_ABI,
        functionName: "hasRole",
        args: [ROLES.STUDENT, address],
      }),
    ]);

    if (isProf) return "PROFESSOR";
    if (isStudent) return "STUDENT";
    return "NONE";
  } catch (error) {
    console.error("Error getting wallet role:", error);
    return "NONE";
  }
}

// ─────────────────────────────
// ENCODE TRANSACTIONS FOR METAMASK
// ─────────────────────────────
export function encodePublishTransaction(
  contentHash: `0x${string}`,
  group: string,
  category: string
): `0x${string}` {
  const groupBytes32 = stringToBytes32(group);
  
  return encodeFunctionData({
    abi: ANNOUNCEMENT_LOG_ABI,
    functionName: "publish",
    args: [contentHash, groupBytes32, category],
  });
}

export function encodeAcknowledgeTransaction(
  announcementId: bigint | number
): `0x${string}` {
  return encodeFunctionData({
    abi: ACKNOWLEDGMENT_LOG_ABI,
    functionName: "acknowledge",
    args: [BigInt(announcementId)],
  });
}

export function encodeDocumentRegistrationTransaction(
  hash: `0x${string}`,
  group: string,
  name: string
): `0x${string}` {
  const groupBytes32 = stringToBytes32(group);
  
  return encodeFunctionData({
    abi: DOCUMENT_REGISTRY_ABI,
    functionName: "register",
    args: [hash, groupBytes32, name],
  });
}

// ─────────────────────────────
// GET ANNOUNCEMENTS FILTERED BY GROUP
// ─────────────────────────────
// In blockchain.ts - update getAnnouncementsForGroup
export async function getAnnouncementsForGroup(userGroup: `0x${string}`) {
  try {
    const allAnnouncements = (await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "getAll",
      args: [],
    })) as any[];

    // Import here to avoid circular dependency
    const { getAnnouncementContent } = await import('./storage.js');
    
    const announcementsWithId = await Promise.all(allAnnouncements.map(async (announcement, index) => {
      const content = getAnnouncementContent(index);
      return {
        id: index,
        contentHash: announcement.contentHash,
        group: announcement.group,
        category: announcement.category,
        timestamp: announcement.timestamp ? Number(announcement.timestamp) : 0,
        publisher: announcement.publisher,
        content: content || "Contenu non disponible"
      };
    }));

    const filtered = announcementsWithId.filter(
      (announcement) => announcement.group === userGroup || announcement.group === GROUP_ALL
    );

    return filtered;
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
}

// ─────────────────────────────
// GET ANNOUNCEMENT BY ID
// ─────────────────────────────
export async function getAnnouncement(id: number) {
  try {
    const announcement = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "get",
      args: [BigInt(id)],
    });
    return announcement;
  } catch (error) {
    console.error(`Error fetching announcement ${id}:`, error);
    return null;
  }
}

// ─────────────────────────────
// CHECK IF STUDENT ACKNOWLEDGED
// ─────────────────────────────
export async function hasAcknowledged(
  announcementId: number,
  studentAddress: `0x${string}`
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.acknowledgmentLog,
      abi: ACKNOWLEDGMENT_LOG_ABI,
      functionName: "hasAcknowledged",
      args: [BigInt(announcementId), studentAddress],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking acknowledgment:", error);
    return false;
  }
}

// ─────────────────────────────
// VERIFY ANNOUNCEMENT
// ─────────────────────────────
export async function verifyAnnouncement(
  id: number,
  contentHash: `0x${string}`
): Promise<boolean> {
  try {
    const isValid = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "verify",
      args: [BigInt(id), contentHash],
    });
    return isValid as boolean;
  } catch (error) {
    console.error("Error verifying announcement:", error);
    return false;
  }
}

// ─────────────────────────────
// VERIFY DOCUMENT
// ─────────────────────────────
export async function verifyDocument(
  id: number,
  hash: `0x${string}`
): Promise<boolean> {
  try {
    const isValid = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.documentRegistry,
      abi: DOCUMENT_REGISTRY_ABI,
      functionName: "verify",
      args: [BigInt(id), hash],
    });
    return isValid as boolean;
  } catch (error) {
    console.error("Error verifying document:", error);
    return false;
  }
}