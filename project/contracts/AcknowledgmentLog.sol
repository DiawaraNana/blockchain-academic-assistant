// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AnnouncementLog.sol";
import "./RoleManager.sol";

/**
 * @title AcknowledgmentLog
 * @notice Records cryptographic, timestamped proof that a student read an announcement.
 *         Enforces group membership — students can only acknowledge announcements
 *         targeting their group or "all". Maintains a list of acknowledgers per
 *         announcement for the professor dashboard.
 */
contract AcknowledgmentLog {

    AnnouncementLog public immutable announcementLog;
    RoleManager     public immutable roleManager;

    /// @notice acknowledged[announcementId][student] = true if signed
    mapping(uint256 => mapping(address => bool))    public acknowledged;

    /// @notice acknowledgedAt[announcementId][student] = block.timestamp
    mapping(uint256 => mapping(address => uint256)) public acknowledgedAt;

    /// @notice _ackList[announcementId] = list of all students who acknowledged
    mapping(uint256 => address[]) private _ackList;

    event Acknowledged(
        uint256 indexed announcementId,
        address indexed student,
        uint256         timestamp
    );

    modifier onlyStudent() {
        require(
            roleManager.hasRole(roleManager.STUDENT_ROLE(), msg.sender),
            "AcknowledgmentLog: not a student"
        );
        _;
    }

    constructor(address announcementLogAddress, address roleManagerAddress) {
        require(announcementLogAddress != address(0), "AcknowledgmentLog: zero address");
        require(roleManagerAddress     != address(0), "AcknowledgmentLog: zero address");
        announcementLog = AnnouncementLog(announcementLogAddress);
        roleManager     = RoleManager(roleManagerAddress);
    }

    /**
     * @notice Acknowledge an announcement. Student-only, one acknowledgment per student.
     *         Enforces group membership: the announcement must target the student's
     *         group or the special "all" group.
     * @param announcementId ID of the announcement to acknowledge.
     */
    function acknowledge(uint256 announcementId) external onlyStudent {
        require(
            announcementId < announcementLog.count(),
            "AcknowledgmentLog: invalid announcement ID"
        );
        require(
            !acknowledged[announcementId][msg.sender],
            "AcknowledgmentLog: already acknowledged"
        );

        // ── Group enforcement ──────────────────────────────────────────────
        AnnouncementLog.Announcement memory a = announcementLog.get(announcementId);
        bytes32 studentGroup = roleManager.getGroup(msg.sender);

        require(
            studentGroup == a.group || a.group == roleManager.GROUP_ALL(),
            "AcknowledgmentLog: announcement not for your group"
        );
        // ──────────────────────────────────────────────────────────────────

        acknowledged[announcementId][msg.sender]   = true;
        acknowledgedAt[announcementId][msg.sender]  = block.timestamp;
        _ackList[announcementId].push(msg.sender);

        emit Acknowledged(announcementId, msg.sender, block.timestamp);
    }

    /**
     * @notice Check whether a specific student acknowledged an announcement.
     */
    function hasAcknowledged(uint256 announcementId, address student)
        external view returns (bool)
    {
        return acknowledged[announcementId][student];
    }

    /**
     * @notice Return all students who acknowledged a given announcement.
     *         Used by the professor dashboard ("who read what, when?").
     */
    function getAcknowledgers(uint256 announcementId)
        external view returns (address[] memory)
    {
        return _ackList[announcementId];
    }

    /**
     * @notice Return the timestamp at which a student acknowledged an announcement.
     *         Returns 0 if the student has not acknowledged.
     */
    function getAcknowledgedAt(uint256 announcementId, address student)
        external view returns (uint256)
    {
        return acknowledgedAt[announcementId][student];
    }
}