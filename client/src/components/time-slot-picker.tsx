import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface TimeSlotPickerProps {
  professionalId: number;
  onSlotSelect: (slot: string) => void;
  selectedSlot: string | null;
}

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  date: string;
  fullDate: Date;
}

const PAGE_SIZE = 8;

export default function TimeSlotPicker({ professionalId, onSlotSelect, selectedSlot }: TimeSlotPickerProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: availableSlots = [], isLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/professional/${professionalId}/available-slots`],
    enabled: !!professionalId,
  });

  const handleSlotClick = (slotId: string) => {
    onSlotSelect(slotId === selectedSlot ? '' : slotId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No available time slots at the moment. Please check back later.
      </div>
    );
  }

  const visibleSlots = availableSlots.slice(0, visibleCount);
  const hasMore = visibleCount < availableSlots.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleSlots.map((slot) => (
          <Button
            key={slot.id}
            variant={selectedSlot === slot.id ? "default" : "outline"}
            className={`p-3 h-auto text-center transition-colors ${
              selectedSlot === slot.id
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 hover:border-primary hover:text-primary'
            }`}
            onClick={() => handleSlotClick(slot.id)}
            data-testid={`time-slot-${slot.id}`}
          >
            <div>
              <div className="font-medium">{slot.day}</div>
              <div className="text-sm opacity-90">{slot.time}</div>
            </div>
          </Button>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="text-primary hover:text-primary"
          >
            Show more ({availableSlots.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
