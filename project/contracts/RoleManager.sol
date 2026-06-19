// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @notice Manages on-chain roles and group membership.
 *         Groups are stored as bytes32 for gas efficiency and cheap comparison.
 *         Valid groups are registered on-chain — no phantom group assignments.
 */
contract RoleManager is AccessControl {
    bytes32 public constant PROFESSOR_ROLE = keccak256("PROFESSOR");
    bytes32 public constant STUDENT_ROLE   = keccak256("STUDENT");

    /// @notice Special sentinel: announcements targeting this group reach everyone.
    bytes32 public constant GROUP_ALL = keccak256("all");

    /// @notice Set of valid group identifiers registered by the admin.
    mapping(bytes32 => bool) public validGroups;

    /// @notice Maps a wallet address to its group (bytes32 for gas efficiency).
    mapping(address => bytes32) private _groups;

    event RoleAssigned(address indexed user, bytes32 indexed role);
    event GroupAssigned(address indexed user, bytes32 indexed group);
    event GroupRegistered(bytes32 indexed group, string name);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // "all" is always a valid group — it targets every student
        validGroups[GROUP_ALL] = true;
    }

    /**
     * @notice Register a new valid group. Admin-only.
     * @param name  Human-readable group name (e.g. "MF1"). Stored as bytes32 key.
     */
    function registerGroup(string calldata name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(name).length > 0, "RoleManager: empty group name");
        bytes32 key = keccak256(bytes(name));
        require(!validGroups[key], "RoleManager: group already exists");
        validGroups[key] = true;
        emit GroupRegistered(key, name);
    }

    /**
     * @notice Assign a role to a user. Admin-only.
     */
    function assignRole(address user, bytes32 role) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(user != address(0), "RoleManager: zero address");
        _grantRole(role, user);
        emit RoleAssigned(user, role);
    }

    /**
     * @notice Assign a validated group to a user. Admin-only.
     * @param group  bytes32 key of a previously registered group.
     */
    function assignGroup(address user, bytes32 group) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(user != address(0),    "RoleManager: zero address");
        require(validGroups[group],    "RoleManager: group not registered");
        _groups[user] = group;
        emit GroupAssigned(user, group);
    }

    /**
     * @notice Returns the bytes32 group key of a user.
     */
    function getGroup(address user) external view returns (bytes32) {
        return _groups[user];
    }

    /**
     * @notice Convenience helper: check if a group key is valid.
     */
    function isValidGroup(bytes32 group) external view returns (bool) {
        return validGroups[group];
    }
}