// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleManager.sol";

/**
 * @title DocumentRegistry
 * @notice Stores SHA-256 hashes of uploaded documents on-chain.
 *         Prevents duplicate registrations of the same file.
 *         Groups are bytes32 for gas efficiency.
 *         Anyone can verify a document's integrity by recomputing its hash
 *         and comparing against the on-chain record — hash pointer concept (M2).
 */
contract DocumentRegistry {

    struct Document {
        bytes32 hash;       // SHA-256 of the file content
        bytes32 group;      // Target group (bytes32 key)
        string  name;       // Original file name
        uint256 timestamp;
        address registrant; // Professor wallet
    }

    RoleManager public immutable roleManager;

    mapping(uint256 => Document) private _docs;
    uint256 public count;

    /// @notice Prevents the same file being registered twice
    mapping(bytes32 => bool) public hashExists;

    event DocumentRegistered(
        uint256 indexed id,
        bytes32 indexed hash,
        bytes32 indexed group,
        string          name,
        address         registrant
    );

    modifier onlyProfessor() {
        require(
            roleManager.hasRole(roleManager.PROFESSOR_ROLE(), msg.sender),
            "DocumentRegistry: not a professor"
        );
        _;
    }

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "DocumentRegistry: zero address");
        roleManager = RoleManager(roleManagerAddress);
    }

    /**
     * @notice Register a document's SHA-256 hash on-chain. Professor-only.
     *         Reverts if the same hash has already been registered.
     * @param hash  SHA-256 hash computed off-chain by the Node.js backend.
     * @param group bytes32 key of the target group.
     * @param name  Original file name for off-chain reference.
     */
    function register(
        bytes32        hash,
        bytes32        group,
        string calldata name
    ) external onlyProfessor {
        require(hash != bytes32(0),               "DocumentRegistry: empty hash");
        require(roleManager.isValidGroup(group),  "DocumentRegistry: invalid group");
        require(bytes(name).length > 0,           "DocumentRegistry: empty name");
        require(!hashExists[hash],                "DocumentRegistry: file already registered");

        hashExists[hash] = true;

        uint256 id = count;
        _docs[id] = Document({
            hash:       hash,
            group:      group,
            name:       name,
            timestamp:  block.timestamp,
            registrant: msg.sender
        });
        count++;

        emit DocumentRegistered(id, hash, group, name, msg.sender);
    }

    /**
     * @notice Retrieve a document record by ID.
     */
    function get(uint256 id) external view returns (Document memory) {
        require(id < count, "DocumentRegistry: invalid ID");
        return _docs[id];
    }

    /**
     * @notice Verify a document's integrity against the on-chain record.
     * @return True if the file content matches the registered hash.
     */
    function verify(uint256 id, bytes32 hash) external view returns (bool) {
        require(id < count, "DocumentRegistry: invalid ID");
        return _docs[id].hash == hash;
    }

    /**
     * @notice Alias for verify() — matches the spec's verifyDocument() naming.
     */
    function verifyDocument(uint256 id, bytes32 hash) external view returns (bool) {
        return this.verify(id, hash);
    }
}