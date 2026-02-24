import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new vendor (Professional Plan)
   */
  async create(tenantId: string, createVendorDto: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data: {
        tenantId,
        name: createVendorDto.name,
        contactPerson: createVendorDto.contactPerson,
        phone: createVendorDto.phone,
        email: createVendorDto.email,
        address: createVendorDto.address,
        city: createVendorDto.city,
        state: createVendorDto.state,
        pincode: createVendorDto.pincode,
        country: createVendorDto.country || 'India',
        gstNumber: createVendorDto.gstNumber,
        panNumber: createVendorDto.panNumber,
        paymentTerms: createVendorDto.paymentTerms || 'NET_30',
        creditLimit: createVendorDto.creditLimit ? new Decimal(createVendorDto.creditLimit) : null,
        bankName: createVendorDto.bankName,
        accountNumber: createVendorDto.accountNumber,
        ifscCode: createVendorDto.ifscCode,
        notes: createVendorDto.notes,
        tags: createVendorDto.tags || [],
      },
    });

    return vendor;
  }

  /**
   * Get all vendors for a tenant
   */
  async findAll(tenantId: string, includeInactive = false) {
    const where: any = { tenantId };
    
    if (!includeInactive) {
      where.isActive = true;
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return vendors;
  }

  /**
   * Get a single vendor by ID
   */
  async findOne(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        purchases: {
          select: {
            id: true,
            purchaseNumber: true,
            status: true,
            totalAmount: true,
            purchaseDate: true,
            receivedDate: true,
          },
          orderBy: {
            purchaseDate: 'desc',
          },
          take: 10, // Last 10 purchases
        },
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  /**
   * Update a vendor
   */
  async update(tenantId: string, id: string, updateVendorDto: UpdateVendorDto) {
    // Check if vendor exists
    await this.findOne(tenantId, id);

    const updateData: any = { ...updateVendorDto };
    
    if (updateVendorDto.creditLimit !== undefined) {
      updateData.creditLimit = updateVendorDto.creditLimit ? new Decimal(updateVendorDto.creditLimit) : null;
    }

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: updateData,
    });

    return vendor;
  }

  /**
   * Soft delete a vendor
   */
  async remove(tenantId: string, id: string) {
    // Check if vendor exists
    await this.findOne(tenantId, id);

    // Check if vendor has any purchases
    const purchaseCount = await this.prisma.purchase.count({
      where: {
        vendorId: id,
        tenantId,
      },
    });

    if (purchaseCount > 0) {
      throw new BadRequestException(
        `Cannot delete vendor with ${purchaseCount} purchase order(s). Please deactivate instead.`
      );
    }

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'Vendor deleted successfully', vendor };
  }

  /**
   * Toggle vendor active status
   */
  async toggleActive(tenantId: string, id: string) {
    const vendor = await this.findOne(tenantId, id);

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        isActive: !vendor.isActive,
      },
    });

    return updated;
  }

  /**
   * Get vendor statistics
   */
  async getVendorStats(tenantId: string, vendorId: string) {
    const vendor = await this.findOne(tenantId, vendorId);

    const stats = await this.prisma.purchase.aggregate({
      where: {
        vendorId,
        tenantId,
        status: 'RECEIVED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const lastPurchase = await this.prisma.purchase.findFirst({
      where: {
        vendorId,
        tenantId,
      },
      orderBy: {
        purchaseDate: 'desc',
      },
      select: {
        purchaseDate: true,
        totalAmount: true,
      },
    });

    return {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
      },
      totalPurchases: stats._count || 0,
      totalAmount: stats._sum.totalAmount || 0,
      lastPurchase: lastPurchase || null,
    };
  }
}
