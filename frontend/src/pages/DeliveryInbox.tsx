import { useState, useCallback } from "react";
import {
  CheckCircle,
  Bot,
  FileText,
  Package,
  Inbox,
} from "lucide-react";
import { useDelivery } from "@/lib/deliveryStore";
import type { Delivery } from "@/lib/types";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "@/components/ui/feedback/sonner";
import { useQuery } from "@tanstack/react-query";
import { deliveriesAPI } from "@/lib/api";


// ─── Simulated recipient ──────────────────────────────────────────────────────
const RECIPIENT_ID = "usr-002";
const RECIPIENT_NAME = "Maria Santos";
const RECIPIENT_ROOM = "Room 301, Main Building";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimestamp(ts: string) {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
}

// ─── Confirm Receipt Dialog ───────────────────────────────────────────────────
function ConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-100">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "#FFF5F5" }}
          >
            <CheckCircle className="h-5 w-5" style={{ color: "#800000" }} />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A] text-sm leading-tight">
              Confirm Receipt
            </h3>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">
              By confirming, you acknowledge that you have physically received the
              package and reviewed the delivery documents from the robot.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: "#800000", color: "#FFD700" }}
          >
            Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Arrived Card ─────────────────────────────────────────────────────────────
function ArrivedCard({
  delivery,
  onConfirm,
}: {
  delivery: any;
  onConfirm: (id: string) => void;
}) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      {showDialog && (
        <ConfirmDialog
          onCancel={() => setShowDialog(false)}
          onConfirm={() => {
            setShowDialog(false);
            onConfirm(delivery.id);
          }}
        />
      )}

      <div className="bg-white rounded-x1 shadow-sm overflow-hidden">
        {/* Top row */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-wrap gap-2">
          <span className="font-mono text-sm font-bold" style={{ color: "#800000" }}>
            {delivery.id}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-600 text-white">
              <CheckCircle className="h-3 w-3" />
              Robot Delivered
            </span>
            {delivery.created_at && (
              <span className="text-[11px] text-gray-400">
                Arrived {timeAgo(delivery.created_at)}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* Sender info */}
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-3"
            style={{ background: "#FFF5F5" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#800000", color: "#FFD700" }}
            >
              {delivery.sender.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 leading-none mb-0.5">Sent by</p>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-tight">
                {delivery.sender}
              </p>
              <p className="text-xs text-gray-500">
                {delivery.sender.room}, {delivery.sender.building}
              </p>
            </div>
          </div>

          {/* Package Details */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div
              className="px-3 py-2 flex items-center gap-1.5"
              style={{ background: "#800000" }}
            >
              <Package className="h-3 w-3 text-white/80" />
              <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                Package Details
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-3 py-2 flex justify-between text-xs">
                <span className="text-gray-400">Item</span>
                <span className="font-medium text-[#1A1A1A]">{delivery.document_name}</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-xs">
                <span className="text-gray-400">Qty</span>
                <span className="font-medium text-[#1A1A1A]">1</span>
              </div>
              <div className="px-3 py-2 flex justify-between text-xs">
                <span className="text-gray-400">Weight</span>
                <span className="font-medium text-[#1A1A1A]">N/A</span>
              </div>
              {delivery.senderNote && (
                <div className="px-3 py-2 text-xs">
                  <span className="text-gray-400 block mb-0.5">Sender note</span>
                  <span className="text-gray-600 italic">"{delivery.senderNote}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery documents notice */}
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-3"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <FileText className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-0.5">Check your delivery documents</p>
              <p>
                Please check the physical delivery documents received with this
                package before confirming.
              </p>
            </div>
          </div>

          {/* Confirm Receipt button */}
          <button
            onClick={() => setShowDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: "#800000", color: "#FFD700" }}
          >
            <CheckCircle className="h-5 w-5" />
            I have received this package
          </button>
        </div>
      </div>
    </>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ delivery }: { delivery: any }) {
  const isCompleted = delivery.status === "completed";
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-xs font-semibold" style={{ color: "#800000" }}>
            {delivery.id}
          </span>
        </div>
        <p className="text-sm font-medium text-[#1A1A1A] truncate">
          {delivery.document_name}
          <span className="text-gray-400 font-normal text-xs">
            {" "}from {delivery.sender}
          </span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={
            isCompleted
              ? { background: "#dcfce7", color: "#166534" }
              : { background: "#f3f4f6", color: "#6b7280" }
          }
        >
          {isCompleted ? "Completed" : "Cancelled"}
        </span>
        <span className="text-[10px] text-gray-400">
          {formatTimestamp(delivery.completedAt ?? delivery.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────
function NoArrivedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "#FFF5F5" }}
      >
        <Bot className="h-8 w-8" style={{ color: "#800000", opacity: 0.4 }} />
      </div>
      <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">
        No packages awaiting confirmation
      </h3>
      <p className="text-sm text-gray-400">You're all caught up!</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DeliveryInbox() {
  const { data: inboxDeliveries = [], refetch } = useQuery({
  queryKey: ["deliveryInbox"],
  queryFn: () => deliveriesAPI.getInbox(),
});

const arrivedDeliveries = inboxDeliveries.filter(
  (d: any) => !d.received_confirmed && d.status !== "received"
);

const historyDeliveries = inboxDeliveries
  .filter((d: any) => d.status === "received" || d.received_confirmed)
  .sort(
    (a: any, b: any) =>
      new Date(b.received_at ?? b.created_at).getTime() -
      new Date(a.received_at ?? a.created_at).getTime()
  );

  const handleConfirm = useCallback(
  async (id: string) => {
    try {
      await deliveriesAPI.confirmReceived(Number(id));
      toast.success("Receipt confirmed! Transaction complete.");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm receipt");
    }
  },
  [refetch]
);

  return (
    <AppLayout title="Delivery Inbox">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-xl font-semibold text-[#1A1A1A] leading-tight"
            style={{ fontFamily: "var(--font-display, 'DM Serif Display', serif)" }}
          >
            Delivery Inbox
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Confirm receipt of packages delivered to your room.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Logged in as{" "}
            <span className="font-medium" style={{ color: "#800000" }}>
              {RECIPIENT_NAME}
            </span>{" "}
            — {RECIPIENT_ROOM}
          </p>
        </div>

        {arrivedDeliveries.length > 0 && (
          <span
            className="shrink-0 px-3 py-1 rounded-full text-sm font-semibold"
            style={{ background: "#FFD700", color: "#800000" }}
          >
            {arrivedDeliveries.length} awaiting confirmation
          </span>
        )}
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Section 1 — Awaiting Your Confirmation */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Awaiting Your Confirmation
          </h3>

          {arrivedDeliveries.length === 0 ? (
            <NoArrivedEmpty />
          ) : (
            <>
              {/* Context banner */}
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-4"
                style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
              >
                <Bot className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#800000" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#800000" }}>
                  <span className="font-semibold">
                    The robot has already delivered these packages to your room.
                  </span>{" "}
                  Please confirm receipt for each one after checking your delivery documents.
                </p>
              </div>

              <div className="space-y-4">
                {arrivedDeliveries.map((d) => (
                  <ArrivedCard key={d.id} delivery={d} onConfirm={handleConfirm} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Section 2 — Delivery History */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Past Deliveries
          </h3>

          {historyDeliveries.length === 0 ? (
            <p className="text-sm text-gray-400">No past deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {historyDeliveries.map((d) => (
                <HistoryRow key={d.id} delivery={d} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}