import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Dumbbell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  type?: "workout" | "deload" | "checkin" | "assessment";
  status?: "completed" | "scheduled" | "missed";
  subtitle?: string;
  durationMinutes?: number;
  metadata?: Record<string, any>;
}

interface EventCalendarProps {
  events?: CalendarEvent[];
  initialDate?: Date;
  onSelectDate?: (date: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  className?: string;
}

export function EventCalendar({
  events = [],
  initialDate = new Date(),
  onSelectDate,
  onSelectEvent,
  className,
}: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialDate);
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = React.useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Começa na segunda-feira
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = React.useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const getDayEvents = (day: Date) => {
    return events.filter((e) => {
      const eventDate = typeof e.date === "string" ? new Date(e.date) : e.date;
      return isSameDay(eventDate, day);
    });
  };

  const handleDayClick = (day: Date, dayEvents: CalendarEvent[]) => {
    setSelectedDay(day);
    if (onSelectDate) onSelectDate(day);
    if (dayEvents.length > 0) {
      setDayModalOpen(true);
    }
  };

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className={cn("w-full rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs", className)}>
      {/* Calendar Header Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold capitalize text-foreground">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {events.length} treino(s) e sessão(ões) no período
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
          >
            Hoje
          </Button>
          <div className="flex items-center rounded-lg border border-border/70 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7 cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7 cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-1.5 text-xs font-semibold uppercase tracking-wider",
              i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const dayEvents = getDayEvents(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day, dayEvents)}
              className={cn(
                "group relative min-h-[68px] sm:min-h-[88px] rounded-lg p-1.5 sm:p-2 border transition-all cursor-pointer flex flex-col justify-between",
                isCurrentMonth
                  ? "bg-card border-border/60 hover:border-primary/50 hover:bg-muted/30"
                  : "bg-muted/15 border-border/20 text-muted-foreground/40",
                isSelected && "ring-2 ring-primary border-primary",
                isTodayDate && "border-primary/70 bg-primary/5"
              )}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isTodayDate
                      ? "grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground font-bold"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayEvents.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary sm:hidden" />
                )}
              </div>

              {/* Event Pills on Desktop / Tablet */}
              <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectEvent) onSelectEvent(ev);
                      setSelectedDay(day);
                      setDayModalOpen(true);
                    }}
                    className={cn(
                      "hidden sm:flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-colors leading-tight",
                      ev.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : ev.type === "deload"
                        ? "bg-muted text-muted-foreground border border-border"
                        : "bg-primary/15 text-primary border border-primary/30"
                    )}
                    title={ev.title}
                  >
                    {ev.status === "completed" ? (
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <Dumbbell className="h-2.5 w-2.5 shrink-0" />
                    )}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}

                {dayEvents.length > 2 && (
                  <span className="hidden sm:block text-[9px] font-mono text-muted-foreground font-semibold px-1">
                    +{dayEvents.length - 2} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Details Modal */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>
                {selectedDay
                  ? format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })
                  : "Detalhes do Dia"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum treino prescrito para este dia.
              </p>
            ) : (
              selectedDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      {ev.title}
                    </span>
                    <Badge
                      variant={ev.status === "completed" ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] uppercase font-mono",
                        ev.status === "completed" && "bg-emerald-600 text-white"
                      )}
                    >
                      {ev.status === "completed" ? "Concluído" : "Prescrito"}
                    </Badge>
                  </div>
                  {ev.subtitle && (
                    <p className="text-xs text-muted-foreground">{ev.subtitle}</p>
                  )}
                  {ev.durationMinutes && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{ev.durationMinutes} minutos estimados</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
