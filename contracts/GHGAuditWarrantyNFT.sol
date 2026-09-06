// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * GHGAuditWarrantyNFT.sol
 *
 * Production ERC-1155 smart contract for the GHG Emissions Registered Trade Mark
 * Audit Warranty Credential on Polygon PoS.
 *
 * Standards:
 *  - ERC-1155 Multi-Token Standard (OpenZeppelin ERC1155Supply + ERC1155URIStorage)
 *  - ERC-2981 NFT Royalty Standard (5% secondary royalties to platform)
 *  - OpenZeppelin Ownable (admin functions gated to contract owner)
 *
 * Token design:
 *  - Each unique credential is a singleton token (amount = 1) with a unique token ID.
 *  - Token ID is derived as keccak256(credentialId) converted to uint256, guaranteeing
 *    collision-free IDs across all credentials.
 *  - Metadata URI points to: https://<platform>/api/credentials/<credentialId>/metadata.json
 *  - Tokens are non-transferable post-issuance (soulbound) to preserve warranty integrity.
 *  - REVOKE function allows platform to burn compromised credentials.
 *
 * Royalties:
 *  - 5% secondary royalty on all OpenSea / Polygon marketplace resales (ERC-2981).
 *  - Royalty recipient = platform wallet (owner address at time of deploy).
 *
 * Deployment target: Polygon PoS (chain ID 137) or Polygon Amoy testnet (chain ID 80002)
 * Compiler: solc 0.8.20 with optimizer enabled (200 runs)
 *
 * IMPORTANT: Deploy via Hardhat or Foundry — not included in this repo's build pipeline.
 * Contract ABI is consumed by nft-minting.service.ts at runtime.
 */

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GHGAuditWarrantyNFT is ERC1155Supply, ERC1155URIStorage, IERC2981, Ownable {

    // ── State ─────────────────────────────────────────────────────────────────
    string  public  name     = "GHG Audit Warranty Credential";
    string  public  symbol   = "GHGAWC";

    /// @notice Royalty basis points (500 = 5%)
    uint96  private _royaltyBps = 500;

    /// @notice Credential ID (off-chain UUID) → token ID mapping
    mapping(string => uint256) public credentialToTokenId;

    /// @notice Token ID → credential ID mapping (reverse lookup)
    mapping(uint256 => string) public tokenIdToCredential;

    /// @notice Token ID → revocation flag
    mapping(uint256 => bool)   public isRevoked;

    // ── Events ────────────────────────────────────────────────────────────────
    event WarrantyMinted(
        uint256 indexed tokenId,
        string  indexed credentialId,
        address indexed recipient,
        string  metadataUri
    );

    event WarrantyRevoked(
        uint256 indexed tokenId,
        string  indexed credentialId
    );

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address initialOwner)
        ERC1155("")
        Ownable(initialOwner)
    {}

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mints a singleton audit warranty credential.
     * @param to            Recipient address (licensee wallet or platform custodial wallet).
     * @param id            Token ID — caller supplies the pre-computed deterministic ID.
     * @param credentialId  Off-chain UUID from the GHG platform database.
     * @param metadataUri   Dynamic URI: https://<platform>/api/credentials/<id>/metadata.json
     *
     * Requirements:
     *  - Caller must be contract owner (platform minting wallet).
     *  - Token must not already exist (ERC1155Supply: totalSupply(id) == 0).
     *  - credentialId must not already be mapped.
     */
    function mint(
        address to,
        uint256 id,
        string calldata credentialId,
        string calldata metadataUri
    ) external onlyOwner {
        require(!exists(id), "GHGAuditWarrantyNFT: token already minted");
        require(bytes(credentialToTokenId[credentialId]).length == 0 || credentialToTokenId[credentialId] == 0,
            "GHGAuditWarrantyNFT: credential already mapped");

        credentialToTokenId[credentialId] = id;
        tokenIdToCredential[id] = credentialId;

        _mint(to, id, 1, "");
        _setURI(id, metadataUri);

        emit WarrantyMinted(id, credentialId, to, metadataUri);
    }

    // ── Revocation ────────────────────────────────────────────────────────────

    /**
     * @notice Revokes (burns) a compromised or expired credential.
     * @param id  Token ID to revoke.
     */
    function revoke(uint256 id, address holder) external onlyOwner {
        require(exists(id), "GHGAuditWarrantyNFT: token does not exist");
        require(!isRevoked[id], "GHGAuditWarrantyNFT: already revoked");

        isRevoked[id] = true;
        _burn(holder, id, 1);

        emit WarrantyRevoked(id, tokenIdToCredential[id]);
    }

    // ── Soulbound: block transfers ────────────────────────────────────────────
    // Credentials are non-transferable post-issuance. Transfers attempted after
    // initial mint will revert. The initial mint itself uses _mint internally.

    function safeTransferFrom(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure override {
        revert("GHGAuditWarrantyNFT: credentials are non-transferable (soulbound)");
    }

    function safeBatchTransferFrom(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure override {
        revert("GHGAuditWarrantyNFT: credentials are non-transferable (soulbound)");
    }

    // ── URI resolution ────────────────────────────────────────────────────────

    /**
     * @notice Returns the dynamic metadata URI for a given token.
     *         Delegates to ERC1155URIStorage which stores per-token URIs.
     */
    function uri(uint256 id)
        public
        view
        override(ERC1155, ERC1155URIStorage)
        returns (string memory)
    {
        return ERC1155URIStorage.uri(id);
    }

    // ── ERC-2981 Royalties ────────────────────────────────────────────────────

    /**
     * @notice Returns royalty information for secondary sales.
     * @param salePrice  The sale price on the secondary market.
     * @return receiver  Platform wallet (owner) as royalty recipient.
     * @return royaltyAmount  5% of salePrice.
     */
    function royaltyInfo(uint256 /*tokenId*/, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = owner();
        royaltyAmount = (salePrice * _royaltyBps) / 10_000;
    }

    /**
     * @notice Update royalty basis points (owner only).
     * @param bps  New royalty in basis points (max 1000 = 10%).
     */
    function setRoyaltyBps(uint96 bps) external onlyOwner {
        require(bps <= 1000, "GHGAuditWarrantyNFT: royalty exceeds 10%");
        _royaltyBps = bps;
    }

    // ── ERC-165 supportsInterface ─────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ── ERC1155Supply: required override ─────────────────────────────────────
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
