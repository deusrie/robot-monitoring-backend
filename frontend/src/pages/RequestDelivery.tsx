import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { usersAPI, robotsAPI, deliveriesAPI } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import {
  User, Package, MessageSquare,
  Send, Bot, CheckCircle2, AlertCircle,
  X, UserX, Zap, CalendarClock,
  Loader2, MapPin,
} from "lucide-react";

// ─── Robot status styles ─────────────────────────────────────────
const ROBOT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Online: { bg: "rgba(22,163,74,0.1)", color: "#15803d" },
  "On Delivery": { bg: "#FFD700", color: "#800000" },
  Offline: { bg: "#F3F4F6", color: "#9CA3AF" },
};

// ─── Floor map ────────────────────────────────────────────
const roomsByFloor: Record<string, string[]> = {
  "1st Floor": ["101", "102", "103", "104", "118"],
  "2nd Floor": ["201", "202", "203", "204", "205"],
  "3rd Floor": ["301", "302", "303", "304", "307"],
  "4th Floor": ["401", "402", "403", "404", "410"],
};

// ─── Time slots ────────────────────────────────────────────
const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
];

// ─── Helpers ───────────────────────────────────────────────
function toUserProfile(u: any): UserProfile {
  const name = u.full_name ?? u.name ?? "Unknown";
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return {
    id: String(u.id),
    name,
    room: u.room ?? "No room set",
    building: u.building ?? "PUP Manila",
    initials,
    avatarColor: "#800000",
  };
}

// ─── Component ───────────────────────────────────────────────
export default function RequestDelivery() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── User
  const { data: me } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => fetch("http://localhost:5000/api/auth/me").then(r => r.json()),
  });

  // ── Robots
  const { data: robotsData = [] } = useQuery({
    queryKey: ["robots"],
    queryFn: () => robotsAPI.getAll(),
  });

  const robots = (robotsData as any[]).map(r => ({
    id: String(r.id),
    name: r.name ?? `PUP-BOT ${r.id}`,
    status: r.status ?? "Offline",
  }));

  // ── Recipient
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Form fields
  const [pickupFloor, setPickupFloor] = useState("");
  const [pickupRoom, setPickupRoom] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [timingMode, setTimingMode] = useState<"now" | "schedule">("now");
  const [schedTime, setSchedTime] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient || !itemName.trim()) return;

    setSubmitting(true);

    const onlineRobots = robots.filter(r => r.status === "Online");
    const robot =
      onlineRobots[Math.floor(Math.random() * onlineRobots.length)] ??
      robots[0];

    const sender: UserProfile = me
      ? toUserProfile(me)
      : {
          id: "unknown",
          name: "You",
          room: "—",
          building: "PUP Manila",
          initials: "?",
          avatarColor: "#800000",
        };

    try {
      await deliveriesAPI.createRequest({
        document_name: itemName.trim(),
        sender: sender.name,
        recipient: recipient.name,
        pickup_location: `${pickupFloor} - Room ${pickupRoom}`,
        dropoff_location: recipient.room,
      });

      toast({
        title: "Robot dispatched!",
        description:
          timingMode === "now"
            ? "Your delivery is on its way."
            : `Scheduled for ${schedTime}.`,
      });

      setRecipient(null);
      setRecipientQuery("");
      setItemName("");
      setQty("1");
      setNote("");
      setPickupFloor("");
      setPickupRoom("");

      setTimeout(() => navigate("/history"), 800);
    } catch (err) {
      toast({
        title: "Failed to dispatch",
        description: (err as Error)?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── UI ───────────────────────────────────────────────
  return (
    <AppLayout title="Send Delivery">
      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          placeholder="Item name"
          value={itemName}
          onChange={e => setItemName(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          placeholder="Quantity"
          value={qty}
          onChange={e => setQty(e.target.value)}
          className="border p-2 w-full"
        />

        <textarea
          placeholder="Note"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="border p-2 w-full"
        />

        <button
          disabled={submitting}
          className="bg-maroon text-white px-4 py-2"
        >
          {submitting ? "Sending..." : "Send Delivery"}
        </button>
      </form>
    </AppLayout>
  );
}