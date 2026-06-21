// ─────────────────────────────────────────────────────────────────────────────
// CARPOOL EVENT PAYLOADS
// Each event carries exactly what listeners need — no over-fetching.
// ─────────────────────────────────────────────────────────────────────────────

export interface CarpoolCreatedEvent {
  carpoolId: string;
  title: string;
  ownerId: number;
  memberIds: number[]; // includes owner
}

export interface CarpoolUpdatedEvent {
  carpoolId: string;
  title: string;
  updatedById: number;
  memberIds: number[];
  changedFields: string[]; // e.g. ['title', 'notes', 'pickup']
}

export interface CarpoolDeletedEvent {
  carpoolId: string;
  title: string;
  deletedById: number;
  memberIds: number[];
}

export interface CarpoolDriverAssignedEvent {
  carpoolId: string;
  title: string;
  driverId: number;
  assignedById: number;
  memberIds: number[];
}

export interface CarpoolDriverResignedEvent {
  carpoolId: string;
  title: string;
  formerDriverId: number;
  memberIds: number[];
}

export interface CarpoolMemberInvitedEvent {
  carpoolId: string;
  title: string;
  invitedUserId: number;
  invitedByUserId: number;
  message?: string;
}

export interface CarpoolInviteWithdrawnEvent {
  carpoolId: string;
  title: string;
  invitedUserId: number;
  withdrawnByUserId: number;
}

export interface CarpoolInviteAcceptedEvent {
  carpoolId: string;
  title: string;
  userId: number;
  memberIds: number[]; // existing members to notify
  conversationId: string;
}

export interface CarpoolInviteDeclinedEvent {
  carpoolId: string;
  title: string;
  userId: number;
  ownerId: number;
}

export interface CarpoolMemberLeftEvent {
  carpoolId: string;
  title: string;
  userId: number;
  memberIds: number[]; // remaining members
  conversationId: string;
}

export interface CarpoolRoundStartedEvent {
  carpoolId: string;
  roundId: string;
  carpoolTitle: string;
  type: 'PICKUP' | 'DROPOFF';
  driverId: number;
  memberIds: number[];
}

export interface CarpoolRoundCompletedEvent {
  carpoolId: string;
  roundId: string;
  carpoolTitle: string;
  type: 'PICKUP' | 'DROPOFF';
  memberIds: number[];
}

export interface CarpoolRoundReminderEvent {
  carpoolId: string;
  roundId: string;
  carpoolTitle: string;
  scheduledAt: Date;
  minutesBefore: 15 | 30;
  memberIds: number[];
}

export interface CarpoolVehicleLocationUpdatedEvent {
  carpoolId: string;
  roundId: string;
  driverId: number;
  latitude: number;
  longitude: number;
  updateCount: number; // used to decide DB flush
}
