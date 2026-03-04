import { customAlphabet } from 'nanoid';

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const nanoid = customAlphabet(alphabet, 6);

export function generateRoomCode(): string {
  const part1 = nanoid();
  const part2 = nanoid();
  const part3 = nanoid();
  return `${part1}-${part2}-${part3}`;
}

export function isValidRoomCode(code: string): boolean {
  // Simple validation: should be three parts separated by hyphens
  const parts = code.split('-');
  return (
    parts.length === 3 &&
    parts.every((part) => /^[a-z0-9]{6}$/.test(part))
  );
}
