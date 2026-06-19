import { expect } from "chai";
import hre from "hardhat";

describe("Decentralized Academic Assistant", function () {
  let roleManager: any;
  let announcementLog: any;
  let acknowledgmentLog: any;
  let documentRegistry: any;

  let admin: any;
  let professor: any;
  let student: any;
  let student2: any;

  // Use hre.ethers to hash — no external ethers import needed
  const hash = (text: string) =>
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes(text));

  let GROUP_MF1: string;
  let GROUP_MF2: string;
  let PROFESSOR_ROLE: string;
  let STUDENT_ROLE: string;

  beforeEach(async function () {
    [admin, professor, student, student2] = await hre.ethers.getSigners();

    GROUP_MF1      = hash("MF1");
    GROUP_MF2      = hash("MF2");
    PROFESSOR_ROLE = hash("PROFESSOR");
    STUDENT_ROLE   = hash("STUDENT");

    // ── Deploy contracts ───────────────────────────────────────────────────
    const RoleManager = await hre.ethers.getContractFactory("RoleManager");
    roleManager = await RoleManager.deploy();
    await roleManager.waitForDeployment();

    const AnnouncementLog = await hre.ethers.getContractFactory("AnnouncementLog");
    announcementLog = await AnnouncementLog.deploy(roleManager.target);
    await announcementLog.waitForDeployment();

    const AcknowledgmentLog = await hre.ethers.getContractFactory("AcknowledgmentLog");
    acknowledgmentLog = await AcknowledgmentLog.deploy(
      announcementLog.target,
      roleManager.target
    );
    await acknowledgmentLog.waitForDeployment();

    const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy(roleManager.target);
    await documentRegistry.waitForDeployment();

    // ── Seed roles and groups ──────────────────────────────────────────────
    await roleManager.registerGroup("MF1");
    await roleManager.registerGroup("MF2");

    await roleManager.assignRole(professor.address, PROFESSOR_ROLE);
    await roleManager.assignRole(student.address,   STUDENT_ROLE);
    await roleManager.assignRole(student2.address,  STUDENT_ROLE);

    await roleManager.assignGroup(student.address,  GROUP_MF1);
    await roleManager.assignGroup(student2.address, GROUP_MF2);
  });

  // ── AnnouncementLog tests ──────────────────────────────────────────────────

  it("Professor can publish announcement", async function () {
    const contentHash = hash("Exam next week");

    await expect(
      announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "exam")
    ).to.not.be.reverted;

    expect(await announcementLog.count()).to.equal(1n);
  });

  it("Student cannot publish announcement", async function () {
    const contentHash = hash("Fake announcement");

    await expect(
      announcementLog.connect(student).publish(contentHash, GROUP_MF1, "exam")
    ).to.be.revertedWith("AnnouncementLog: not a professor");
  });

  it("Verify correct hash returns true", async function () {
    const contentHash = hash("Exam on Friday");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "exam");

    expect(await announcementLog.verify(0, contentHash)).to.equal(true);
  });

  it("Verify tampered hash returns false", async function () {
    const contentHash = hash("Exam on Friday");
    const tamperedHash = hash("Exam on Monday");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "exam");

    expect(await announcementLog.verify(0, tamperedHash)).to.equal(false);
  });

  it("Admin cannot publish (only professor can)", async function () {
    const contentHash = hash("Admin sneaking in");

    await expect(
      announcementLog.connect(admin).publish(contentHash, GROUP_MF1, "exam")
    ).to.be.revertedWith("AnnouncementLog: not a professor");
  });

  it("Publish emits AnnouncementPublished event", async function () {
    const contentHash = hash("Schedule change");

    await expect(
      announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "schedule")
    )
      .to.emit(announcementLog, "AnnouncementPublished")
      .withArgs(0n, contentHash, GROUP_MF1, "schedule", professor.address);
  });

  it("get() returns correct announcement data", async function () {
    const contentHash = hash("Homework due Monday");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "homework");

    const a = await announcementLog.get(0);
    expect(a.contentHash).to.equal(contentHash);
    expect(a.group).to.equal(GROUP_MF1);
    expect(a.category).to.equal("homework");
    expect(a.publisher).to.equal(professor.address);
  });

  it("publish reverts on empty hash", async function () {
    const emptyHash = hre.ethers.ZeroHash;

    await expect(
      announcementLog.connect(professor).publish(emptyHash, GROUP_MF1, "exam")
    ).to.be.revertedWith("AnnouncementLog: empty hash");
  });

  it("publish reverts on invalid group", async function () {
    const contentHash = hash("Exam");
    const fakeGroup   = hash("FAKE_GROUP");

    await expect(
      announcementLog.connect(professor).publish(contentHash, fakeGroup, "exam")
    ).to.be.revertedWith("AnnouncementLog: invalid group");
  });

  // ── AcknowledgmentLog tests ────────────────────────────────────────────────

  it("Student can acknowledge announcement for their group", async function () {
    const contentHash = hash("Homework due");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "homework");

    await expect(
      acknowledgmentLog.connect(student).acknowledge(0)
    ).to.not.be.reverted;

    expect(await acknowledgmentLog.hasAcknowledged(0, student.address)).to.equal(true);
  });

  it("Student cannot acknowledge announcement for wrong group", async function () {
    const contentHash = hash("Homework due");

    // Published for MF1 — student2 is MF2
    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "homework");

    await expect(
      acknowledgmentLog.connect(student2).acknowledge(0)
    ).to.be.revertedWith("AcknowledgmentLog: announcement not for your group");
  });

  it("Student cannot acknowledge the same announcement twice", async function () {
    const contentHash = hash("Homework due");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "homework");
    await acknowledgmentLog.connect(student).acknowledge(0);

    await expect(
      acknowledgmentLog.connect(student).acknowledge(0)
    ).to.be.revertedWith("AcknowledgmentLog: already acknowledged");
  });

  it("Professor cannot acknowledge (only students can)", async function () {
    const contentHash = hash("Exam");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "exam");

    await expect(
      acknowledgmentLog.connect(professor).acknowledge(0)
    ).to.be.revertedWith("AcknowledgmentLog: not a student");
  });

  it("Student can acknowledge 'all' group announcement", async function () {
    const GROUP_ALL = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("all"));
    const contentHash = hash("General notice");

    await announcementLog.connect(professor).publish(contentHash, GROUP_ALL, "notice");

    // Both MF1 and MF2 students can acknowledge
    await expect(acknowledgmentLog.connect(student).acknowledge(0)).to.not.be.reverted;
    await expect(acknowledgmentLog.connect(student2).acknowledge(0)).to.not.be.reverted;

    expect(await acknowledgmentLog.hasAcknowledged(0, student.address)).to.equal(true);
    expect(await acknowledgmentLog.hasAcknowledged(0, student2.address)).to.equal(true);
  });

  it("acknowledge emits Acknowledged event with timestamp", async function () {
    const contentHash = hash("Exam reminder");

    await announcementLog.connect(professor).publish(contentHash, GROUP_MF1, "exam");

    const tx = await acknowledgmentLog.connect(student).acknowledge(0);
    const receipt = await tx.wait();
    const block = await hre.ethers.provider.getBlock(receipt.blockNumber);

    await expect(tx)
      .to.emit(acknowledgmentLog, "Acknowledged")
      .withArgs(0n, student.address, block!.timestamp);
  });

  it("getAcknowledgers returns all students who acknowledged", async function () {
    const contentHash = hash("General notice");
    const GROUP_ALL   = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("all"));

    await announcementLog.connect(professor).publish(contentHash, GROUP_ALL, "notice");

    await acknowledgmentLog.connect(student).acknowledge(0);
    await acknowledgmentLog.connect(student2).acknowledge(0);

    const ackList = await acknowledgmentLog.getAcknowledgers(0);
    expect(ackList).to.include(student.address);
    expect(ackList).to.include(student2.address);
    expect(ackList.length).to.equal(2);
  });

  it("acknowledge reverts for invalid announcement ID", async function () {
    await expect(
      acknowledgmentLog.connect(student).acknowledge(999)
    ).to.be.revertedWith("AcknowledgmentLog: invalid announcement ID");
  });

  // ── DocumentRegistry tests ────────────────────────────────────────────────

  it("Professor can register a document", async function () {
    const docHash = hash("syllabus.pdf contents");

    await expect(
      documentRegistry.connect(professor).register(docHash, GROUP_MF1, "syllabus.pdf")
    ).to.not.be.reverted;

    expect(await documentRegistry.count()).to.equal(1n);
  });

  it("Student cannot register a document", async function () {
    const docHash = hash("syllabus.pdf contents");

    await expect(
      documentRegistry.connect(student).register(docHash, GROUP_MF1, "syllabus.pdf")
    ).to.be.revertedWith("DocumentRegistry: not a professor");
  });

  it("verify returns true for correct document hash", async function () {
    const docHash = hash("exercises.pdf contents");

    await documentRegistry.connect(professor).register(docHash, GROUP_MF1, "exercises.pdf");

    expect(await documentRegistry.verify(0, docHash)).to.equal(true);
  });

  it("verify returns false for tampered document hash", async function () {
    const docHash     = hash("exercises.pdf contents");
    const tamperedHash = hash("tampered contents");

    await documentRegistry.connect(professor).register(docHash, GROUP_MF1, "exercises.pdf");

    expect(await documentRegistry.verify(0, tamperedHash)).to.equal(false);
  });

  it("verifyDocument alias works the same as verify", async function () {
    const docHash = hash("notes.pdf");

    await documentRegistry.connect(professor).register(docHash, GROUP_MF1, "notes.pdf");

    expect(await documentRegistry.verifyDocument(0, docHash)).to.equal(true);
  });

  it("Duplicate document hash is rejected", async function () {
    const docHash = hash("unique-file.pdf");

    await documentRegistry.connect(professor).register(docHash, GROUP_MF1, "file.pdf");

    await expect(
      documentRegistry.connect(professor).register(docHash, GROUP_MF1, "file-copy.pdf")
    ).to.be.revertedWith("DocumentRegistry: file already registered");
  });

  it("register emits DocumentRegistered event", async function () {
    const docHash = hash("slides.pdf");

    await expect(
      documentRegistry.connect(professor).register(docHash, GROUP_MF1, "slides.pdf")
    )
      .to.emit(documentRegistry, "DocumentRegistered")
      .withArgs(0n, docHash, GROUP_MF1, "slides.pdf", professor.address);
  });

  // ── RoleManager tests ─────────────────────────────────────────────────────

  it("Admin can register a group", async function () {
    await expect(roleManager.registerGroup("MF3")).to.not.be.reverted;
    expect(await roleManager.isValidGroup(hash("MF3"))).to.equal(true);
  });

  it("Non-admin cannot register a group", async function () {
    await expect(
      roleManager.connect(professor).registerGroup("MF3")
    ).to.be.reverted;
  });

  it("Cannot register the same group twice", async function () {
    await expect(
      roleManager.registerGroup("MF1")
    ).to.be.revertedWith("RoleManager: group already exists");
  });

  it("Assigning user to unregistered group reverts", async function () {
    const fakeGroup = hash("GHOST");

    await expect(
      roleManager.assignGroup(student.address, fakeGroup)
    ).to.be.revertedWith("RoleManager: group not registered");
  });

  it("getGroup returns correct group for student", async function () {
    expect(await roleManager.getGroup(student.address)).to.equal(GROUP_MF1);
    expect(await roleManager.getGroup(student2.address)).to.equal(GROUP_MF2);
  });
});