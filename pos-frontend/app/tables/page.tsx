'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableModal } from '@/components/table-modal';
import { ReservationModal } from '@/components/reservation-modal';
import { FloorPlanCanvas } from '@/components/floor-plan-canvas';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import toast from 'react-hot-toast';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Clock,
  MapPin,
  Grid3x3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Phone,
  Check,
  X as XIcon,
} from 'lucide-react';

interface Table {
  id: string;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  section?: string;
  floor?: string;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'BILLED' | 'CLEANING' | 'OUT_OF_SERVICE';
  occupiedAt?: string;
  locationId: string;
  location?: {
    id: string;
    name: string;
    code: string;
  };
  kots?: any[];
}

const STATUS_COLORS = {
  FREE: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300',
  OCCUPIED: 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
  RESERVED: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
  BILLED: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-300',
  CLEANING: 'bg-gray-100 dark:bg-gray-700 border-gray-500 text-gray-800 dark:text-gray-300',
  OUT_OF_SERVICE: 'bg-gray-300 dark:bg-gray-800 border-gray-600 text-gray-600 dark:text-gray-400',
};

const STATUS_ICONS = {
  FREE: CheckCircle,
  OCCUPIED: AlertCircle,
  RESERVED: Clock,
  BILLED: CheckCircle,
  CLEANING: Loader2,
  OUT_OF_SERVICE: XCircle,
};

