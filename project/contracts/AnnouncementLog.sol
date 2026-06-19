// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleManager.sol";

/**
 * @title AnnouncementLog
 * @notice Immutable on-chain log of academic announcements.
 *         Groups are bytes32 for gas-efficient storage and O(1) comparison.
 *         Supports paginated and full retrieval for the frontend.
 */
contract AnnouncementLog {

    struct Announcement {
        bytes32 contentHash; // SHA-256 of the announcement body
        bytes32 group;       // bytes32 group key — cheap to compare
        string  category;    // e.g. "exam", "homework", "schedule"
        uint256 timestamp;
        address publisher;
    }

    RoleManager public immutable roleManager;
    Announcement[] private _announcements;

    event AnnouncementPublished(
        uint256 indexed id,
        bytes32 indexed contentHash,
        bytes32 indexed group,
        string          category,
        address         publisher
    );

    modifier onlyProfessor() {
        require(
            roleManager.hasRole(roleManager.PROFESSOR_ROLE(), msg.sender),
            "AnnouncementLog: not a professor"
        );
        _;
    }

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "AnnouncementLog: zero address");
        roleManager = RoleManager(roleManagerAddress);
    }

    /**
     * @notice Publish a new announcement. Professor-only.
     * @param contentHash SHA-256 of the announcement body (computed off-chain).
     * @param group       bytes32 key of a registered group (or GROUP_ALL).
     * @param category    Label: "exam", "homework", "schedule", etc.
     */
    function publish(
        bytes32        contentHash,
        bytes32        group,
        string calldata category
    ) external onlyProfessor {
        require(contentHash != bytes32(0),        "AnnouncementLog: empty hash");
        require(roleManager.isValidGroup(group),  "AnnouncementLog: invalid group");
        require(bytes(category).length > 0,       "AnnouncementLog: empty category");

        uint256 id = _announcements.length;
        _announcements.push(Announcement({
            contentHash: contentHash,
            group:       group,
            category:    category,
            timestamp:   block.timestamp,
            publisher:   msg.sender
        }));

        emit AnnouncementPublished(id, contentHash, group, category, msg.sender);
    }

    /**
     * @notice Retrieve a single announcement by ID.
     */
    function get(uint256 id) external view returns (Announcement memory) {
        require(id < _announcements.length, "AnnouncementLog: invalid ID");
        return _announcements[id];
    }

    /**
     * @notice Total number of announcements published.
     */
    function count() external view returns (uint256) {
        return _announcements.length;
    }

    /**
     * @notice Verify a content hash against the on-chain record.
     * @return True if the announcement content is unmodified.
     */
    function verify(uint256 id, bytes32 hash) external view returns (bool) {
        require(id < _announcements.length, "AnnouncementLog: invalid ID");
        return _announcements[id].contentHash == hash;
    }

    /**
     * @notice Paginated retrieval to avoid gas limits on large arrays.
     * @param offset  Start index.
     * @param limit   Maximum number of items to return.
     */
    function getPage(uint256 offset, uint256 limit)
        external
        view
        returns (Announcement[] memory page)
    {
        uint256 total = _announcements.length;
        if (offset >= total) return new Announcement[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        page = new Announcement[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = _announcements[i];
        }
    }

    /**
     * @notice Return all announcements. Use only for small datasets / off-chain calls.
     */
    function getAll() external view returns (Announcement[] memory) {
        return _announcements;
    }
}