# SolvNet

A decentralized module and network enabling users to delegate idle funds in smart accounts to solvers through a secure staking mechanism. Solvers gain access to enhanced liquidity for facilitating transactions, while users earn returns by leasing their funds to the network.

## Problem

- **Limited Access to Solver Networks:** Only big protocols and market makers can effectively operate solvers due to liquidity constraints. Small players with good algorithms lack sufficient funds to facilitate transactions.
- **Lack of Delegation Options:** Users with idle funds in smart accounts have no way to delegate these funds to solvers, missing opportunities for earning returns.

## Solution

### Module for Smart Accounts
Users can enable a module in their smart accounts to delegate idle funds to the solver network. They configure parameters such as APR, token type, and lease duration.

### Quadratic Staking for Solvers
Solvers join the network by staking an amount, granting access to up to 𝑛^2 liquidity (based on quadratic staking) under an honest-party assumption.

### Fraud-Proof Mechanism
A watchtower monitors transactions. If a solver fails to return funds within the designated period (e.g., 7 days), a fraud-proof mechanism slashes the solver's stake and compensates users.

## Flow

### User Module Activation
1. Users log in to a dashboard to view their smart account balance
2. They enable the module, configuring the APR, token type, and lease amount/duration

### Solver Registration
- Solvers register on the network dashboard and stake an amount to participate

### Transaction Facilitation
1. When a protocol needs funds, the solver requests liquidity from the network
2. The required amount is sourced from multiple users (e.g., x1, x2, ...xn)

### Return or Fraud Proof
Solvers return the borrowed amount within the set period (e.g., 7 days). If not, the fraud-proof mechanism activates, slashing the solver's stake and distributing it among users.
