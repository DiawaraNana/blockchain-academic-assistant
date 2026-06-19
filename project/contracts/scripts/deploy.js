import hre from "hardhat";
import { keccak256, toBytes } from "viem";

async function main() {
  const [deployer, professor, student] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address, "\n");

  // 1. RoleManager
  const RoleManager = await hre.ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy();
  await roleManager.waitForDeployment();
  console.log("RoleManager:       ", roleManager.target);

  // 2. AnnouncementLog
  const AnnouncementLog = await hre.ethers.getContractFactory("AnnouncementLog");
  const announcementLog = await AnnouncementLog.deploy(roleManager.target);
  await announcementLog.waitForDeployment();
  console.log("AnnouncementLog:   ", announcementLog.target);

  // 3. AcknowledgmentLog
  const AcknowledgmentLog = await hre.ethers.getContractFactory("AcknowledgmentLog");
  const acknowledgmentLog = await AcknowledgmentLog.deploy(
    announcementLog.target,
    roleManager.target
  );
  await acknowledgmentLog.waitForDeployment();
  console.log("AcknowledgmentLog: ", acknowledgmentLog.target);

  // 4. DocumentRegistry
  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy(roleManager.target);
  await documentRegistry.waitForDeployment();
  console.log("DocumentRegistry:  ", documentRegistry.target);

  // ── Seed roles and groups for local development ────────────────────────
  const PROFESSOR_ROLE = keccak256(toBytes("PROFESSOR"));
  const STUDENT_ROLE   = keccak256(toBytes("STUDENT"));
  const GROUP_MF1      = keccak256(toBytes("MF1"));
  const GROUP_MF2      = keccak256(toBytes("MF2"));

  await roleManager.registerGroup("MF1");
  await roleManager.registerGroup("MF2");
  console.log("\nGroups registered: MF1, MF2");

  await roleManager.assignRole(professor.address, PROFESSOR_ROLE);
  await roleManager.assignRole(student.address,   STUDENT_ROLE);
  await roleManager.assignGroup(student.address,  GROUP_MF1);
  console.log("Roles assigned.");

  console.log("\nAll contracts deployed and seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});