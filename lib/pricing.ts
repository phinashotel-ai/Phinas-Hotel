export type RoomPricingSource = {
  price_per_night: number | string;
  room_type?: string | null;
  capacity?: number | null;
};

const ROOM_TYPE_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  deluxe: 1.1,
  family: 1.2,
  suite: 1.3,
};

export function getRoomSizeMultiplier(roomType?: string | null, capacity?: number | null) {
  const typeMultiplier = ROOM_TYPE_MULTIPLIERS[(roomType || "").toLowerCase()] ?? 1;
  const roomCapacity = Math.max(1, Number(capacity || 1));
  const capacityMultiplier = 1 + Math.max(roomCapacity - 2, 0) * 0.05;
  return typeMultiplier * capacityMultiplier;
}

export function getRoomGuestMultiplier(guests = 1) {
  const guestCount = Math.max(1, Number(guests || 1));
  return 1 + Math.max(guestCount - 1, 0) * 0.08;
}

export function getRoomNightlyRate(room: RoomPricingSource, guests = 1) {
  const baseRate = Number(room.price_per_night || 0);
  const rate = baseRate * getRoomSizeMultiplier(room.room_type, room.capacity) * getRoomGuestMultiplier(guests);
  return Math.round(rate * 100) / 100;
}
