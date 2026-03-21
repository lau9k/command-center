"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { TaskBoardCard } from "./task-board-card";
import type { TaskWithProject, TaskStatus } from "@/lib/types/database";
import type { GovernanceMap } from "@/lib/hooks/useGovernanceCheck";

interface TaskBoardColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: TaskWithProject[];
  onCardClick: (task: TaskWithProject) => void;
  governanceMap?: GovernanceMap;
}

export function TaskBoardColumn({
  status,
  label,
  color,
  tasks,
  onCardClick,
  governanceMap,
}: TaskBoardColumnProps) {
  return (
    <div className="flex min-w-[280px] flex-col" style={{ width: 300 }}>
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[200px] flex-1 space-y-2 overflow-y-auto rounded-lg border border-border p-2 transition-colors",
              snapshot.isDraggingOver && "border-primary/30 bg-primary/5"
            )}
            style={{
              maxHeight: "calc(100vh - 280px)",
              borderLeftWidth: 2,
              borderLeftColor: color,
            }}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={dragProvided.draggableProps.style}
                  >
                    <TaskBoardCard
                      task={task}
                      onClick={onCardClick}
                      dragHandleProps={dragProvided.dragHandleProps}
                      governanceStatus={
                        task.task_type === "outreach" && task.contacts?.email
                          ? governanceMap?.[task.contacts.email]?.status
                          : undefined
                      }
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-border py-8">
                <p className="text-xs text-muted-foreground">
                  Drop tasks here
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
