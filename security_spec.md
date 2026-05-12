# Security Specification for IT Operations Intelligence Agent

## Data Invariants
1. A Purchase Record must have a valid item name, date, and price.
2. An IT Asset shadow entry must be created synchronously with its Purchase Record.
3. Assets linked to Purchase Records via `purchaseRecordId` must maintain consistency in Brand and Model.
4. Only verified users can write inventory or purchase data.
5. Management Approval (checked via `/admins/{uid}`) is required for sensitive fields like Passwords or CCTV logs (if added later).

## The "Dirty Dozen" Payloads (Attacks)
1. **Identity Spoofing**: Attempting to create an asset with `assignedTo` set to someone else's UID without being an admin.
2. **Resource Poisoning**: Sending a 2MB string in the `specs` field.
3. **Invalid ID**: Injecting a script tag or 2KB string as a document ID.
4. **State Shortcutting**: Updating an asset status to "Retired" bypassing "In Stock" requirements.
5. **PII Blanket**: Non-owners reading full user profiles (if metadata added).
6. **Price Tampering**: Updating `purchasePrice` of an existing asset after creation.
7. **Orphaned Writes**: Creating an asset without a valid reference to its Purchase Record (if $ref used).
8. **Shadow Field**: Adding `isVerified: true` to a user profile to gain admin rights.
9. **Timestamp Spoofing**: Setting `purchaseDate` in the future or past via client clock.
10. **Query Scraping**: Listing all assets without being authenticated or without a strict query.
11. **Action Gap**: Changing `assignedTo` without updating `status` correctly.
12. **Admin Escalation**: Writing to `/admins/` collection as a normal user.

## Test Runner (Logic Overview)
The `firestore.rules` will verify:
- `isSignedIn()` and `email_verified == true`.
- `isValidITAsset()` and `isValidPurchaseRecord()`.
- `affectedKeys().hasOnly()` for state updates.
- `isAdmin()` for management-level tasks.
