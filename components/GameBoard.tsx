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
  events: HistoricalEvent[]; // shuffled array, length 10
  onSubmit: (orderedEvents: HistoricalEvent[]) => void;
}

function GripIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="3.5" r="1.4" />
      <circle cx="11" cy="3.5" r="1.4" />
      <circle cx="5" cy="8" r="1.4" />
      <circle cx="11" cy="8" r="1.4" />
      <circle cx="5" cy="12.5" r="1.4" />
      <circle cx="11" cy="12.5" r="1.4" />
    </svg>
  );
}

export default function GameBoard({ events, onSubmit }: GameBoardProps) {
  const [timeline, setTimeline] = useState<HistoricalEvent[]>(() =>
    [...events.slice(0, 2)].sort((a, b) => a.year - b.year)
  );
  const [nextIndex, setNextIndex] = useState(2);

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
      return;
    }
  }

  return (
    <div className={isDone ? "pb-28" : ""}>
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">
            {timeline.length}{" "}
            <span className="font-normal text-slate-400">of {total} placed</span>
          </span>
          {incoming ? (
            <span className="text-xs text-slate-400">
              card {nextIndex + 1} of {total}
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600">
              All placed — ready to submit!
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < timeline.length ? "bg-slate-700" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Timeline */}
        <Droppable droppableId="timeline">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 rounded-2xl transition-colors min-h-16 ${
                snapshot.isDraggingOver ? "bg-slate-100" : ""
              }`}
            >
              {timeline.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center h-16 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm">
                  Drag the card below to start
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
                      style={provided.draggableProps.style}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white select-none transition-shadow ${
                        snapshot.isDragging
                          ? "border-slate-400 shadow-xl rotate-1"
                          : "border-slate-200 shadow-sm"
                      }`}
                    >
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-slate-800 leading-snug">
                        {event.eventText}
                      </p>
                      <div
                        {...provided.dragHandleProps}
                        className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing p-1 touch-none"
                        aria-label="Drag to reorder"
                      >
                        <GripIcon />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Incoming card */}
        {incoming && (
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest whitespace-nowrap">
                drag up to place
              </p>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <Droppable droppableId="incoming" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <Draggable
                    key={incoming.id}
                    draggableId={incoming.id}
                    index={0}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        className={`p-4 rounded-xl border-2 select-none transition-all cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging
                            ? "bg-amber-100 border-amber-400 shadow-xl"
                            : "bg-amber-50 border-amber-300 animate-glow-pulse"
                        }`}
                      >
                        <p className="text-sm font-semibold text-amber-900 leading-snug">
                          {incoming.eventText}
                        </p>
                      </div>
                    )}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </DragDropContext>

      {/* Submit — fixed at bottom */}
      {isDone && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-slate-50/95 backdrop-blur-sm border-t border-slate-200">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => onSubmit(timeline)}
              className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-[0.98] text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-green-200"
            >
              Submit Order →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
