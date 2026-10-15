// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProofRegistry
 * @notice Registro mínimo de huellas SHA-256 de evidencias de Aletheia.
 *         Solo guarda la huella (bytes32), el emisor y el momento del
 *         registro. NUNCA archivos ni datos personales en la cadena.
 * @dev    Despliegue recomendado en Polygon Amoy (testnet, chainId 80002).
 *         Guía paso a paso: docs/REMIX.md
 */
contract ProofRegistry {
    struct Proof {
        address owner;
        uint256 timestamp;
        bool exists;
    }

    /// hash => proof
    mapping(bytes32 => Proof) private proofs;

    event EvidenceRegistered(
        bytes32 indexed hash,
        address indexed owner,
        uint256 timestamp
    );

    error AlreadyRegistered(bytes32 hash);

    /// @notice Registra la huella `hash` (SHA-256 de la evidencia, como bytes32).
    function register(bytes32 hash) external {
        if (proofs[hash].exists) revert AlreadyRegistered(hash);
        proofs[hash] = Proof({
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        emit EvidenceRegistered(hash, msg.sender, block.timestamp);
    }

    /// @notice Consulta si una huella está registrada.
    function isRegistered(bytes32 hash)
        external
        view
        returns (bool registered, address owner, uint256 timestamp)
    {
        Proof storage p = proofs[hash];
        return (p.exists, p.owner, p.timestamp);
    }
}
