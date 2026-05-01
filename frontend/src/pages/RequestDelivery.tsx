import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useDelivery } from "@/lib/deliveryStore";
import { authAPI, usersAPI, robotsAPI } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import {
  User, Package, MessageSquare,
  Send, Bot, CheckCircle2, AlertCircle,
  X, UserX, Info, Zap, CalendarClock,
  Loader2, MapPin,
} from "lucide-react";

// ─── Robot status styles (preserved) ─────────────────────────────────────────
const ROBOT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Online:        { bg: "rgba(22,163,74,0.1)", color: "#15803d" },
  "On Delivery": { bg: "#FFD700",             color: "#800000" },
  Offline:       { bg: "#F3F4F6",             color: "#9CA3AF" },
};

// ─── Floor → room map (preserved) ────────────────────────────────────────────
const roomsByFloor: Record<string, string[]> = {
  "1st Floor": ["101", "102", "103", "104", "118"],
  "2nd Floor": ["201", "202", "203", "204", "205"],
  "3rd Floor": ["301", "302", "303", "304", "307"],
  "4th Floor": ["401", "402", "403", "404", "410"],
};

// ─── Preset time slots (preserved — only used in schedule mode) ───────────────
const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM",  "3:00 PM",  "4:00 PM", "5:00 PM",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function toUserProfile(u: any): UserProfile {
  const name: string = u.full_name ?? u.name ?? "Unknown";
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  const palette = ["#0891B2","#059669","#7C3AED","#D97706","#BE185D","#0F766E","#1F2937","#0284C7"];
  return {
    id:          String(u.id),
    name,
    room:        u.room        ?? "No room set",
    building:    u.building    ?? "PUP Manila",
    initials,
    avatarColor: palette[u.id % palette.length],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AvatarCircle({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </p>
  );
}

function FieldWrapper({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11.5px] font-semibold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full px-3 py-2.5 text-sm bg-gray-50 border rounded-lg outline-none placeholder:text-gray-400 text-[#1A1A1A] transition-all";

const inputFocus = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#800000";
    e.target.style.boxShadow = "0 0 0 3px rgba(128,0,0,0.08)";
    e.target.style.background = "#fff";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
    e.target.style.background = "#F9FAFB";
  },
};

function SelectInput({ options, value, onChange, placeholder, error, disabled }: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder: string; error?: boolean; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${inputBase} appearance-none disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ borderColor: error ? "#fca5a5" : "#E5E7EB" }}
      {...inputFocus}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="text-[11.5px] text-gray-400 font-medium shrink-0">{label}</p>
      <div className="text-right">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RequestDelivery() {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { createDelivery } = useDelivery();

  // ── Fetch current user ────────────────────────────────────────────────────
  const { data: me, isLoading: meLoading, error: meError } = useQuery({
    queryKey: ["currentUser"],
    queryFn:  () => authAPI.getCurrentUser(),
  });

  // Fetch real robots ────────────────────────────────────────────────────────
  const { data: robotsData = [], isLoading: robotsLoading } = useQuery({
    queryKey: ["robots"],
    queryFn:  () => robotsAPI.getAll(),
  });
  const robots = (robotsData as any[]).map((r) => ({
    id:     String(r.id),
    name:   r.name   ?? `PUP-BOT ${r.id}`,
    status: r.status ?? "Offline",
  }));

  // ── Recipient search ──────────────────────────────────────────────────────
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient,      setRecipient]      = useState<UserProfile | null>(null);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [], isFetching: searching } = useQuery<any[]>({
    queryKey: ["userSearch", recipientQuery],
    queryFn:  () => usersAPI.search(recipientQuery),
    enabled:  recipientQuery.trim().length > 0 && !recipient,
    placeholderData: [],
  });

  // ── Pickup floor / room ───────────────────────────────────────────────────
  const [pickupFloor, setPickupFloor] = useState("");
  const [pickupRoom,  setPickupRoom]  = useState("");

  // ── Package fields ────────────────────────────────────────────────────────
  const [itemName, setItemName] = useState("");
  const [qty,      setQty]      = useState("1");
  const [note,     setNote]     = useState("");

  // ── Timing mode: "now" or "schedule" ─────────────────────────────────────
  const [timingMode, setTimingMode] = useState<"now" | "schedule">("now");
  const [schedTime,  setSchedTime]  = useState("");   // preset slot

  // ── Form meta ─────────────────────────────────────────────────────────────
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isFormValid = !!(recipient && itemName.trim());

  // ── Outside click → close dropdown ───────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── set() with inline-error-on-clear (preserved) ─────────────────────────
  const set = (field: string) => (value: string) => {
    if (field === "pickupRoom") setPickupRoom(value);
    else if (field === "itemName") setItemName(value);
    if (!value.trim()) setErrors((e) => ({ ...e, [field]: "This field is required" }));
    else               setErrors((e) => ({ ...e, [field]: undefined as any }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!recipient)       e.recipient = "Please select a recipient.";
    if (!itemName.trim()) e.itemName  = "Item name is required.";
    if (timingMode === "schedule" && !schedTime)
                          e.schedTime = "Please select a time slot.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Recipient helpers ─────────────────────────────────────────────────────
  function handleSelectRecipient(raw: any) {
    const u = toUserProfile(raw);
    setRecipient(u);
    setRecipientQuery(u.name);
    setDropdownOpen(false);
    setErrors((prev) => ({ ...prev, recipient: "" }));
  }

  function handleClearRecipient() {
    setRecipient(null);
    setRecipientQuery("");
    setDropdownOpen(false);
  }

  function handleRecipientInput(v: string) {
    setRecipientQuery(v);
    setRecipient(null);
    setDropdownOpen(true);
    if (errors.recipient) setErrors((prev) => ({ ...prev, recipient: "" }));
  }

  // ── Clear form (preserved) ────────────────────────────────────────────────
  function handleClear() {
    setRecipient(null); setRecipientQuery("");
    setPickupFloor(""); setPickupRoom("");
    setItemName(""); setQty("1"); setNote("");
    setTimingMode("now"); setSchedTime("");
    setErrors({});
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const onlineRobots = robots.filter((r) => r.status === "Online");
    const robot = onlineRobots[Math.floor(Math.random() * onlineRobots.length)] ?? robots[0];

    // Build sender profile from real API data
    const sender: UserProfile = me
      ? toUserProfile({ ...me, avatarColor: "#800000" })
      : { id: "unknown", name: "You", room: "—", building: "PUP Manila", initials: "?", avatarColor: "#800000" };

    // Force avatarColor to maroon for the logged-in sender
    sender.avatarColor = "#800000";

    try {
      createDelivery({
        sender,
        recipient: recipient!,
        item: {
          name:   itemName.trim(),
          qty:    parseInt(qty) || 1,
          weight: 0,          // not collected — university context
        },
        senderNote: note.trim(),
        priority:   "standard",   // single tier — no premium
        fee:        0,            // free service
        robotId:    robot?.id   ?? "RBT-001",
        robotName:  robot?.name ?? "PUP-BOT Unit 1",
      });

      toast({
        title:       "Robot dispatched!",
        description: timingMode === "now"
          ? "Your delivery is on its way."
          : `Scheduled for ${schedTime}.`,
      });

      handleClear();
      setTimeout(() => navigate("/history"), 1000);
    } catch {
      toast({
        title:       "Failed to dispatch",
        description: "Something went wrong. Please try again.",
        variant:     "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (meLoading) {
    return (
      <AppLayout title="Send a Delivery">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
            <p className="text-gray-500 text-sm">Loading form...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (meError || !me) {
    return (
      <AppLayout title="Send a Delivery">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="font-semibold text-gray-700">Unable to load your profile</p>
            <p className="text-sm text-gray-400">{(meError as Error)?.message ?? "Please refresh."}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#800000" }}
            >Refresh</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Build sender profile for display
  const senderProfile = toUserProfile(me);
  senderProfile.avatarColor = "#800000";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Send a Delivery">
      <p className="text-[13px] text-gray-500 mb-6">
        The robot will be dispatched immediately after you submit.
      </p>

      {/* Loading banner (preserved) */}
      {submitting && (
        <div className="mb-5 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-flex" />
          <p className="text-[13px] font-semibold text-blue-700">Dispatching robot...</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-6 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="flex-[3] min-w-0 space-y-4">

            {/* Section 1: Sender — read-only, real data from API */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeading>Sending From</SectionHeading>
              <p className="text-[11px] text-gray-400 mb-2.5">Sending from</p>
              <div className="flex items-center gap-3 bg-[#800000]/5 border border-[#800000]/15 rounded-lg px-4 py-3">
                <AvatarCircle initials={senderProfile.initials} color="#800000" size={38} />
                <div>
                  <p className="text-[13.5px] font-semibold text-[#1A1A1A]">{senderProfile.name}</p>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    {senderProfile.room} · {senderProfile.building}
                  </p>
                </div>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#800000]/10 text-[#800000]">
                  You
                </span>
              </div>
            </div>

            {/* Section 2: Recipient — live search via API */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeading>Recipient</SectionHeading>
              <div className="space-y-3">
                <FieldWrapper label="Search Recipient" required error={errors.recipient}>
                  <div ref={dropdownRef} className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: errors.recipient ? "#ef4444" : "#800000" }}
                    />
                    <input
                      type="text"
                      value={recipientQuery}
                      onChange={(e) => handleRecipientInput(e.target.value)}
                      onFocus={() => !recipient && setDropdownOpen(true)}
                      placeholder="Search by name or room..."
                      className={`${inputBase} pl-9 pr-4`}
                      style={{ borderColor: errors.recipient ? "#fca5a5" : "#E5E7EB" }}
                      autoComplete="off"
                      disabled={!!recipient}
                    />

                    {/* Dropdown */}
                    {dropdownOpen && !recipient && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                        {searching ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin text-[#800000]" />
                            Searching...
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((u: any) => {
                            const p = toUserProfile(u);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectRecipient(u)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#800000]/5 transition-colors text-left"
                              >
                                <AvatarCircle initials={p.initials} color="#9CA3AF" size={30} />
                                <div>
                                  <p className="text-[13px] font-medium text-[#1A1A1A]">{p.name}</p>
                                  <p className="text-[11px] text-gray-400">{p.room} · {p.building}</p>
                                </div>
                              </button>
                            );
                          })
                        ) : recipientQuery.trim().length > 0 ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-gray-400">
                            <UserX className="h-4 w-4 text-gray-300" />
                            No user found
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-[12px] text-gray-400">
                            Start typing to search...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FieldWrapper>

                {/* Selected recipient pill */}
                {recipient && (
                  <div className="flex items-center gap-3 bg-[#800000]/5 border border-[#800000]/15 rounded-lg px-4 py-2.5">
                    <AvatarCircle initials={recipient.initials} color={recipient.avatarColor} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{recipient.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{recipient.room} · {recipient.building}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRecipient}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shrink-0"
                      title="Remove recipient"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Package Details — no weight, no fee */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeading>Package Details</SectionHeading>
              <div className="space-y-3.5">

                <FieldWrapper label="Item / Package Name" required error={errors.itemName}>
                  <div className="relative">
                    <Package
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: errors.itemName ? "#ef4444" : "#800000" }}
                    />
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => {
                        setItemName(e.target.value);
                        setErrors(p => ({
                          ...p,
                          itemName: e.target.value.trim() ? undefined as any : "Item name is required.",
                        }));
                      }}
                      placeholder="e.g. Module 3 Printed Notes, Exam Papers..."
                      className={`${inputBase} pl-9`}
                      style={{ borderColor: errors.itemName ? "#fca5a5" : "#E5E7EB" }}
                      {...inputFocus}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Quantity">
                  <input
                    type="number" min={1} value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={inputBase}
                    style={{ borderColor: "#E5E7EB" }}
                    {...inputFocus}
                  />
                </FieldWrapper>

                <FieldWrapper label="Note to Recipient">
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 pointer-events-none text-[#800000]" />
                    <textarea
                      rows={2} value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a message for the recipient..."
                      className={`${inputBase} pl-9 resize-none`}
                      style={{ borderColor: "#E5E7EB" }}
                      {...inputFocus}
                    />
                  </div>
                </FieldWrapper>
              </div>
            </div>

            {/* Section 4: Delivery Options */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionHeading>Delivery Options</SectionHeading>
              <div className="space-y-4">

                {/* Pickup floor + room (preserved floor-based selection) */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldWrapper label="Pickup Floor" required>
                    <SelectInput
                      value={pickupFloor}
                      onChange={(v) => { setPickupFloor(v); set("pickupRoom")(""); }}
                      placeholder="Select Floor"
                      options={Object.keys(roomsByFloor)}
                    />
                  </FieldWrapper>
                  {/* Room dropdown disabled until floor selected (preserved) */}
                  <FieldWrapper label="Pickup Room" required error={errors.pickupRoom}>
                    <SelectInput
                      value={pickupRoom}
                      onChange={set("pickupRoom")}
                      placeholder="Select Room"
                      options={pickupFloor ? roomsByFloor[pickupFloor] : []}
                      error={!!errors.pickupRoom}
                      disabled={!pickupFloor}
                    />
                  </FieldWrapper>
                </div>

                {/* Timing: Deliver Now vs Schedule */}
                <FieldWrapper label="When to Deliver">
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden w-full">
                    <button
                      type="button"
                      onClick={() => { setTimingMode("now"); setSchedTime(""); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold transition-colors"
                      style={timingMode === "now"
                        ? { background: "#800000", color: "#FFD700" }
                        : { background: "#F9FAFB", color: "#6B7280" }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Deliver Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingMode("schedule")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold transition-colors border-l border-gray-200"
                      style={timingMode === "schedule"
                        ? { background: "#800000", color: "#FFD700" }
                        : { background: "#F9FAFB", color: "#6B7280" }}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Schedule
                    </button>
                  </div>
                </FieldWrapper>

                {/* Time slot — only shown in schedule mode (preset slots, preserved) */}
                {timingMode === "schedule" && (
                  <FieldWrapper label="Time Slot" required error={errors.schedTime}>
                    <SelectInput
                      value={schedTime}
                      onChange={(v) => {
                        setSchedTime(v);
                        setErrors(p => ({ ...p, schedTime: undefined as any }));
                      }}
                      placeholder="Select a time slot"
                      options={TIME_SLOTS}
                      error={!!errors.schedTime}
                    />
                  </FieldWrapper>
                )}

                {/* "Deliver Now" context note */}
                {timingMode === "now" && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    <p className="text-[11.5px] text-green-700 font-medium">
                      The robot will be dispatched as soon as you submit.
                    </p>
                  </div>
                )}

                {/* Robot selector — real data from API (ROBOT_STATUS_STYLE preserved) */}
                <FieldWrapper label="Assigned Robot">
                  {robotsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-[#800000]" />
                      Loading robots...
                    </div>
                  ) : robots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {robots.map((r) => {
                        const s = ROBOT_STATUS_STYLE[r.status] ?? ROBOT_STATUS_STYLE["Offline"];
                        return (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: s.bg, color: s.color }}
                          >
                            <Bot className="h-3 w-3" />
                            {r.name}
                            <span className="font-normal opacity-70">· {r.status}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-400 italic">No robots available right now.</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    An available robot will be auto-assigned on dispatch.
                  </p>
                </FieldWrapper>

              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-colors"
                style={{
                  background: "#800000",
                  color: "#FFD700",
                  opacity: submitting || !isFormValid ? 0.5 : 1,
                  cursor:  submitting || !isFormValid ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!submitting && isFormValid) e.currentTarget.style.background = "#660000"; }}
                onMouseLeave={(e) => { if (!submitting && isFormValid) e.currentTarget.style.background = "#800000"; }}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Dispatching..." : "Dispatch Robot Now"}
              </button>
              {/* Clear form (preserved) */}
              <button
                type="button"
                onClick={handleClear}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold border transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: "#800000", color: "#800000" }}
              >
                <X className="h-4 w-4" />
                Clear Form
              </button>
            </div>

          </div>{/* end left column */}

          {/* ── RIGHT COLUMN — sticky summary ──────────────────────────────── */}
          <div className="flex-[2] min-w-0 sticky top-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-[13px] font-bold text-[#1A1A1A] mb-4">Delivery Summary</p>

              <div className="space-y-3.5">

                {/* From */}
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">From</p>
                  <div className="flex items-center gap-2.5">
                    <AvatarCircle initials={senderProfile.initials} color="#800000" size={28} />
                    <div>
                      <p className="text-[12.5px] font-semibold text-[#1A1A1A]">{senderProfile.name}</p>
                      <p className="text-[11px] text-gray-400">{senderProfile.room} · {senderProfile.building}</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* To */}
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">To</p>
                  {recipient ? (
                    <div className="flex items-center gap-2.5">
                      <AvatarCircle initials={recipient.initials} color={recipient.avatarColor} size={28} />
                      <div>
                        <p className="text-[12.5px] font-semibold text-[#1A1A1A]">{recipient.name}</p>
                        <p className="text-[11px] text-gray-400">{recipient.room} · {recipient.building}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-gray-300 italic">—</p>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Item */}
                <SummaryRow label="Item">
                  {itemName.trim()
                    ? <span className="text-[12.5px] font-medium text-[#1A1A1A]">{itemName}</span>
                    : <span className="text-[12.5px] text-gray-300 italic">—</span>}
                </SummaryRow>

                {/* Qty */}
                <SummaryRow label="Qty">
                  <span className="text-[12.5px] font-medium text-[#1A1A1A]">{qty}</span>
                </SummaryRow>

                {/* Note — only if filled */}
                {note.trim() && (
                  <SummaryRow label="Note">
                    <span className="text-[12px] text-gray-500 italic max-w-[140px] text-right leading-snug">{note}</span>
                  </SummaryRow>
                )}

                <div className="h-px bg-gray-100" />

                {/* Pickup */}
                <SummaryRow label="Pickup">
                  {pickupRoom
                    ? <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1A1A1A]">
                        <MapPin className="h-3 w-3 text-[#800000]" />Room {pickupRoom}
                      </span>
                    : <span className="text-[12px] text-gray-300 italic">—</span>}
                </SummaryRow>

                {/* Delivery time */}
                <SummaryRow label="Delivery">
                  {timingMode === "now" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}>
                      <Zap className="h-3 w-3" />Now
                    </span>
                  ) : schedTime ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#800000", color: "#FFD700" }}>
                      <CalendarClock className="h-3 w-3" />{schedTime}
                    </span>
                  ) : (
                    <span className="text-[12px] text-gray-300 italic">—</span>
                  )}
                </SummaryRow>

                <div className="h-px bg-gray-100" />
                <div className="h-px bg-gray-100" />

                {/* Status pill */}
                {isFormValid ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg"
                    style={{ background: "rgba(22,163,74,0.08)" }}>
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#16a34a" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "#16a34a" }}>
                      Ready to dispatch
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg"
                    style={{ background: "rgba(245,158,11,0.08)" }}>
                    <AlertCircle className="h-4 w-4" style={{ color: "#D97706" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "#D97706" }}>
                      Fill required fields
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}