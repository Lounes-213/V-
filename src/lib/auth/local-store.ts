import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

/**
 * Accounts for deployments with no identity provider configured.
 *
 * This is a real credential store, not a stub: passwords are kept as scrypt
 * hashes with a per-account salt, comparison is constant-time, and the file is
 * written atomically. It exists so a self-hosted studio works with no external
 * service; swap in Supabase (or any OIDC provider) for a hosted deployment and
 * this file is simply never touched.
 *
 * Server-only: import it from route handlers, never from a client component.
 */

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export type StoredAccount = {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
};

export type PublicAccount = Pick<StoredAccount, "id" | "name" | "email" | "createdAt">;

const DATA_DIR = join(process.cwd(), ".data");
const ACCOUNTS_FILE = join(DATA_DIR, "accounts.json");

export function accountStorePath(): string {
  return ACCOUNTS_FILE;
}

async function readAccounts(): Promise<StoredAccount[]> {
  try {
    const raw = await readFile(ACCOUNTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    // No file yet, or unreadable: an empty store is the correct starting state.
    return [];
  }
}

async function writeAccounts(accounts: StoredAccount[]): Promise<void> {
  await mkdir(dirname(ACCOUNTS_FILE), { recursive: true });
  const temporary = `${ACCOUNTS_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(accounts, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, ACCOUNTS_FILE);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return derived.toString("hex");
}

export function toPublicAccount(account: StoredAccount): PublicAccount {
  return { id: account.id, name: account.name, email: account.email, createdAt: account.createdAt };
}

export async function findAccount(email: string): Promise<StoredAccount | undefined> {
  const normalised = email.trim().toLowerCase();
  const accounts = await readAccounts();
  return accounts.find((account) => account.email === normalised);
}

export async function listAccounts(): Promise<PublicAccount[]> {
  return (await readAccounts()).map(toPublicAccount);
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ account?: StoredAccount; error?: "email_taken" }> {
  const email = input.email.trim().toLowerCase();
  const accounts = await readAccounts();
  if (accounts.some((account) => account.email === email)) return { error: "email_taken" };

  const salt = randomBytes(16).toString("hex");
  const account: StoredAccount = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    salt,
    hash: await hashPassword(input.password, salt),
    createdAt: Date.now(),
  };
  accounts.push(account);
  await writeAccounts(accounts);
  return { account };
}

export async function verifyCredentials(email: string, password: string): Promise<StoredAccount | undefined> {
  const account = await findAccount(email);
  if (!account) return undefined;
  const candidate = Buffer.from(await hashPassword(password, account.salt), "hex");
  const expected = Buffer.from(account.hash, "hex");
  if (candidate.length !== expected.length) return undefined;
  return timingSafeEqual(candidate, expected) ? account : undefined;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const accounts = await readAccounts();
  const remaining = accounts.filter((account) => account.id !== id);
  if (remaining.length === accounts.length) return false;
  await writeAccounts(remaining);
  return true;
}
