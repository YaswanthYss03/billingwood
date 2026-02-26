'use client';

import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DraggableTable } from './draggable-table';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2, Save, Grid3x3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Table {
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
  locationId: string;
  location?: any;
  kots?: any[];
  occupiedAt?: string;
}

interface FloorPlanCanvasProps {
  tables: Table[];
  onTableEdit: (table: Table) => void;
  onSavePositions: (updates: Array<{ id: string; positionX: number; positionY: number; rotation?: number }>) => Promise<void>;
}

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;
const STAGING_X = 20;
const STAGING_Y = 20;
const STAGING_SPACING = 100;

export function FloorPlanCanvas({ tables, onTableEdit, onSavePositions }: FloorPlanCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [tablePositions, setTablePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Initialize positions for tables without coordinates (staging area)
  const getTablePosition = useCallback((table: Table, index: number) => {
    if (tablePositions.has(table.id)) {
      const pos = tablePositions.get(table.id)!;
      return { x: pos.x, y: pos.y };
    }
    
    if (table.positionX !== undefined && table.positionY !== undefined) {
      return { x: table.positionX, y: table.positionY };
    }

    // New table - place in staging area
    const row = Math.floor(index / 5);
    const col = index % 5;
    return {
      x: STAGING_X + col * STAGING_SPACING,
      y: STAGING_Y + row * STAGING_SPACING,
    };
  }, [tablePositions]);

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);

    if (!delta.x && !delta.y) return;

    const table = tables.find(t => t.id === active.id);
    if (!table) return;

    const currentPos = getTablePosition(table, tables.indexOf(table));
    const newX = Math.max(0, Math.min(CANVAS_WIDTH - (table.width || 80), currentPos.x + delta.x / zoom));
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT - (table.height || 80), currentPos.y + delta.y / zoom));

    setTablePositions(prev => new Map(prev).set(table.id, { x: newX, y: newY }));
    setIsDirty(true);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(2, prev + 0.1));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleSave = async () => {
    const updates = tables
      .map((table, index) => {
        const pos = tablePositions.has(table.id)
          ? tablePositions.get(table.id)!
          : { x: table.positionX ?? getTablePosition(table, index).x, y: table.positionY ?? getTablePosition(table, index).y };
        
        const update: any = {
          id: table.id,
          positionX: Math.round(pos.x),
          positionY: Math.round(pos.y),
        };
        
        // Only include rotation if it's defined
        if (table.rotation !== undefined && table.rotation !== null) {
          update.rotation = table.rotation;
        }
        
        return update;
      })
      .filter(update => {
        const table = tables.find(t => t.id === update.id);
        if (!table) return false;
        
        // Check if position has changed or if this is a new position (table had no position before)
        const positionChanged = 
          table.positionX !== update.positionX ||
          table.positionY !== update.positionY ||
          table.positionX === undefined ||
          table.positionX === null;
        
        // Check if rotation changed (only if both have rotation values)
        const rotationChanged = 
          update.rotation !== undefined && 
          table.rotation !== update.rotation;
        
        return positionChanged || rotationChanged;
      });

    if (updates.length === 0) {
      toast.success('No changes to save');
      return;
    }

    try {
      await onSavePositions(updates);
      setIsDirty(false);
      setTablePositions(new Map());
      toast.success(`Saved positions for ${updates.length} table${updates.length > 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save positions';
      toast.error(errorMessage);
    }
  };

  const activeTable = activeId ? tables.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 2}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomReset}
              className="h-8 w-8 p-0"
              title="Reset zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Grid toggle */}
          <Button
            variant={showGrid ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="h-8"
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Grid
          </Button>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!isDirty}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Save Layout
          {isDirty && <span className="ml-1 text-xs">(Unsaved changes)</span>}
        </Button>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="relative bg-white dark:bg-gray-950"
            style={{
              width: CANVAS_WIDTH * zoom,
              height: CANVAS_HEIGHT * zoom,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundImage: showGrid
                ? 'radial-gradient(circle, #9ca3af 1px, transparent 1px)'
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0',
            }}
          >
            {/* Render all tables */}
            {tables.map((table, index) => {
              const pos = getTablePosition(table, index);
              return (
                <DraggableTable
                  key={table.id}
                  table={{ ...table, positionX: pos.x, positionY: pos.y }}
                  onEdit={onTableEdit}
                  scale={zoom}
                />
              );
            })}

            {/* Staging area label */}
            {tables.some(t => t.positionX === undefined || t.positionY === undefined) && (
              <div
                className="absolute top-0 left-0 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-br"
                style={{ pointerEvents: 'none' }}
              >
                📦 Staging Area - Drag tables to position them
              </div>
            )}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTable ? (
              <div
                className={`
                  rounded-lg border-2 shadow-lg
                  flex flex-col items-center justify-center
                  opacity-80
                  bg-blue-100 dark:bg-blue-900 border-blue-500
                `}
                style={{
                  width: activeTable.width || Math.max(80, activeTable.capacity * 15),
                  height: activeTable.height || Math.max(80, activeTable.capacity * 15),
                }}
              >
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {activeTable.tableNumber}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>Total Tables: {tables.length}</span>
          <span>Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 dark:bg-green-950/20"></div>
            <span>Free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50 dark:bg-red-950/20"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"></div>
            <span>Reserved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
