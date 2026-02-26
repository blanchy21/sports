# Prediction Bites - How to Use

Prediction Bites let you stake MEDALS tokens on match outcomes. Create your own predictions or back outcomes on other users' predictions. Winners split the pool based on pari-mutuel odds.

---

## Creating a Prediction

1. Go to **Sportsbites** from the main navigation
2. In the composer at the top, click the **"Prediction"** tab (next to "Take")
3. Fill in the prediction form:
   - **Prediction title** - Your question, e.g. "Who will win Arsenal vs Chelsea?"
   - **Outcomes** - Add 2-4 possible results (e.g. "Arsenal Win", "Chelsea Win", "Draw"). Each outcome can be up to 50 characters.
   - **Sport category** - Select the sport (optional but helps with filtering)
   - **Locks at** - The date and time when staking closes. Must be at least 15 minutes in the future and at most 30 days out. Set this to kick-off time or just before the match starts.
   - **Your initial stake** - Pick which outcome you're backing and how much MEDALS to wager. Minimum creator stake is 25 MEDALS.
4. Click **"Create Prediction"**
5. Your Hive wallet (Keychain or HiveSigner) will prompt you to sign the MEDALS transfer to the escrow account. Approve the transaction.

Your prediction now appears in the Sportsbites feed with an amber accent border.

> **Note:** Only Hive wallet users can create predictions. Google OAuth users can view predictions but cannot create or stake.

---

## Placing a Stake

1. Find an **Open** prediction in the Sportsbites feed (look for the amber-bordered cards)
2. Click on any **outcome bar** or hit the **"Place Stake"** button
3. In the stake modal:
   - See which outcome you're backing and the current odds
   - Choose a quick amount (10, 25, 50, or 100 MEDALS) or enter a custom amount
   - Check the estimated payout: "If [outcome] wins: ~X MEDALS"
   - Your available MEDALS balance is shown
4. Click **"Stake X MEDALS"**
5. Approve the Keychain/HiveSigner transaction (active key required)

Stake limits: minimum 10 MEDALS, maximum 10,000 MEDALS per stake. You can stake once per outcome.

---

## How Odds Work

Prediction Bites use **pari-mutuel** odds. All stakes go into a shared pool. If your outcome wins, you get a share of the pool proportional to your stake vs. the total staked on the winning outcome.

**Example:**
- Total pool: 1,000 MEDALS
- Outcome A pool: 400 MEDALS (your stake: 100 MEDALS)
- Outcome B pool: 600 MEDALS
- Platform fee: 10% (100 MEDALS)

If Outcome A wins:
- Net pool after fee: 900 MEDALS
- Your share: (100 / 400) x 900 = **225 MEDALS** (2.25x return)

The odds displayed on each outcome bar update in real-time as stakes come in.

---

## Prediction Lifecycle

| Status | What It Means |
|--------|---------------|
| **Open** | Staking is active. A countdown timer shows time remaining until lock. |
| **Locked** | Staking is closed. The match is in progress. Waiting for the result. |
| **Settling** | The result is in. Payouts are being processed on-chain. |
| **Settled** | Done. Winners have received their MEDALS. The winning outcome is shown in green. |
| **Void / Refunded** | The prediction was cancelled. All stakes are refunded to participants. |

---

## How Settlement Works

### Automatic Settlement
If a prediction is linked to an ESPN match (created with a match reference), it settles **automatically** when the match finishes. A background process checks every 5 minutes for finished matches, matches the final score to the outcome labels, and triggers payouts.

This works best when outcome labels clearly reference team names or standard results:
- Team names: "Arsenal", "Chelsea", "Chiefs"
- Win patterns: "Arsenal Win", "Arsenal to Win"
- Generic: "Home Win", "Away Win", "Draw"

### Manual Settlement
Predictions without a match link, or those with custom outcomes the system can't resolve, need manual settlement. The prediction creator or an admin can:

1. Open the prediction card
2. A **settlement panel** appears at the bottom (only visible to the creator and admins)
3. Click **"Select Winner"** next to the correct outcome
4. Confirm the settlement

Payouts are broadcast on-chain from the escrow account.

### Voiding a Prediction
If a match is cancelled or something goes wrong, the creator or an admin can **void** the prediction:

1. Open the settlement panel
2. Click **"Void Prediction"**
3. Enter a reason (e.g. "Match postponed")
4. All stakes are refunded to participants

---

## Fees

A **10% platform fee** is taken from the winning pool before payouts:
- 50% of the fee is **burned** (permanently removed from circulation)
- 50% goes to the **community reward pool**

---

## Viewing Predictions

In the Sportsbites feed, use the filter tabs:
- **All** - Shows both regular takes and predictions
- **Takes** - Only regular sportsbites
- **Predictions** - Only prediction cards

Each prediction card shows:
- Creator info, sport tag, and status badge
- Outcome bars with stake distribution, percentages, and backer counts
- Total pool size
- Your stake highlighted (if you participated)
- Countdown timer (when open) or result (when settled)

---

## Tips for Good Predictions

- **Set clear outcomes** - Use team names or unambiguous labels. "Arsenal Win" is better than "I think they'll win."
- **Time your lock** - Set it to kick-off time so people can stake right up until the match starts.
- **Tag the sport** - Helps other users find your prediction via filters.
- **Link to a match** - If creating from a match context, the prediction can auto-settle when the match finishes.
- **Stake meaningfully** - Your initial stake as creator signals confidence and attracts other stakers.
