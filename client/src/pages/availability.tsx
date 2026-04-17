import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

// Generate HH:MM options from 06:00 to 22:00 in 30-min increments
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function formatDisplay(time: string) {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr);
  const m = mStr;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${period}`;
}

interface TimeWindow {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  enabled: boolean;
  windows: TimeWindow[];
}

type WeekSchedule = Record<number, DaySchedule>;

function buildInitialSchedule(slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): WeekSchedule {
  const schedule: WeekSchedule = {};
  for (const day of DAYS) {
    schedule[day.value] = { enabled: false, windows: [] };
  }
  for (const slot of slots) {
    const day = schedule[slot.dayOfWeek];
    if (day) {
      day.enabled = true;
      day.windows.push({ startTime: slot.startTime, endTime: slot.endTime });
    }
  }
  return schedule;
}

export default function Availability() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [schedule, setSchedule] = useState<WeekSchedule>(() => {
    const s: WeekSchedule = {};
    for (const day of DAYS) s[day.value] = { enabled: false, windows: [] };
    return s;
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: existingSlots, isLoading: slotsLoading } = useQuery<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>({
    queryKey: ["/api/professional/availability"],
    enabled: !!isAuthenticated,
  });

  useEffect(() => {
    if (existingSlots) {
      setSchedule(buildInitialSchedule(existingSlots));
    }
  }, [existingSlots]);

  const saveMutation = useMutation({
    mutationFn: async (slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) => {
      const res = await apiRequest("PUT", "/api/professional/availability", { slots });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional/availability"] });
      toast({ title: "Availability saved", description: "Your schedule has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save availability.", variant: "destructive" });
    },
  });

  function toggleDay(dayValue: number, enabled: boolean) {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        enabled,
        windows: enabled && prev[dayValue].windows.length === 0
          ? [{ startTime: "09:00", endTime: "17:00" }]
          : prev[dayValue].windows,
      },
    }));
  }

  function addWindow(dayValue: number) {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        windows: [...prev[dayValue].windows, { startTime: "09:00", endTime: "17:00" }],
      },
    }));
  }

  function removeWindow(dayValue: number, index: number) {
    setSchedule(prev => {
      const windows = prev[dayValue].windows.filter((_, i) => i !== index);
      return {
        ...prev,
        [dayValue]: { ...prev[dayValue], windows, enabled: windows.length > 0 },
      };
    });
  }

  function updateWindow(dayValue: number, index: number, field: keyof TimeWindow, value: string) {
    setSchedule(prev => {
      const windows = [...prev[dayValue].windows];
      windows[index] = { ...windows[index], [field]: value };
      return { ...prev, [dayValue]: { ...prev[dayValue], windows } };
    });
  }

  function handleSave() {
    const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
    for (const day of DAYS) {
      const daySchedule = schedule[day.value];
      if (!daySchedule.enabled) continue;
      for (const w of daySchedule.windows) {
        if (w.startTime >= w.endTime) {
          toast({
            title: "Invalid time range",
            description: `On ${day.label}, end time must be after start time.`,
            variant: "destructive",
          });
          return;
        }
        slots.push({ dayOfWeek: day.value, startTime: w.startTime, endTime: w.endTime });
      }
    }
    saveMutation.mutate(slots);
  }

  if (isLoading || slotsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate("/professional-dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900 ml-2 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Set Your Availability
            </h1>
          </div>
        </div>
      </div>
      {/* Spacer */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />

      <div className="max-w-2xl mx-auto px-4 mobile-safe-bottom py-4">
        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            Choose which days and hours clients can book you.
          </p>
        </div>

        <div className="space-y-4">
          {DAYS.map(day => {
            const daySchedule = schedule[day.value];
            return (
              <Card key={day.value}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{day.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${day.value}`} className="text-sm text-gray-500">
                        {daySchedule.enabled ? "Available" : "Unavailable"}
                      </Label>
                      <Switch
                        id={`toggle-${day.value}`}
                        checked={daySchedule.enabled}
                        onCheckedChange={enabled => toggleDay(day.value, enabled)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {daySchedule.enabled && (
                  <CardContent className="pt-0 space-y-3">
                    {daySchedule.windows.map((window, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={window.startTime}
                          onValueChange={v => updateWindow(day.value, idx, "startTime", v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>{formatDisplay(window.startTime)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(t => (
                              <SelectItem key={t} value={t}>{formatDisplay(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-gray-400">to</span>

                        <Select
                          value={window.endTime}
                          onValueChange={v => updateWindow(day.value, idx, "endTime", v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>{formatDisplay(window.endTime)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map(t => (
                              <SelectItem key={t} value={t}>{formatDisplay(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWindow(day.value, idx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addWindow(day.value)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add time window
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}
