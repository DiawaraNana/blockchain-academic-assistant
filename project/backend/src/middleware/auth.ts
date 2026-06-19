// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { publicClient, CONTRACT_ADDRESSES, ROLE_MANAGER_ABI, ROLES } from "../services/blockchain";

export function requireRole(role: "PROFESSOR" | "STUDENT" | "ADMIN") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const wallet = req.headers["x-wallet-address"] as string;

    if (!wallet) {
      return res.status(401).json({ error: "Missing wallet" });
    }

    let roleKey: `0x${string}`;
    if (role === "PROFESSOR") {
      roleKey = ROLES.PROFESSOR;
    } else if (role === "STUDENT") {
      roleKey = ROLES.STUDENT;
    } else {
      // ADMIN role - check if has DEFAULT_ADMIN_ROLE
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      roleKey = DEFAULT_ADMIN_ROLE;
    }

    const ok = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.roleManager,
      abi: ROLE_MANAGER_ABI,
      functionName: "hasRole",
      args: [roleKey, wallet as `0x${string}`],
    });

    if (!ok) return res.status(403).json({ error: "Forbidden" });

    next();
  };
}