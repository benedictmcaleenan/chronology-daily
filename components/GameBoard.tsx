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
  wikiUrl?: string | null;
}

interface GameBoardProps {
  events: HistoricalEvent[];
  puzzleNumber: number;
  onSubmit: (orderedEvents: HistoricalEvent[]) => void;
  onProgress: (timeline: HistoricalEvent[], nextIndex: number) => void;
  initialTimeline?: HistoricalEvent[];
  initialNextIndex?: number;
}

function GripIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="#D3D1C7" aria-hidden="true" focusable="false">
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

    if (source.droppableId === "timeline" && destination.droppableId === "timeline") {
      const next = Array.from(timeline);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setTimeline(next);
      onProgress(next, nextIndex);
      return;
    }

    if (source.droppableId === "incoming" && destination.droppableId === "timeline") {
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
    <div className="flex flex-col min-h-0 flex-1">

      {/* ── Dark header ───────────────────────────────────────────────── */}
      <div className="bg-[#2C2C2A] px-5 pt-3 pb-2 flex-shrink-0">
        <h1 className="text-center text-[20px] font-serif text-[#F1EFE8] leading-none">
          Chronology Daily
        </h1>
        <p className="text-center text-[12px] text-[#B4B2A9] mt-1 leading-none">
          Puzzle #{puzzleNumber} — {timeline.length} of {total} placed
        </p>
        {/* Progress bar */}
        <div className="flex gap-[3px] mt-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-sm transition-colors duration-200 ${
                i < timeline.length ? "bg-[#854F0B]" : "bg-[#4A4A47]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Game content ──────────────────────────────────────────────── */}
      <div className="flex flex-col px-4 pt-2 pb-1 min-h-0">

        {/* TIMELINE label */}
        <p className="text-[11px] tracking-[0.07em] text-[#B4B2A9] uppercase mb-1.5 flex-shrink-0">
          Timeline
        </p>

        <DragDropContext key={nextIndex} onDragEnd={handleDragEnd}>

          {/* ── Timeline droppable with vertical line + dots ─────────── */}
          {/*
              Dot alignment math (all relative to the .relative container):
                container: padding-left 32px  (pl-8)
                line:      left 10px, width 2px  → centre at x = 11px
                dot:       width 10px → to centre at x = 11, left-edge = 6px
                           row starts at x = 32 (due to pl-8)
                           dot left (relative to row) = 6 − 32 = −26px  ✓
          */}
          <Droppable droppableId="timeline">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`relative pl-8 transition-colors ${
                  snapshot.isDraggingOver ? "bg-[#FAFAF7]" : ""
                }`}
              >
                {/* Continuous vertical line */}
                <div className="absolute left-[10px] top-0 bottom-0 w-[2px] bg-[#D3D1C7]" />

                {timeline.length === 0 && !snapshot.isDraggingOver && (
                  <div className="min-h-[44px] flex items-center text-[12px] text-[#B4B2A9]">
                    Drag the card below into position
                  </div>
                )}

                {timeline.map((event, index) => (
                  <Draggable key={event.id} draggableId={event.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        aria-label={`Position ${index + 1}: ${event.eventText}. Drag to reorder.`}
                        className={`relative flex items-center min-h-[44px] mb-[3px] select-none touch-none cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging ? "opacity-90" : ""
                        }`}
                      >
                        {/* Dot — left-[-26px] centres it on the line (see math above) */}
                        <div className="absolute left-[-26px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-[#854F0B] z-10" />

                        {/* Card */}
                        <div
                          className={`flex-1 bg-white border border-[#D3D1C7] rounded-[6px] px-3 py-[10px] transition-shadow ${
                            snapshot.isDragging ? "shadow-md border-[#854F0B]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 flex-shrink-0 text-[12px] text-[#B4B2A9] leading-none">
                              {index + 1}
                            </span>
                            <p className="flex-1 text-[14px] text-[#2C2C2A] leading-snug">
                              {event.eventText}
                            </p>
                            {/* 44×44 touch-target grip zone */}
                            <span className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center -mr-3">
                              <GripIcon />
                            </span>
                          </div>
                        </div>
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
            <div className="mt-2 pt-2 border-t border-dashed border-[#D3D1C7] flex-shrink-0">
              <p className="text-[11px] tracking-[0.07em] text-[#854F0B] uppercase text-center mb-1.5">
                Next Event
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
                          aria-label={`Next card: ${incoming.eventText}. Drag into the timeline above.`}
                          className={`px-3 py-2.5 rounded-[6px] border-[1.5px] border-[#EF9F27] bg-[#FAEEDA] select-none touch-none cursor-grab active:cursor-grabbing transition-shadow ${
                            snapshot.isDragging ? "shadow-lg" : ""
                          }`}
                        >
                          <p className="text-[14px] text-[#633806] leading-snug">
                            {incoming.eventText}
                          </p>
                        </div>
                      )}
                    </Draggable>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <p className="text-[12px] text-[#854F0B] text-center mt-1">
                Drag into the timeline above
              </p>
            </div>
          )}

        </DragDropContext>

        {/* ── Submit button ─────────────────────────────────────────── */}
        {isDone && (
          <button
            onClick={() => onSubmit(timeline)}
            className="mt-3 w-full py-3 bg-[#854F0B] hover:bg-[#6B3F08] active:bg-[#6B3F08] text-[#F1EFE8] text-[14px] font-medium rounded-[8px] transition-colors flex-shrink-0"
          >
            Submit Order
          </button>
        )}

      </div>
    </div>
  );
}
