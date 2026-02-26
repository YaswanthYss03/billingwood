import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto, OccupyTableDto, MoveTableDto, TableStatus, BulkPositionUpdateDto } from './dto';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  // List tables for a specific location
  async findAll(tenantId: string, locationId: string, status?: string) {
    const where: any = {
      tenantId,
      locationId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.table.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        kots: {
          where: {
            status: {
              in: ['PENDING', 'PREPARING', 'READY'],
            },
          },
          select: {
            id: true,
            kotNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { section: 'asc' },
        { tableNumber: 'asc' },
      ],
    });
  }

  // Get single table
  async findOne(tenantId: string, tableId: string) {
    const table = await this.prisma.table.findFirst({
      where: {
        id: tableId,
        tenantId,
        deletedAt: null,
      },
      include: {
        location: true,
        kots: {
          where: {
            status: {
              in: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
            },
          },
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  // Create table
  async create(tenantId: string, createTableDto: CreateTableDto) {
    // Check if table number already exists at this location
    const existing = await this.prisma.table.findFirst({
      where: {
        tenantId,
        locationId: createTableDto.locationId,
        tableNumber: createTableDto.tableNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Table number ${createTableDto.tableNumber} already exists at this location`,
      );
    }

    // Verify location belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: {
        id: createTableDto.locationId,
        tenantId,
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.table.create({
      data: {
        ...createTableDto,
        tenantId,
      },
      include: {
        location: true,
      },
    });
  }

  // Update table
  async update(tenantId: string, tableId: string, updateTableDto: UpdateTableDto) {
    const table = await this.findOne(tenantId, tableId);

    // If changing table number, check uniqueness
    if (updateTableDto.tableNumber && updateTableDto.tableNumber !== table.tableNumber) {
      const existing = await this.prisma.table.findFirst({
        where: {
          tenantId,
          locationId: table.locationId,
          tableNumber: updateTableDto.tableNumber,
          deletedAt: null,
          id: { not: tableId },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Table number ${updateTableDto.tableNumber} already exists at this location`,
        );
      }
    }

    return this.prisma.table.update({
      where: { id: tableId },
      data: updateTableDto,
      include: {
        location: true,
      },
    });
  }

  // Soft delete table
  async remove(tenantId: string, tableId: string) {
    const table = await this.findOne(tenantId, tableId);

    if (table.status === 'OCCUPIED') {
      throw new BadRequestException('Cannot delete occupied table');
    }

    return this.prisma.table.update({
      where: { id: tableId },
      data: { deletedAt: new Date() },
    });
  }

  // Update table status
  async updateStatus(tenantId: string, tableId: string, updateStatusDto: UpdateTableStatusDto) {
    const table = await this.findOne(tenantId, tableId);

    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Handle status transitions
    if (updateStatusDto.status === 'OCCUPIED') {
      updateData.occupiedAt = new Date();
      if (updateStatusDto.kotId) {
        updateData.currentKotId = updateStatusDto.kotId;
      }
    } else if (updateStatusDto.status === 'FREE') {
      updateData.occupiedAt = null;
      updateData.currentKotId = null;
      updateData.lastBilledAt = new Date();
    } else if (updateStatusDto.status === 'BILLED') {
      updateData.lastBilledAt = new Date();
    }

    return this.prisma.table.update({
      where: { id: tableId },
      data: updateData,
      include: {
        location: true,
      },
    });
  }

  // Occupy table (link to KOT)
  async occupy(tenantId: string, tableId: string, occupyDto: OccupyTableDto) {
    const table = await this.findOne(tenantId, tableId);

    if (table.status === 'OCCUPIED') {
      throw new BadRequestException('Table is already occupied');
    }

    // Verify KOT exists and belongs to tenant
    const kot = await this.prisma.kOT.findFirst({
      where: {
        id: occupyDto.kotId,
        tenantId,
      },
    });

    if (!kot) {
      throw new NotFoundException('KOT not found');
    }

    // Update table and KOT
    const [updatedTable] = await this.prisma.$transaction([
      this.prisma.table.update({
        where: { id: tableId },
        data: {
          status: 'OCCUPIED',
          currentKotId: occupyDto.kotId,
          occupiedAt: new Date(),
        },
      }),
      this.prisma.kOT.update({
        where: { id: occupyDto.kotId },
        data: {
          tableId: tableId,
        },
      }),
    ]);

    return updatedTable;
  }

  // Free table (usually after billing)
  async free(tenantId: string, tableId: string) {
    const table = await this.findOne(tenantId, tableId);

    return this.prisma.table.update({
      where: { id: tableId },
      data: {
        status: 'FREE',
        currentKotId: null,
        occupiedAt: null,
        lastBilledAt: new Date(),
      },
    });
  }

  // Move table to different section/zone
  async move(tenantId: string, tableId: string, moveDto: MoveTableDto) {
    const table = await this.findOne(tenantId, tableId);

    return this.prisma.table.update({
      where: { id: tableId },
      data: moveDto,
      include: {
        location: true,
      },
    });
  }

  // Bulk update table positions (for drag-and-drop floor plan)
  async bulkUpdatePositions(tenantId: string, bulkUpdateDto: BulkPositionUpdateDto) {
    // Verify all tables belong to tenant
    const tableIds = bulkUpdateDto.updates.map(u => u.id);
    const tables = await this.prisma.table.findMany({
      where: {
        id: { in: tableIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (tables.length !== tableIds.length) {
      throw new NotFoundException('One or more tables not found');
    }

    // Update all positions in a transaction
    const updatePromises = bulkUpdateDto.updates.map(update =>
      this.prisma.table.update({
        where: { id: update.id },
        data: {
          positionX: update.positionX,
          positionY: update.positionY,
          ...(update.rotation !== undefined && { rotation: update.rotation }),
        },
      }),
    );

    await this.prisma.$transaction(updatePromises);

    return {
      success: true,
      updated: tableIds.length,
    };
  }

  // Get location statistics
  async getLocationStats(tenantId: string, locationId: string) {
    const tables = await this.prisma.table.findMany({
      where: {
        tenantId,
        locationId,
        deletedAt: null,
      },
    });

    const totalTables = tables.length;
    const freeTables = tables.filter((t: any) => t.status === 'FREE').length;
    const occupiedTables = tables.filter((t: any) => t.status === 'OCCUPIED').length;
    const reservedTables = tables.filter((t: any) => t.status === 'RESERVED').length;
    const billedTables = tables.filter((t: any) => t.status === 'BILLED').length;
    const cleaningTables = tables.filter((t: any) => t.status === 'CLEANING').length;
    const outOfServiceTables = tables.filter((t: any) => t.status === 'OUT_OF_SERVICE').length;

    const occupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    // Get sections
    const sections = [...new Set(tables.map((t: any) => t.section).filter(Boolean))];

    return {
      totalTables,
      freeTables,
      occupiedTables,
      reservedTables,
      billedTables,
      cleaningTables,
      outOfServiceTables,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      sections,
    };
  }

  // Get available tables for booking
  async getAvailableTables(tenantId: string, locationId: string, capacity?: number) {
    const where: any = {
      tenantId,
      locationId,
      status: 'FREE',
      isActive: true,
      deletedAt: null,
    };

    if (capacity) {
      where.capacity = {
        gte: capacity,
      };
    }

    return this.prisma.table.findMany({
      where,
      orderBy: [
        { capacity: 'asc' },
        { tableNumber: 'asc' },
      ],
    });
  }

  // ============================================
  // TABLE RESERVATIONS
  // ============================================

  // Create a new reservation
  async createReservation(
    tenantId: string,
    locationId: string,
    data: any,
    userId?: string,
  ) {
    // Verify table exists and belongs to this tenant/location
    const table = await this.prisma.table.findFirst({
      where: {
        id: data.tableId,
        tenantId,
        locationId,
        deletedAt: null,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Check table capacity
    if (data.numberOfPeople > table.capacity) {
      throw new BadRequestException(
        `Table capacity (${table.capacity}) is less than the number of people (${data.numberOfPeople})`,
      );
    }

    // Combine date and time into DateTime objects
    const reservationDateTime = new Date(`${data.reservationDate}T${data.reservationTime}`);
    
    // Check for overlapping reservations on the same table
    const existingReservations = await this.prisma.tableReservation.findMany({
      where: {
        tableId: data.tableId,
        reservationDate: new Date(data.reservationDate),
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        deletedAt: null,
      },
    });

    // Check for time conflicts
    for (const existing of existingReservations) {
      const existingTime = new Date(existing.reservationTime);
      const duration = existing.duration || 120;
      const existingEnd = new Date(existingTime.getTime() + duration * 60000);
      
      const newEnd = new Date(reservationDateTime.getTime() + (data.duration || 120) * 60000);
      
      // Check if times overlap
      if (
        (reservationDateTime >= existingTime && reservationDateTime < existingEnd) ||
        (newEnd > existingTime && newEnd <= existingEnd) ||
        (reservationDateTime <= existingTime && newEnd >= existingEnd)
      ) {
        throw new ConflictException(
          `This table is already reserved from ${existingTime.toLocaleTimeString()} to ${existingEnd.toLocaleTimeString()}`,
        );
      }
    }

    // Generate confirmation code
    const confirmationCode = `RSV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create reservation
    return this.prisma.tableReservation.create({
      data: {
        tenantId,
        locationId,
        tableId: data.tableId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        numberOfPeople: data.numberOfPeople,
        reservationDate: new Date(data.reservationDate),
        reservationTime: reservationDateTime,
        duration: data.duration || 120,
        specialRequirements: data.specialRequirements,
        preOrderItems: data.preOrderItems || null,
        preOrderNotes: data.preOrderNotes,
        notes: data.notes,
        confirmationCode,
        createdBy: userId,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
          },
        },
      },
    });
  }

  // Get all reservations with filters
  async findAllReservations(
    tenantId: string,
    locationId: string,
    filters?: any,
  ) {
    const where: any = {
      tenantId,
      locationId,
      deletedAt: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.date) {
      where.reservationDate = new Date(filters.date);
    }

    if (filters?.tableId) {
      where.tableId = filters.tableId;
    }

    if (filters?.customerPhone) {
      where.customerPhone = {
        contains: filters.customerPhone,
      };
    }

    return this.prisma.tableReservation.findMany({
      where,
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
            floor: true,
          },
        },
      },
      orderBy: [
        { reservationDate: 'asc' },
        { reservationTime: 'asc' },
      ],
    });
  }

  // Get a single reservation by ID
  async findOneReservation(tenantId: string, id: string) {
    const reservation = await this.prisma.tableReservation.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
            floor: true,
            status: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  // Update a reservation
  async updateReservation(
    tenantId: string,
    id: string,
    data: any,
  ) {
    const reservation = await this.findOneReservation(tenantId, id);

    // If changing table, verify new table
    if (data.tableId && data.tableId !== reservation.tableId) {
      const table = await this.prisma.table.findFirst({
        where: {
          id: data.tableId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!table) {
        throw new NotFoundException('Table not found');
      }
    }

    // Prepare update data
    const updateData: any = {};

    // Copy over fields that can be updated
    const allowedFields = [
      'customerName', 'customerPhone', 'customerEmail',
      'numberOfPeople', 'specialRequirements', 'preOrderItems',
      'preOrderNotes', 'notes', 'duration', 'status',
      'cancellationReason', 'tableId',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Handle date/time updates
    if (data.reservationDate) {
      updateData.reservationDate = new Date(data.reservationDate);
    }

    if (data.reservationTime) {
      const dateStr = data.reservationDate || reservation.reservationDate.toISOString().split('T')[0];
      updateData.reservationTime = new Date(`${dateStr}T${data.reservationTime}`);
    }

    // Handle status changes
    if (data.status) {
      switch (data.status) {
        case 'CONFIRMED':
          updateData.confirmedAt = new Date();
          break;
        case 'SEATED':
          updateData.arrivedAt = new Date();
          // Update table status to OCCUPIED
          await this.updateStatus(
            tenantId,
            reservation.tableId,
            { status: TableStatus.OCCUPIED },
          );
          break;
        case 'CANCELLED':
        case 'NO_SHOW':
          updateData.cancelledAt = new Date();
          break;
      }
    }

    return this.prisma.tableReservation.update({
      where: { id },
      data: updateData,
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
          },
        },
      },
    });
  }

  // Cancel a reservation
  async cancelReservation(
    tenantId: string,
    id: string,
    reason?: string,
  ) {
    return this.updateReservation(tenantId, id, {
      status: 'CANCELLED',
      cancellationReason: reason,
    });
  }

  // Confirm a reservation
  async confirmReservation(tenantId: string, id: string) {
    return this.updateReservation(tenantId, id, {
      status: 'CONFIRMED',
    });
  }

  // Mark customer as arrived and seated
  async markAsSeated(tenantId: string, id: string) {
    return this.updateReservation(tenantId, id, {
      status: 'SEATED',
    });
  }

  // Delete a reservation (soft delete)
  async removeReservation(tenantId: string, id: string) {
    await this.findOneReservation(tenantId, id);

    return this.prisma.tableReservation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // Get reservations for today
  async getTodayReservations(tenantId: string, locationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.tableReservation.findMany({
      where: {
        tenantId,
        locationId,
        reservationDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'SEATED'],
        },
        deletedAt: null,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
          },
        },
      },
      orderBy: {
        reservationTime: 'asc',
      },
    });
  }

  // Get upcoming reservations
  async getUpcomingReservations(tenantId: string, locationId: string, days: number = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.tableReservation.findMany({
      where: {
        tenantId,
        locationId,
        reservationDate: {
          gte: today,
          lte: futureDate,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        deletedAt: null,
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
            tableName: true,
            capacity: true,
            section: true,
          },
        },
      },
      orderBy: [
        { reservationDate: 'asc' },
        { reservationTime: 'asc' },
      ],
    });
  }
}
