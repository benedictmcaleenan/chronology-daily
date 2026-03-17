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
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="6" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="6" cy="9" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <circle cx="6" cy="14" r="1.5" />
      <circle cx="12" cy="14" r="1.5" />
    </svg>
  );
}

export default function GameBoard({ events, onSubmit }: GameBoardProps) {
  // First 2 events go straight into the timeline; the rest are queued
  const [timeline, setTimeline] = useState<HistoricalEvent[]>(() =>
    events.slice(0, 2)
  );
  const [nextIndex, setNextIndex] = useState(2);

  const incoming = nextIndex < events.length ? events[nextIndex] : null;
  const isDone = nextIndex >= events.length;
  const total = events.length;

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    // Reorder within the timeline
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

    // Place incoming card into the timeline
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
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{timeline.length} placed</span>
          <span>{total - timeline.length} remaining</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < timeline.length ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Timeline — growing list of placed cards */}
        <Droppable droppableId="timeline">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 rounded-2xl transition-colors min-h-20 ${
                snapshot.isDraggingOver ? "bg-indigo-50" : ""
              }`}
            >
              {timeline.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center h-20 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
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
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 bg-white select-none ${
                        snapshot.isDragging
                          ? "border-indigo-400 shadow-xl"
                          : "border-gray-200 shadow-sm"
                      }`}
                    >
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">
                        {event.eventText}
                      </p>
                      <div
                        {...provided.dragHandleProps}
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing p-1 touch-none"
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

        {/* Incoming card — drag this into the timeline */}
        {incoming && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide whitespace-nowrap">
                ↑ drag into position above
              </p>
              <div className="flex-1 h-px bg-gray-200" />
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
                        className={`p-4 rounded-2xl border-2 border-dashed select-none transition-colors ${
                          snapshot.isDragging
                            ? "bg-amber-100 border-amber-400 shadow-xl"
                            : "bg-amber-50 border-amber-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-amber-900 leading-snug">
                          {incoming.eventText}
                        </p>
                        <p className="text-xs text-amber-500 mt-1.5 font-medium">
                          Card {nextIndex + 1} of {total}
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

      {/* Submit — fixed at bottom, only when all cards are placed */}
      {isDone && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/95 backdrop-blur border-t border-gray-200">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => onSubmit(timeline)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base rounded-2xl transition-colors shadow-lg"
            >
              Submit Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
