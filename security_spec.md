# Security Specification - SIMARS

## Data Invariants
1. **Identity Integrity**: No user can modify their own `level` (RBAC role). Only `super_admin` can manage users.
2. **Author Lock**: The `pengolah` field in all mail/SK records must strictly match the UID of the user who created it.
3. **Relational Sync**: A `Disposisi` record must belong to an existing `SuratMasuk`.
4. **Immutability**: `createdAt` and `id` fields must never change after creation.
5. **Role Escalation Protection**: Only `super_admin` or `admin` can create/update mail records. Only `super_admin` or `pimpinan` or `admin` can manage dispositions.
6. **Path Integrity**: Document IDs must be valid strings and not excessively large.

## The "Dirty Dozen" Payloads (X-Ray Attacks)

1. **RBAC Escalation**: Pegawai user attempts to update their own profile set `level: 'super_admin'`.
2. **Shadow Field Injection**: Admin user attempts to create a `SuratMasuk` with an undocumented `isVerifiedByBoss: true` field.
3. **Identity Spoofing**: Admin user A attempts to create a `SuratMasuk` with `pengolah: 'userB'`.
4. **Orphaned Disposisi**: Pimpinan user attempts to create a `Disposisi` for a `suratMasukId` that doesn't exist.
5. **State Skipping**: Pegawai user attempts to mark a `SuratMasuk` as `sudahDisposisi: true` without being a pimpinan/admin.
6. **Immutable Tampering**: Admin user attempts to update the `createdAt` of a `SuratKeluar` to an older date.
7. **Cross-Tenant Leak**: User A attempts to `get` a `SuratMasuk` document without being signed in (blanket read test).
8. **Resource Exhaustion**: Attacker attempts to create a `Klasifikasi` with an ID that is 1MB in size.
9. **PII Blanket Scraping**: Pegawai user attempts to `list` all users' private info (NIP, etc.) if not allowed.
10. **Terminal State Lock-break**: Admin user attempts to modify a `SuratMasuk` after it has been finalized (if applicable).
11. **ID Poisoning**: User attempts to use `../` or special characters in a document ID via client SDK.
12. **Client-Side Claim Trust**: User sends a request pretending to have `request.auth.token.admin == true` (rules must ignore custom tokens since we don't use them).

## The Test Runner (Plan)
We will use `firebase-server` or the emulator for testing if available, or just follow a logical trace. Since I can't run the emulator directly here, I will generate `firestore.rules.test.ts` as a specification for the user.

[Test file content will be generated in a separate step]
