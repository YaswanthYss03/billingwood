'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const UNIT_OPTIONS = [
  { label: 'Kilograms (KG)', value: 'KG' },
  { label: 'Grams (G)', value: 'G' },
  { label: 'Liters (L)', value: 'L' },
  { label: 'Milliliters (ML)', value: 'ML' },
  { label: 'Pieces (PCS)', value: 'PCS' },
  { label: 'Packets', value: 'PACKETS' },
  { label: 'Pouches', value: 'POUCHES' },
];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'KG',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.ingredients.list();
      setIngredients(res.data);
    } catch (error) {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Ingredient name is required');
      return;
    }

    // Check for duplicate name
    const duplicate = ingredients.find(ing => 
      ing.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      ing.id !== editingIngredient?.id
    );

    if (duplicate) {
      toast.error(`Ingredient "${formData.name}" already exists`);
      return;
    }

    try {
      if (editingIngredient) {
        await api.ingredients.update(editingIngredient.id, formData);
        toast.success('Ingredient updated successfully');
      } else {
        await api.ingredients.create(formData);
        toast.success('Ingredient created successfully');
      }
      resetForm();
      loadData();
    } catch (error) {
      toast.error(editingIngredient ? 'Failed to update ingredient' : 'Failed to create ingredient');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingIngredient(null);
    setFormData({
      name: '',
      unit: 'KG',
    });
  };

  const handleEdit = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (ingredient: any) => {
    try {
      await api.ingredients.toggleStatus(ingredient.id);
      toast.success(`Ingredient ${ingredient.isActive ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to toggle ingredient status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    
    try {
      await api.ingredients.delete(id);
      toast.success('Ingredient deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete ingredient');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ingredients</h1>
            <TableSkeleton />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Ingredients</h1>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Name *
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Rice, Chicken, Spices"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Unit *
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                        required
                      >
                        {UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1">
                        {editingIngredient ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Ingredients Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {ingredients.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Ingredients Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Get started by adding your first ingredient</p>
                  <Button onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Ingredient
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Unit</TableHead>
                        <TableHead className="font-semibold">Used In</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ingredient) => {
                        // Extract unique items that use this ingredient
                        const usedInItems = ingredient.recipeIngredients
                          ?.map((ri: any) => ri.recipe?.finishedGood)
                          .filter((item: any) => item && item.isActive)
                          .filter((item: any, index: number, self: any[]) => 
                            self.findIndex((i: any) => i.id === item.id) === index
                          ) || [];

                        return (
                          <TableRow key={ingredient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <TableCell>
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-base">{ingredient.name}</div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                {ingredient.unit}
                              </span>
                            </TableCell>
                            <TableCell>
                              {usedInItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {usedInItems.map((item: any) => (
                                    <span
                                      key={item.id}
                                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                    >
                                      {item.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500 italic">Not used in any recipe</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleToggleStatus(ingredient)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all transform hover:scale-105 cursor-pointer shadow-sm ${
                                  ingredient.isActive
                                    ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                                }`}
                                title={`Click to ${ingredient.isActive ? 'deactivate' : 'activate'}`}
                              >
                                <span className={`h-2 w-2 rounded-full mr-2 ${ingredient.isActive ? 'bg-white' : 'bg-gray-600 dark:bg-gray-300'}`}></span>
                                {ingredient.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleEdit(ingredient)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit ingredient"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(ingredient.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete ingredient"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          {ingredients.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Inventory Management Tips</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Update stock quantities in the Inventory page</li>
                      <li>• Ingredients are used for tracking raw materials</li>
                      <li>• Select appropriate units for accurate tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
