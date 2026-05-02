// ---------------------------------------------------------------------------
// Delivery status — robot is dispatched IMMEDIATELY when User1 submits.
// There is NO pending_approval step. User2's only action is confirming
// receipt after the robot has physically arrived.
// ---------------------------------------------------------------------------

export type DeliveryStatus =
  | 'robot_assigned'  // robot immediately dispatched after User1 submits (starting status)
  | 'in_transit'      // robot picked up package, heading to User2
  | 'arrived'         // robot physically at User2's room — awaiting receipt confirmation
  | 'completed'       // User2 confirmed receipt in the app
  | 'cancelled'       // cancelled by User1 before robot picks up

export type DeliveryPriority = 'standard' | 'express'

export interface UserProfile {
  id: string
  name: string
  room: string
  building: string
  initials: string      // e.g. "JD"
  avatarColor: string   // hex, used as avatar bg
}

export interface DeliveryItem {
  name: string
  qty: number
  weight: number        // kg
}

export interface TimelineEvent {
  status: DeliveryStatus
  label: string
  timestamp: string     // ISO string
}

export interface Delivery {
  id: number;
  document_name: string;
  sender: string;
  recipient: string;
  recipient_user_id: number;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  robot_id?: number | null;
  requested_by_user_id?: number;
  received_by_user_id?: number | null;
  received_confirmed: boolean;
  received_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}