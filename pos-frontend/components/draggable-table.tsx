'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Users, Edit2 } from 'lucide-react';

interface DraggableTableProps {
  table: {
    id: string;
    tableNumber: string;
    tableName?: string;
    capacity: number;
    status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'BILLED' | 'CLEANING' | 'OUT_OF_SERVICE';
    section?: string;
    floor?: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shape?: string;
  };
  onEdit: (table: any) => void;
  scale?: number;
}

const STATUS_COLORS: Record<string, string> = {
  FREE: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  OCCUPIED: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  RESERVED: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  BILLED: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
  CLEANING: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
  OUT_OF_SERVICE: 'border-gray-500 bg-gray-50 dark:bg-gray-950/20',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  FREE: 'text-green-700 dark:text-green-300',
  OCCUPIED: 'text-red-700 dark:text-red-300',
  RESERVED: 'text-yellow-700 dark:text-yellow-300',
  BILLED: 'text-blue-700 dark:text-blue-300',
  CLEANING: 'text-purple-700 dark:text-purple-300',
  OUT_OF_SERVICE: 'text-gray-700 dark:text-gray-300',
};

export function DraggableTable({ table, onEdit, scale = 1 }: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    data: table,
  });

  // Calculate dimensions based on capacity or use custom dimensions
  const baseWidth = table.width || Math.max(80, table.capacity * 15);
  const baseHeight = table.height || Math.max(80, table.capacity * 15);

  const style = {
    position: 'absolute' as const,
    left: table.positionX ?? 0,
    top: table.positionY ?? 0,
    width: baseWidth,
    height: baseHeight,
    transform: CSS.Transform.toString(transform),
    transformOrigin: 'top left',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? 'none' : 'opacity 0.2s',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(table);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(table);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group"
    >
      <div
        className={`
          w-full h-full rounded-lg border-2 shadow-md
          flex flex-col items-center justify-center
          ${STATUS_COLORS[table.status] || STATUS_COLORS.FREE}
          hover:shadow-lg hover:scale-105 transition-all
          relative
        `}
        onClick={handleClick}
      >
        {/* Edit button */}
        <button
          onClick={handleEditClick}
          className="absolute top-1 right-1 p-1 rounded bg-white dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Edit table"
        >
          <Edit2 className="w-3 h-3" />
        </button>

        {/* Table Number */}
        <div className={`text-lg font-bold ${STATUS_TEXT_COLORS[table.status]}`}>
          {table.tableNumber}
        </div>

        {/* Table Name (if exists) */}
        {table.tableName && (
          <div className={`text-xs ${STATUS_TEXT_COLORS[table.status]} opacity-75`}>
            {table.tableName}
          </div>
        )}

        {/* Capacity */}
        <div className={`flex items-center gap-1 mt-1 text-xs ${STATUS_TEXT_COLORS[table.status]}`}>
          <Users className="w-3 h-3" />
          <span>{table.capacity}</span>
        </div>

        {/* Status Badge */}
        <div className={`text-[10px] mt-1 px-2 py-0.5 rounded ${STATUS_TEXT_COLORS[table.status]} font-medium`}>
          {table.status}
        </div>

        {/* Section/Floor info (on hover) */}
        {(table.section || table.floor) && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {[table.section, table.floor].filter(Boolean).join(' • ')}
          </div>
        )}
      </div>
    </div>
  );
}
