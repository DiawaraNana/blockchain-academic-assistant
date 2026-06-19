// scripts/setup-roles.js
const hre = require("hardhat");

async function main() {
  const [admin, professor, student] = await hre.ethers.getSigners();
  
  console.log("Admin:", admin.address);
  console.log("Professor:", professor.address);
  console.log("Student:", student.address);
  
  // Contract address (update with your actual deployment)
  const ROLE_MANAGER_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  
  const roleManager = await hre.ethers.getContractAt("RoleManager", ROLE_MANAGER_ADDRESS);
  
  const PROFESSOR_ROLE = await roleManager.PROFESSOR_ROLE();
  const STUDENT_ROLE = await roleManager.STUDENT_ROLE();
  
  console.log("\n📋 Assigning roles...");
  
  // Assign professor role
  await roleManager.connect(admin).assignRole(professor.address, PROFESSOR_ROLE);
  console.log("✅ Professor role assigned to:", professor.address);
  
  // Assign student role
  await roleManager.connect(admin).assignRole(student.address, STUDENT_ROLE);
  console.log("✅ Student role assigned to:", student.address);
  
  // Register groups
  await roleManager.connect(admin).registerGroup("MF1");
  await roleManager.connect(admin).registerGroup("MF2");
  console.log("✅ Groups registered: MF1, MF2");
  
  // Assign groups
  const GROUP_MF1 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MF1"));
  const GROUP_MF2 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MF2"));
  
  await roleManager.connect(admin).assignGroup(student.address, GROUP_MF1);
  console.log("✅ Student assigned to MF1");
  
  await roleManager.connect(admin).assignGroup(professor.address, GROUP_MF1);
  console.log("✅ Professor assigned to MF1");
  
  // Verify
  console.log("\n📊 Verification:");
  console.log("Professor has PROFESSOR_ROLE:", await roleManager.hasRole(PROFESSOR_ROLE, professor.address));
  console.log("Student has STUDENT_ROLE:", await roleManager.hasRole(STUDENT_ROLE, student.address));
  console.log("Student group:", await roleManager.getGroup(student.address));
}

main().catch(console.error);