# FairSplit

A static Splitwise-style demo app for shared expenses, group balances, and simplified debt settlement.

## Features
- add members
- add expenses with payer + selected participants
- live balances
- toggle simplified debts on/off
- static deployable via GitHub Pages

## Simplified Debts
When enabled, the app computes each member's final net balance, then greedily matches debtors to creditors to reduce the number of settlement payments while preserving the same total owed/received.
