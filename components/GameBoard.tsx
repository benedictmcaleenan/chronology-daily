"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

export interface HistoricalEvent {
  id: string;
  eventText: string;
  year: number;
  description: string;
  category: string;
  era: string;
  geography: string;
}

interface GameBoardProps {
  events: HistoricalEvent[];
  puzzleNumber: number;
  onSubmit: (orderedEvents: HistoricalEvent[]) => void;
  onProgress: (timeline: HistoricalEvent[], nextIndex: number) => void;
  initialTimeline?: HistoricalEvent[];
  initialNextIndex?: number;
}

/** Decorative 3-line hamburger — whole card is the actual drag handle */
function GripIcon() {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      fill="#ccc"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0"    width="14" height="1.5" rx="0.75" />
      <rect x="0" y="4.25" width="14" height="1.5" rx="0.75" />
      <rect x="0" y="8.5"  width="14" height="1.5" rx="0.75" />
    </svg>
  );
}

export default function GameBoard({
  events,
  puzzleNumber,
  onSubmit,
  onProgress,
  initialTimeline,
  initialNextIndex,
}: GameBoardProps) {
  const [timeline, setTimeline] = useState<HistoricalEvent[]>(
    () => initialTimeline ?? [events[0]]
  );
  const [nextIndex, setNextIndex] = useState(initialNextIndex ?? 1);

  const incoming = nextIndex < events.length ? events[nextIndex] : null;
  const isDone = nextIndex >= events.length;
  const total = events.length;

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === "timeline" &&
      destination.droppableId === "timeline"
    ) {
      const next = Array.from(timeline);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setTimeline(next);
      onProgress(next, nextIndex);
      return;
    }

    if (
      source.droppableId === "incoming" &&
      destination.droppableId === "timeline"
    ) {
      if (!incoming) return;
      const next = Array.from(timeline);
      next.splice(destination.index, 0, incoming);
      setTimeline(next);
      setNextIndex((i) => i + 1);
      onProgress(next, nextIndex + 1);
      return;
    }
  }

  return (
    <div className="flex flex-col pt-0 pb-2">
      {/* ── Info line: puzzle number + progress count ─────────────────── */}
      <div className="flex justify-between items-center py-2">
        <span className="text-[12px] text-[#888]">No.&nbsp;{puzzleNumber}</span>
        <span className="text-[12px] text-[#888]">{timeline.length}&nbsp;/&nbsp;{total}</span>
      </div>

      {/* ── Progress bar: 10 thin segments ───────────────────────────── */}
      <div className="flex gap-[2px] mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-[2px] flex-1 transition-colors duration-200 ${
              i < timeline.length ? "bg-[#111]" : "bg-[#ddd]"
            }`}
          />
        ))}
      </div>

      <DragDropContext key={nextIndex} onDragEnd={handleDragEnd}>
        {/* ── Timeline: table-of-contents rows ─────────────────────── */}
        <Droppable droppableId="timeline">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`transition-colors ${
                snapshot.isDraggingOver ? "bg-[#fafafa]" : ""
              }`}
            >
              {timeline.length === 0 && !snapshot.isDraggingOver && (
                <div className="min-h-[44px] flex items-center text-[12px] text-[#aaa] border-t border-[#eee]">
                  Drag the card below into position
                </div>
              )}
              {timeline.map((event, index) => (
                <Draggable
                  key={event.id}
                  draggableId={event.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={provided.draggableProps.style}
                      aria-label={`Position ${index + 1}: ${event.eventText}. Drag to reorder.`}
                      className={`flex items-center min-h-[44px] border-t border-[#eee] select-none touch-none cursor-grab active:cursor-grabbing ${
                        snapshot.isDragging
                          ? "bg-white shadow-md opacity-95"
                          : "bg-white"
                      }`}
                    >
                      {/* Position number */}
                      <span className="w-6 flex-shrink-0 text-[12px] text-[#aaa] leading-none">
                        {index + 1}
                      </span>
                      {/* Event text */}
                      <p className="flex-1 text-[14px] text-[#111] leading-snug px-2 py-2">
                        {event.eventText}
                      </p>
                      {/* Decorative grip */}
                      <span className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center">
                        <GripIcon />
                      </span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* ── Incoming card ─────────────────────────────────────────── */}
        {incoming && (
          <div className="mt-4">
            {/* Dashed separator */}
            <div className="border-t border-dashed border-[#ccc] mb-3" />

            <p className="text-[11px] text-[#888] tracking-[0.08em] mb-2 uppercase">
              Place next
            </p>

            <Droppable droppableId="incoming" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <Draggable draggableId={incoming.id} index={0}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        aria-label={`Incoming card: ${incoming.eventText}. Drag into position above.`}
                        className={`px-3 py-2.5 rounded-[4px] select-none cursor-grab active:cursor-grabbing touch-none transition-colors ${
                          snapshot.isDragging
                            ? "bg-amber-50 border-[1.5px] border-[#d97706] shadow-sm"
                            : "bg-white border-[1.5px] border-[#d97706]"
                        }`}
                      >
                        <p className="text-[14px] text-[#111] leading-snug">
                          {incoming.eventText}
                        </p>
                      </div>
                    )}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <p className="text-[12px] text-[#888] mt-2">
              Drag into position above
            </p>
          </div>
        )}
      </DragDropContext>

      {/* ── Submit button — inline, appears when all placed ──────────── */}
      {isDone && (
        <button
          onClick={() => onSubmit(timeline)}
          className="mt-4 w-full py-3 border border-[#111] text-[14px] text-[#111] bg-white transition-colors hover:bg-[#111] hover:text-white active:bg-[#111] active:text-white"
        >
          Submit Order
        </button>
      )}
    </div>
  );
}