export default function TablesPage() {
  const { user, tenant } = useAuthStore();
  const { isBusinessType } = useBusinessFeatures();
  const [activeTab, setActiveTab] = useState<'tables' | 'reservations' | 'floor-plan'>('tables');
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [stats, setStats] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | undefined>(undefined);
  const [selectedReservation, setSelectedReservation] = useState<any | undefined>(undefined);

  // Check if business type is RESTAURANT
  const isRestaurant = isBusinessType('RESTAURANT');

  // Get user's location (simple fallback for now)
  const locationId = user?.locationId || '';

  useEffect(() => {
    if (locationId) {
      if (activeTab === 'tables' || activeTab === 'floor-plan') {
        loadTables();
        loadStats();
      } else if (activeTab === 'reservations') {
        loadReservations();
      }
    }
  }, [locationId, selectedSection, activeTab]);

  const loadTables = async () => {
    try {
      const response = await api.tables.list({ locationId });
      setTables(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!locationId) return;
    try {
      const response = await api.tables.getStats(locationId);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadReservations = async () => {
    try {
      const response = await api.tables.listReservations({ locationId });
      if (response.data) {
        // Filter out reservations with null tables (deleted tables) or keep them with warning
        const validReservations = response.data.filter((r: any) => {
          if (!r.table) {
            console.warn(`Reservation ${r.id} has a deleted table`, r);
            // Still include it so user can see and potentially fix it
            return true;
          }
          return true;
        });
        setReservations(validReservations || []);
      }
    } catch (error: any) {
      console.error('Failed to load reservations:', error);
      toast.error(error.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    setSelectedTable(undefined);
    setIsModalOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setSelectedTable(table);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTable(undefined);
  };

  const handleModalSuccess = () => {
    loadTables();
    loadStats();
  };

  const handleAddReservation = () => {
    setSelectedReservation(undefined);
    setIsReservationModalOpen(true);
  };

  const handleEditReservation = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsReservationModalOpen(true);
  };

  const handleSavePositions = async (updates: Array<{ id: string; positionX: number; positionY: number; rotation?: number }>) => {
    try {
      await api.tables.bulkUpdatePositions(updates);
      await loadTables(); // Refresh to get updated positions
    } catch (error: any) {
      throw error; // Re-throw to let FloorPlanCanvas handle the error
    }
  };

  const handleReservationModalClose = () => {
    setIsReservationModalOpen(false);
    setSelectedReservation(undefined);
  };

  const handleReservationModalSuccess = () => {
    loadReservations();
  };

  const handleConfirmReservation = async (id: string) => {
    try {
      await api.tables.confirmReservation(id);
      toast.success('Reservation confirmed');
      loadReservations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm reservation');
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
      await api.tables.cancelReservation(id, 'Cancelled by staff');
      toast.success('Reservation cancelled');
      loadReservations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel reservation');
    }
  };

  const handleMarkAsSeated = async (id: string) => {
    try {
      await api.tables.markAsSeated(id);
      toast.success('Customer marked as seated');
      loadReservations();
      loadTables(); // Refresh tables as status will change
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark as seated');
    }
  };

  const filteredTables = selectedSection === 'ALL' 
    ? tables 
    : tables.filter(t => t.section === selectedSection);

  const sections = ['ALL', ...new Set(tables.map(t => t.section).filter(Boolean))];

  const getTimeSince = (date?: string) => {
    if (!date) return '';
    const minutes = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  // Restrict to RESTAURANT business type
  if (!isRestaurant) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 max-w-md">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-center mb-2">Table Management Not Available</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Table management is only available for Restaurant business type. Your current business type is <strong>{tenant?.businessType}</strong>.
                </p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!locationId) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 max-w-md">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-center mb-2">No Location Assigned</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Please create a location first or contact your administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Table Management
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>Current Location</span>
              </div>
            </div>
            {activeTab !== 'floor-plan' && (
              <Button 
                className="w-full sm:w-auto" 
                onClick={activeTab === 'tables' ? handleAddTable : handleAddReservation}
              >
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'tables' ? 'Add Table' : 'New Reservation'}
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'tables'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <UtensilsCrossed className="h-4 w-4 inline mr-2" />
                Tables
              </button>
              <button
                onClick={() => setActiveTab('reservations')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'reservations'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Reservations
              </button>
              <button
                onClick={() => setActiveTab('floor-plan')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'floor-plan'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Grid3x3 className="h-4 w-4 inline mr-2" />
                Floor Plan
              </button>
            </div>
          </div>

          {/* Tables View */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* Stats */}
              {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</span>
                    <Grid3x3 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Free</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.freeTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Occupied</span>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.occupiedTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Reserved</span>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.reservedTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Occupancy</span>
                    <UtensilsCrossed className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.occupancyRate}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setSelectedSection(section || 'ALL')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap text-xs sm:text-sm transition-colors ${
                  selectedSection === section
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {section}
                {section === 'ALL' && ` (${tables.length})`}
                {section !== 'ALL' && ` (${tables.filter(t => t.section === section).length})`}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTables.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UtensilsCrossed className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tables Found</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Create your first table to start managing reservations
                </p>
                <Button onClick={handleAddTable}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredTables.map((table) => {
                const StatusIcon = STATUS_ICONS[table.status];
                return (
                  <Card 
                    key={table.id}
                    className={`border-2 ${STATUS_COLORS[table.status]} hover:shadow-lg transition-shadow relative`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTable(table);
                        }}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Edit table"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>

                      <div className="flex items-center justify-between mb-2 pr-6">
                        <span className="text-lg sm:text-xl font-bold">
                          {table.tableName || `T${table.tableNumber}`}
                        </span>
                        <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{table.capacity} seats</span>
                        </div>

                        {table.section && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {table.section}
                          </div>
                        )}

                        {table.status === 'OCCUPIED' && table.occupiedAt && (
                          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <Clock className="h-3 w-3" />
                            {getTimeSince(table.occupiedAt)}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t dark:border-gray-700">
                        <div className={`text-center text-xs font-semibold py-1 px-2 rounded ${
                          STATUS_COLORS[table.status]
                        }`}>
                          {table.status}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
          )}

          {/* Reservations View */}
          {activeTab === 'reservations' && (
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </CardContent>
                </Card>
              ) : reservations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Reservations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Create your first table reservation
                    </p>
                    <Button onClick={handleAddReservation}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Reservation
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reservations.map((reservation) => {
                    const reservationDate = new Date(reservation.reservationDate);
                    const reservationTime = new Date(reservation.reservationTime);
                    const isUpcoming = reservationDate >= new Date();
                    
                    const statusColors: any = {
                      PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-300',
                      CONFIRMED: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
                      SEATED: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300',
                      CANCELLED: 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
                      NO_SHOW: 'bg-gray-100 dark:bg-gray-700 border-gray-500 text-gray-800 dark:text-gray-300',
                      COMPLETED: 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300',
                    };

                    return (
                      <Card key={reservation.id} className={`border-2 ${statusColors[reservation.status]}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-lg">{reservation.customerName}</h3>
                              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-3 w-3" />
                                {reservation.customerPhone}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[reservation.status]}`}>
                              {reservation.status}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4 text-gray-500" />
                              {reservation.table ? (
                                <span>{reservation.table.tableName || `T${reservation.table.tableNumber}`}</span>
                              ) : (
                                <span className="text-red-500 italic">Table unavailable (deleted)</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span>{reservationDate.toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>{reservationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>{reservation.numberOfPeople} people</span>
                            </div>

                            {reservation.specialRequirements && (
                              <div className="mt-2 pt-2 border-t dark:border-gray-700">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <strong>Special:</strong> {reservation.specialRequirements}
                                </p>
                              </div>
                            )}

                            {reservation.preOrderItems && reservation.preOrderItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t dark:border-gray-700">
                                <p className="text-xs font-semibold mb-1">Pre-Order:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {reservation.preOrderItems.length} items
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {reservation.status === 'PENDING' || reservation.status === 'CONFIRMED' ? (
                            <div className="mt-4 flex gap-2">
                              {reservation.status === 'PENDING' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmReservation(reservation.id)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Confirm
                                </Button>
                              )}
                              {reservation.status === 'CONFIRMED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsSeated(reservation.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Seated
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditReservation(reservation)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelReservation(reservation.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditReservation(reservation)}
                                className="w-full"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Floor Plan View */}
          {activeTab === 'floor-plan' && (
            <div className="h-[calc(100vh-16rem)]">
              <FloorPlanCanvas
                tables={tables}
                onTableEdit={handleEditTable}
                onSavePositions={handleSavePositions}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        {/* Table Modal */}
        <TableModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          table={selectedTable}
          locationId={locationId}
        />

        {/* Reservation Modal */}
        <ReservationModal
          isOpen={isReservationModalOpen}
          onClose={handleReservationModalClose}
          onSuccess={handleReservationModalSuccess}
          reservation={selectedReservation}
          tables={tables}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
