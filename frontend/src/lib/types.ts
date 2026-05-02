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
  id: string            // e.g. "DEL-20251"
  sender: UserProfile   // User1
  recipient: UserProfile// User2
  item: DeliveryItem
  senderNote: string
  priority: DeliveryPriority
  fee: number           // PHP
  status: DeliveryStatus
  robotId: string       // e.g. "RBT-001"
  robotName: string     // e.g. "PUP-BOT Unit 1"
  createdAt: string     // when User1 submitted — robot dispatches at this moment
  pickedUpAt?: string
  arrivedAt?: string    // when robot reached User2's room
  completedAt?: string  // when User2 tapped "Confirm Receipt"
  timeline: TimelineEvent[]
  estimatedArrival: string  // e.g. "8 mins"
  distance: string          // e.g. "320 m"
}